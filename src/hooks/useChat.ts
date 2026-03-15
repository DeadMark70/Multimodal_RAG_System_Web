/**
 * useChat Hook
 *
 * 管理一般聊天問答功能：
 * - 支援 conversationId 整合
 * - 自動載入/儲存對話歷史
 * - 使用 SSE 顯示目前問答進度
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { useToast } from '@chakra-ui/react';

import { askQuestionStream } from '../services/ragApi';
import { getConversation, addMessage } from '../services/conversationApi';
import type {
  AskRequest,
  AskResponse,
  ChatMessage,
  ChatPipelineStage,
  ChatStreamEvent,
} from '../types/rag';

interface UseChatOptions {
  enableEvaluation?: boolean;
  enableHyde?: boolean;
  enableMultiQuery?: boolean;
  enableReranking?: boolean;
  enableGraphRag?: boolean;
  graphSearchMode?: 'local' | 'global' | 'hybrid' | 'auto' | 'generic';
  conversationId?: string | null;
  ensureConversation?: () => Promise<string | null>;
}

function isPhaseUpdatePayload(data: ChatStreamEvent['data']): data is { stage?: ChatPipelineStage } {
  return typeof data === 'object' && data !== null && 'stage' in data;
}

function isAskResponsePayload(data: ChatStreamEvent['data']): data is AskResponse {
  return (
    typeof data === 'object' &&
    data !== null &&
    'question' in data &&
    'answer' in data &&
    'sources' in data
  );
}

function isErrorPayload(data: ChatStreamEvent['data']): data is { message?: string } {
  return typeof data === 'object' && data !== null && 'message' in data;
}

const WELCOME_MESSAGE: ChatMessage = {
  id: 'welcome',
  role: 'assistant',
  content: '您好！我是您的研究助理。我可以協助您使用 RAG 技術分析您上傳的論文。',
  sources: [],
};

export function useChat(options: UseChatOptions = {}) {
  const enableEvaluation = options.enableEvaluation ?? false;
  const enableHyde = options.enableHyde ?? false;
  const enableMultiQuery = options.enableMultiQuery ?? false;
  const enableReranking = options.enableReranking ?? true;
  const enableGraphRag = options.enableGraphRag ?? false;
  const graphSearchMode = options.graphSearchMode ?? 'generic';
  const conversationId = options.conversationId ?? null;
  const ensureConversation = options.ensureConversation;

  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME_MESSAGE]);
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [currentStage, setCurrentStage] = useState<ChatPipelineStage | null>(null);
  const toast = useToast();

  const messagesRef = useRef(messages);
  const protectedEmptyHistoryConversationIdRef = useRef<string | null>(null);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    if (!conversationId) {
      protectedEmptyHistoryConversationIdRef.current = null;
      setMessages([WELCOME_MESSAGE]);
      return;
    }

    const loadHistory = async () => {
      setIsLoadingHistory(true);
      try {
        const conversation = await getConversation(conversationId);
        const loadedMessages: ChatMessage[] = conversation.messages.map((msg) => ({
          id: String(msg.id),
          role: msg.role === 'system' ? 'assistant' : msg.role,
          content: msg.content,
          sources: Array.isArray(msg.metadata?.sources)
            ? (msg.metadata.sources as ChatMessage['sources'])
            : undefined,
          metrics:
            msg.metadata &&
            typeof msg.metadata.metrics === 'object' &&
            msg.metadata.metrics !== null
              ? (msg.metadata.metrics as ChatMessage['metrics'])
              : undefined,
          timestamp: new Date(msg.created_at).getTime(),
        }));

        if (loadedMessages.length > 0) {
          setMessages(loadedMessages);
          if (protectedEmptyHistoryConversationIdRef.current === conversationId) {
            protectedEmptyHistoryConversationIdRef.current = null;
          }
          return;
        }

        const hasLocalMessages = messagesRef.current.some((msg) => msg.id !== 'welcome');
        const shouldProtectOptimisticState =
          protectedEmptyHistoryConversationIdRef.current === conversationId && hasLocalMessages;

        if (!shouldProtectOptimisticState) {
          setMessages([WELCOME_MESSAGE]);
        }
      } catch (error) {
        console.error('Failed to load conversation history:', error);
        toast({
          title: '載入對話失敗',
          status: 'error',
          duration: 3000,
        });
        setMessages([WELCOME_MESSAGE]);
      } finally {
        setIsLoadingHistory(false);
      }
    };

    void loadHistory();
  }, [conversationId, toast]);

  const showPersistenceError = useCallback(
    (description: string) => {
      toast({
        title: '儲存訊息失敗',
        description,
        status: 'error',
        duration: 3000,
      });
    },
    [toast]
  );

  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim() || isSending) {
        return;
      }

      const userMessage: ChatMessage = {
        id: `user-${Date.now()}`,
        role: 'user',
        content,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, userMessage]);

      let activeConversationId = conversationId;
      if (!activeConversationId && ensureConversation) {
        try {
          activeConversationId = await ensureConversation();
          if (activeConversationId) {
            protectedEmptyHistoryConversationIdRef.current = activeConversationId;
          } else {
            showPersistenceError('無法儲存您的訊息至對話歷史');
          }
        } catch (error) {
          console.error('Failed to create chat conversation', error);
          showPersistenceError('無法儲存您的訊息至對話歷史');
        }
      }

      if (activeConversationId) {
        try {
          await addMessage(activeConversationId, {
            role: 'user',
            content,
          });
        } catch (error) {
          console.error('Failed to save user message', error);
          showPersistenceError('無法儲存您的訊息至對話歷史');
        }
      }

      setIsSending(true);
      setCurrentStage(null);

      try {
        const request: AskRequest = {
          question: content,
          doc_ids: selectedDocIds.length > 0 ? selectedDocIds : null,
          history: messagesRef.current
            .filter((message) => message.id !== 'welcome')
            .slice(-10)
            .map((message) => ({ role: message.role, content: message.content })),
          enable_hyde: enableHyde,
          enable_multi_query: enableMultiQuery,
          enable_reranking: enableReranking,
          enable_evaluation: enableEvaluation,
          enable_graph_rag: enableGraphRag,
          graph_search_mode: graphSearchMode,
        };

        const answerPayload = await new Promise<AskResponse>((resolve, reject) => {
          let isSettled = false;

          void askQuestionStream(request, (event: ChatStreamEvent) => {
            if (isSettled) {
              return;
            }

            if (event.type === 'phase_update') {
              if (isPhaseUpdatePayload(event.data) && event.data.stage) {
                setCurrentStage(event.data.stage);
              }
              return;
            }

            if (event.type === 'complete') {
              if (isAskResponsePayload(event.data)) {
                isSettled = true;
                resolve(event.data);
                return;
              }

              isSettled = true;
              reject(new Error('未收到完整回應'));
              return;
            }

            if (isErrorPayload(event.data)) {
              isSettled = true;
              reject(new Error(event.data.message ?? '無法取得回應'));
            }
          }).catch((error: unknown) => {
            if (isSettled) {
              return;
            }

            isSettled = true;
            reject(error instanceof Error ? error : new Error('無法取得回應'));
          });
        });

        const assistantMessage: ChatMessage = {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: answerPayload.answer,
          sources: answerPayload.sources,
          metrics: answerPayload.metrics ?? undefined,
          timestamp: Date.now(),
        };
        setMessages((prev) => [...prev, assistantMessage]);

        if (activeConversationId) {
          try {
            await addMessage(activeConversationId, {
              role: 'assistant',
              content: answerPayload.answer,
              metadata: {
                sources: answerPayload.sources,
                metrics: answerPayload.metrics,
              },
            });
          } catch (error) {
            console.error('Failed to save assistant message', error);
            showPersistenceError('無法儲存 AI 回應至對話歷史');
          }
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : '無法取得回應';
        toast({
          title: '請求失敗',
          description: message,
          status: 'error',
          duration: 5000,
        });
      } finally {
        setIsSending(false);
        setCurrentStage(null);
      }
    },
    [
      conversationId,
      enableEvaluation,
      enableGraphRag,
      enableHyde,
      enableMultiQuery,
      enableReranking,
      ensureConversation,
      graphSearchMode,
      isSending,
      selectedDocIds,
      showPersistenceError,
      toast,
    ]
  );

  const clearMessages = useCallback(() => {
    protectedEmptyHistoryConversationIdRef.current = null;
    setMessages([
      {
        id: 'welcome',
        role: 'assistant',
        content: '您好！我是您的研究助理。對話已清除，請開始新的提問。',
        sources: [],
      },
    ]);
  }, []);

  return {
    messages,
    sendMessage,
    clearMessages,
    isLoading: isSending,
    isLoadingHistory,
    selectedDocIds,
    setSelectedDocIds,
    currentStage,
  };
}

export default useChat;
