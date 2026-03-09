import { renderHook, act, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { useChat } from './useChat';
import * as ragApi from '../services/ragApi';
import * as conversationApi from '../services/conversationApi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { asMock } from '../test/mock-utils';
import type { AskResponse } from '../types/rag';
import type { ConversationDetail, Message } from '../types/conversation';

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
  const mockAskQuestion = asMock(ragApi.askQuestion);
  const mockGetConversation = asMock(conversationApi.getConversation);
  const mockAddMessage = asMock(conversationApi.addMessage);

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient.clear();
  });

  it('should send message and save to history if conversationId is provided', async () => {
    const conversationId = '123';
    const userMessage = 'Hello';
    const aiAnswer = 'Hi user';

    // Mock API responses
    const conversation: ConversationDetail = {
      id: conversationId,
      title: 'Test',
      type: 'chat',
      created_at: '',
      updated_at: '',
      messages: [],
    };
    mockGetConversation.mockResolvedValue(conversation);
    
    const persistedMessage: Message = {
      id: 'persisted-1',
      role: 'assistant',
      content: aiAnswer,
      created_at: '',
    };
    mockAddMessage.mockResolvedValue(persistedMessage);
    
    const answer: AskResponse = {
      question: userMessage,
      answer: aiAnswer,
      sources: [],
      metrics: null,
    };
    mockAskQuestion.mockResolvedValue(answer);

    const { result } = renderHook(() => useChat({ conversationId }), { wrapper });

    // Wait for history load
      await waitFor(() => expect(mockGetConversation).toHaveBeenCalled());

    // Send message
    await act(async () => {
      await result.current.sendMessage(userMessage);
    });

    // Verify user message saved
    expect(mockAddMessage).toHaveBeenCalledWith(conversationId, {
      role: 'user',
      content: userMessage,
    });

    // Verify RAG called
    expect(mockAskQuestion).toHaveBeenCalledWith(expect.objectContaining({
      question: userMessage,
    }));

    // Verify AI message saved (with metadata)
    expect(mockAddMessage).toHaveBeenCalledWith(conversationId, {
      role: 'assistant',
      content: aiAnswer,
      metadata: {
        sources: [],
        metrics: null,
      },
    });
  });

  it('should create a conversation and save first-turn history when ensureConversation is provided', async () => {
    const userMessage = 'Hello';
    const aiAnswer = 'Hi user';
    const ensureConversation = vi.fn<() => Promise<string | null>>().mockResolvedValue('new-chat');

    const persistedMessage: Message = {
      id: 'persisted-2',
      role: 'assistant',
      content: aiAnswer,
      created_at: '',
    };
    mockAddMessage.mockResolvedValue(persistedMessage);

    const answer: AskResponse = {
      question: userMessage,
      answer: aiAnswer,
      sources: [],
      metrics: null,
    };
    mockAskQuestion.mockResolvedValue(answer);

    const { result } = renderHook(() => useChat({ ensureConversation }), { wrapper });

    await act(async () => {
      await result.current.sendMessage(userMessage);
    });

    expect(ensureConversation).toHaveBeenCalledTimes(1);
    expect(mockAddMessage).toHaveBeenCalledWith('new-chat', {
      role: 'user',
      content: userMessage,
    });
    expect(mockAddMessage).toHaveBeenCalledWith('new-chat', {
      role: 'assistant',
      content: aiAnswer,
      metadata: {
        sources: [],
        metrics: null,
      },
    });
  });

  it('should NOT save to history if conversationId is missing and no creator is provided', async () => {
    const userMessage = 'Hello';
    const aiAnswer = 'Hi user';

    const answer: AskResponse = {
      question: userMessage,
      answer: aiAnswer,
      sources: [],
      metrics: null,
    };
    mockAskQuestion.mockResolvedValue(answer);

    const { result } = renderHook(() => useChat({}), { wrapper });

    await act(async () => {
      await result.current.sendMessage(userMessage);
    });

    expect(mockAddMessage).not.toHaveBeenCalled();
    expect(mockAskQuestion).toHaveBeenCalled();
  });
});
