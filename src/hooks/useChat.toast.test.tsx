import { renderHook, act, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { useChat } from './useChat';
import * as ragApi from '../services/ragApi';
import * as conversationApi from '../services/conversationApi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

// Mock services
vi.mock('../services/ragApi');
vi.mock('../services/conversationApi');

// Mock toast
const mockToast = vi.fn();
vi.mock('@chakra-ui/react', () => ({
  useToast: () => mockToast,
}));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
  },
});

const wrapper = ({ children }: { children: React.ReactNode }) => (
  React.createElement(QueryClientProvider, { client: queryClient }, children)
);

describe('useChat Hook Error Handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    queryClient.clear();
  });

  it('should show error toast when saving user message fails', async () => {
    const conversationId = '123';
    const userMessage = 'Hello';
    const aiAnswer = 'Hi user';

    // Mock successful history load
    (conversationApi.getConversation as any).mockResolvedValue({
      id: conversationId,
      messages: [],
    });
    
    // Mock FAILED save message
    (conversationApi.addMessage as any).mockRejectedValue(new Error('Save failed'));
    
    // Mock successful RAG response
    (ragApi.askQuestion as any).mockResolvedValue({
      answer: aiAnswer,
      sources: [],
      metrics: null,
    });

    const { result } = renderHook(() => useChat({ conversationId }), { wrapper });

    // Wait for history load
    await waitFor(() => expect(conversationApi.getConversation).toHaveBeenCalled());

    // Send message
    await act(async () => {
      await result.current.sendMessage(userMessage);
    });

    // Verify toast was called for the save failure
    expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({
      title: '儲存訊息失敗',
      status: 'error',
    }));
  });
});
