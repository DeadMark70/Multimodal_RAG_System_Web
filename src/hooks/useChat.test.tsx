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

// Fix: Create a stable mock for useToast to avoid infinite loops in useEffect
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

describe('useChat Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    queryClient.clear();
  });

  it('should send message and save to history if conversationId is provided', async () => {
    const conversationId = '123';
    const userMessage = 'Hello';
    const aiAnswer = 'Hi user';

    // Mock API responses
    (conversationApi.getConversation as any).mockResolvedValue({
      id: conversationId,
      messages: [],
    });
    
    (conversationApi.addMessage as any).mockResolvedValue({});
    
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

    // Verify user message saved
    expect(conversationApi.addMessage).toHaveBeenCalledWith(conversationId, {
      role: 'user',
      content: userMessage,
    });

    // Verify RAG called
    expect(ragApi.askQuestion).toHaveBeenCalledWith(expect.objectContaining({
      question: userMessage,
    }));

    // Verify AI message saved (with metadata)
    expect(conversationApi.addMessage).toHaveBeenCalledWith(conversationId, {
      role: 'assistant',
      content: aiAnswer,
      metadata: {
        sources: [],
        metrics: null,
      },
    });
  });

  it('should NOT save to history if conversationId is missing', async () => {
    const userMessage = 'Hello';
    const aiAnswer = 'Hi user';

    (ragApi.askQuestion as any).mockResolvedValue({
      answer: aiAnswer,
      sources: [],
      metrics: null,
    });

    const { result } = renderHook(() => useChat({}), { wrapper });

    await act(async () => {
      await result.current.sendMessage(userMessage);
    });

    expect(conversationApi.addMessage).not.toHaveBeenCalled();
    expect(ragApi.askQuestion).toHaveBeenCalled();
  });
});
