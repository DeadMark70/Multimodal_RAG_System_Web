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
import { getConversationMessagesPage, addMessage } from '../services/conversationApi';
import { SseProtocolError } from '../services/sse/protocol';
import {
  SseTransportError,
  type StreamConnectionStatus,
} from '../services/sse/streamSse';
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

export type StreamUiConnectionStatus =
  | StreamConnectionStatus
  | { state: 'idle' | 'rate_limited' | 'protocol' | 'auth' };

export const streamStatusCopy = {
  connecting: '正在建立串流連線…',
  reconnecting: '連線暫時中斷，正在有限重試…',
  disconnected: '串流已中斷，請手動重新執行。',
  rate_limited: '請求過於頻繁，請稍後再試。',
  protocol: '伺服器回傳格式不相容，請重新整理後再試。',
} as const;

export function getVisibleStreamStatusCopy(status: StreamUiConnectionStatus): string | null {
  switch (status.state) {
    case 'reconnecting':
    case 'disconnected':
    case 'rate_limited':
    case 'protocol':
      return streamStatusCopy[status.state];
    default:
      return null;
  }
}

export function getStreamFailureState(error: unknown): {
  status: StreamUiConnectionStatus;
  canRetry: boolean;
} | null {
  if (error instanceof SseProtocolError) {
    return { status: { state: 'protocol' }, canRetry: false };
  }
  if (!(error instanceof SseTransportError)) {
    return null;
  }
  if (error.kind === 'auth') {
    return { status: { state: 'auth' }, canRetry: false };
  }
  if (error.kind === 'rate_limited') {
    return { status: { state: 'rate_limited' }, canRetry: true };
  }
  if (error.kind === 'disconnected' || error.kind === 'server') {
    return { status: { state: 'disconnected' }, canRetry: true };
  }
  return null;
}

export function isAbortError(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'name' in error && error.name === 'AbortError';
}

interface RetryableChatRequest {
  request: AskRequest;
  content: string;
  conversationId: string | null;
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
  const [connectionStatus, setConnectionStatus] = useState<StreamUiConnectionStatus>({
    state: 'idle',
  });
  const [canRetryLastRequest, setCanRetryLastRequest] = useState(false);
  const toast = useToast();

  const messagesRef = useRef(messages);
  const protectedEmptyHistoryConversationIdRef = useRef<string | null>(null);
  const lastRetryableRequestRef = useRef<RetryableChatRequest | null>(null);
  const requestInFlightRef = useRef(false);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    lastRetryableRequestRef.current = null;
    setCanRetryLastRequest(false);
    setConnectionStatus({ state: 'idle' });

    if (!conversationId) {
      protectedEmptyHistoryConversationIdRef.current = null;
      setMessages([WELCOME_MESSAGE]);
      return;
    }

    const loadHistory = async () => {
      setIsLoadingHistory(true);
      try {
        const messagePage = await getConversationMessagesPage(conversationId);
        const loadedMessages: ChatMessage[] = messagePage.items.map((msg) => ({
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

  const runChatRequest = useCallback(
    async (retryableRequest: RetryableChatRequest) => {
      if (isSending) {
        return;
      }

      setIsSending(true);
      setCurrentStage(null);
      setConnectionStatus({ state: 'idle' });
      setCanRetryLastRequest(false);
      lastRetryableRequestRef.current = null;

      try {
        const answerPayload = await new Promise<AskResponse>((resolve, reject) => {
          let isSettled = false;

          void askQuestionStream(
            retryableRequest.request,
            (event: ChatStreamEvent) => {
              if (isSettled) {
                return;
              }

              if (event.type === 'phase_update') {
                setCurrentStage(event.data.stage);
                return;
              }

              if (event.type === 'complete') {
                isSettled = true;
                resolve(event.data);
                return;
              }

              isSettled = true;
              reject(new Error(event.data.message));
            },
            undefined,
            setConnectionStatus
          ).catch((error: unknown) => {
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
        lastRetryableRequestRef.current = null;
        setCanRetryLastRequest(false);

        if (retryableRequest.conversationId) {
          try {
            await addMessage(retryableRequest.conversationId, {
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
        const failure = getStreamFailureState(error);
        if (failure) {
          setConnectionStatus(failure.status);
          setCanRetryLastRequest(failure.canRetry);
          lastRetryableRequestRef.current = failure.canRetry ? retryableRequest : null;
          return;
        }

        setConnectionStatus({ state: 'idle' });
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
        requestInFlightRef.current = false;
      }
    },
    [isSending, showPersistenceError, toast]
  );

  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim() || isSending || requestInFlightRef.current) {
        return;
      }
      requestInFlightRef.current = true;

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

      await runChatRequest({ request, content, conversationId: activeConversationId });
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
      runChatRequest,
      selectedDocIds,
      showPersistenceError,
    ]
  );

  const retryLastRequest = useCallback(async () => {
    const retryableRequest = lastRetryableRequestRef.current;
    if (!retryableRequest || isSending || requestInFlightRef.current) {
      return;
    }
    requestInFlightRef.current = true;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: retryableRequest.content,
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, userMessage]);

    if (retryableRequest.conversationId) {
      try {
        await addMessage(retryableRequest.conversationId, {
          role: 'user',
          content: retryableRequest.content,
        });
      } catch (error) {
        console.error('Failed to save retried user message', error);
        showPersistenceError('無法儲存您的訊息至對話歷史');
      }
    }

    await runChatRequest(retryableRequest);
  }, [isSending, runChatRequest, showPersistenceError]);

  const clearMessages = useCallback(() => {
    protectedEmptyHistoryConversationIdRef.current = null;
    lastRetryableRequestRef.current = null;
    setCanRetryLastRequest(false);
    setConnectionStatus({ state: 'idle' });
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
    connectionStatus,
    canRetryLastRequest,
    retryLastRequest,
  };
}

export default useChat;
