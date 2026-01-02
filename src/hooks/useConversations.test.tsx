import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useConversationList, useConversationDetail, useConversationMutations } from './useConversations';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import * as conversationApi from '../services/conversationApi';
import type { Conversation, ConversationDetail } from '../types/conversation';
import React from 'react';

// Mock the API service
vi.mock('../services/conversationApi');

// Mock useToast from Chakra UI
vi.mock('@chakra-ui/react', () => ({
  useToast: () => vi.fn(),
}));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

const wrapper = ({ children }: { children: React.ReactNode }) => (
  React.createElement(QueryClientProvider, { client: queryClient }, children)
);

describe('useConversations Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    queryClient.clear();
  });

  describe('useConversationList', () => {
    it('should fetch conversation list', async () => {
      const mockList: Conversation[] = [
        { id: '1', title: 'Test', type: 'chat', created_at: '', updated_at: '' }
      ];
      (conversationApi.listConversations as any).mockResolvedValue(mockList);

      const { result } = renderHook(() => useConversationList(), { wrapper });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toEqual(mockList);
    });
  });

  describe('useConversationDetail', () => {
    it('should fetch conversation detail', async () => {
      const mockDetail: ConversationDetail = {
        id: '1', title: 'Test', type: 'chat', created_at: '', updated_at: '',
        messages: []
      };
      (conversationApi.getConversation as any).mockResolvedValue(mockDetail);

      const { result } = renderHook(() => useConversationDetail('1'), { wrapper });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toEqual(mockDetail);
    });

    it('should not fetch if id is null', () => {
      const { result } = renderHook(() => useConversationDetail(null), { wrapper });
      expect(result.current.isFetching).toBe(false);
    });
  });

  describe('useConversationMutations', () => {
    it('should create conversation', async () => {
      const newConv: Conversation = { id: '2', title: 'New', type: 'chat', created_at: '', updated_at: '' };
      (conversationApi.createConversation as any).mockResolvedValue(newConv);

      const { result } = renderHook(() => useConversationMutations(), { wrapper });

      await result.current.create({ title: 'New' });

      expect(conversationApi.createConversation).toHaveBeenCalledWith({ title: 'New' });
    });
  });
});
