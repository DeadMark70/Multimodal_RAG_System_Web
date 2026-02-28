/**
 * useChat Hook
 * 
 * 管理 RAG 對話功能
 * - 支援 conversationId 整合
 * - 自動載入/儲存對話歷史
 */

import { useState, useCallback, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { askQuestion } from '../services/ragApi';
import { getConversation, addMessage } from '../services/conversationApi';
import type { ChatMessage, AskRequest } from '../types/rag';
import { useToast } from '@chakra-ui/react';

interface UseChatOptions {
  enableEvaluation?: boolean;
  enableHyde?: boolean;
  enableMultiQuery?: boolean;
  enableReranking?: boolean;
  enableGraphRag?: boolean;
  graphSearchMode?: 'local' | 'global' | 'hybrid' | 'auto';
  conversationId?: string | null;
}

const WELCOME_MESSAGE: ChatMessage = {
  id: 'welcome',
  role: 'assistant',
  content: '您好！我是您的研究助理。我可以協助您使用 RAG 技術分析您上傳的論文。開啟**評估模式**可查看幻覺指標。',
  sources: [],
};

export function useChat(options: UseChatOptions = {}) {
  const enableEvaluation = options.enableEvaluation ?? false;
  const enableHyde = options.enableHyde ?? false;
  const enableMultiQuery = options.enableMultiQuery ?? false;
  const enableReranking = options.enableReranking ?? true;
  const enableGraphRag = options.enableGraphRag ?? false;
  const graphSearchMode = options.graphSearchMode ?? 'auto';
  const conversationId = options.conversationId ?? null;

  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME_MESSAGE]);
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const toast = useToast();

  // 載入對話歷史
  useEffect(() => {
    if (!conversationId) {
      // 沒有 conversationId，重置為歡迎訊息
      setMessages([WELCOME_MESSAGE]);
      return;
    }

    const loadHistory = async () => {
      setIsLoadingHistory(true);
      try {
        const conversation = await getConversation(conversationId);

        // 轉換後端訊息格式為前端格式
        const loadedMessages: ChatMessage[] = conversation.messages.map(msg => ({
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
        } else {
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

  const mutation = useMutation({
    mutationFn: async (request: AskRequest) => {
      return await askQuestion(request);
    },
    onError: (error: Error) => {
      toast({
        title: '請求失敗',
        description: error.message || '無法取得回應',
        status: 'error',
        duration: 5000,
      });
    },
  });

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim()) return;

    // 加入使用者訊息 (Optimistic UI)
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content,
      timestamp: Date.now(),
    };
    setMessages(prev => [...prev, userMessage]);

    // 持久化使用者訊息
    if (conversationId) {
      try {
        await addMessage(conversationId, {
          role: 'user',
          content: content,
        });
      } catch (error) {
        console.error('Failed to save user message', error);
        toast({
          title: '儲存訊息失敗',
          description: '無法儲存您的訊息至對話歷史',
          status: 'error',
          duration: 3000,
        });
      }
    }

    try {
      // 準備請求
      const request: AskRequest = {
        question: content,
        doc_ids: selectedDocIds.length > 0 ? selectedDocIds : null,
        history: messages
          .filter(m => m.id !== 'welcome')
          .slice(-10) // 最近 10 則對話
          .map(m => ({ role: m.role, content: m.content })),
        enable_hyde: enableHyde,
        enable_multi_query: enableMultiQuery,
        enable_reranking: enableReranking,
        enable_evaluation: enableEvaluation,
        enable_graph_rag: enableGraphRag,
        graph_search_mode: graphSearchMode,
      };

      const response = await mutation.mutateAsync(request);

      // 加入助理回應
      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: response.answer,
        sources: response.sources,
        metrics: response.metrics ?? undefined,
        timestamp: Date.now(),
      };
      setMessages(prev => [...prev, assistantMessage]);

      // 持久化助理回應
      if (conversationId) {
        try {
          await addMessage(conversationId, {
            role: 'assistant',
            content: response.answer,
            metadata: {
              sources: response.sources,
              metrics: response.metrics,
            },
          });
        } catch (error) {
          console.error('Failed to save assistant message', error);
          toast({
            title: '儲存訊息失敗',
            description: '無法儲存 AI 回應至對話歷史',
            status: 'error',
            duration: 3000,
          });
        }
      }

    } catch {
      // 錯誤已在 mutation.onError 處理
    }
  }, [
    conversationId,
    enableEvaluation,
    enableGraphRag,
    enableHyde,
    enableMultiQuery,
    enableReranking,
    graphSearchMode,
    messages,
    mutation,
    selectedDocIds,
    toast,
  ]);

  const clearMessages = useCallback(() => {
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
    isLoading: mutation.isPending,
    isLoadingHistory,
    selectedDocIds,
    setSelectedDocIds,
  };
}

export default useChat;
