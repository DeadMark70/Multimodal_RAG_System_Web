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
import { getConversation } from '../services/conversationApi';
import type { ChatMessage, AskRequest } from '../types/rag';
import { useToast } from '@chakra-ui/react';

interface UseChatOptions {
  enableEvaluation?: boolean;
  enableHyde?: boolean;
  enableMultiQuery?: boolean;
  enableReranking?: boolean;
  conversationId?: string | null;
}

const WELCOME_MESSAGE: ChatMessage = {
  id: 'welcome',
  role: 'assistant',
  content: '您好！我是您的研究助理。我可以協助您使用 RAG 技術分析您上傳的論文。開啟**評估模式**可查看幻覺指標。',
  sources: [],
};

export function useChat(options: UseChatOptions = {}) {
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME_MESSAGE]);
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const toast = useToast();

  // 載入對話歷史
  useEffect(() => {
    if (!options.conversationId) {
      // 沒有 conversationId，重置為歡迎訊息
      setMessages([WELCOME_MESSAGE]);
      return;
    }

    const loadHistory = async () => {
      setIsLoadingHistory(true);
      try {
        const conversation = await getConversation(options.conversationId!);
        
        // 轉換後端訊息格式為前端格式
        const loadedMessages: ChatMessage[] = conversation.messages.map(msg => ({
          id: msg.id,
          role: msg.role,
          content: msg.role === 'user' ? (msg.question ?? '') : (msg.answer ?? ''),
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

    loadHistory();
  }, [options.conversationId, toast]);

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

    // 加入使用者訊息
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content,
      timestamp: Date.now(),
    };
    setMessages(prev => [...prev, userMessage]);

    try {
      // 準備請求
      const request: AskRequest = {
        question: content,
        doc_ids: selectedDocIds.length > 0 ? selectedDocIds : null,
        history: messages
          .filter(m => m.id !== 'welcome')
          .slice(-10) // 最近 10 則對話
          .map(m => ({ role: m.role, content: m.content })),
        enable_hyde: options.enableHyde,
        enable_multi_query: options.enableMultiQuery,
        enable_reranking: options.enableReranking,
        enable_evaluation: options.enableEvaluation,
        // 🆕 傳送 conversation_id 給後端自動儲存
        // conversation_id: options.conversationId,
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
    } catch {
      // 錯誤已在 mutation.onError 處理
    }
  }, [messages, selectedDocIds, options, mutation]);

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
