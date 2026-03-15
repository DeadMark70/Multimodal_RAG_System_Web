import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React, { useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useChat } from './useChat';
import * as ragApi from '../services/ragApi';
import * as conversationApi from '../services/conversationApi';
import { asMock } from '../test/mock-utils';
import type { ChatStreamEvent } from '../types/rag';
import type { ConversationDetail, Message } from '../types/conversation';

vi.mock('../services/ragApi');
vi.mock('../services/conversationApi');

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
  const mockAskQuestionStream = asMock(ragApi.askQuestionStream);
  const mockGetConversation = asMock(conversationApi.getConversation);
  const mockAddMessage = asMock(conversationApi.addMessage);

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient.clear();
  });

  it('sends message and saves to history when conversationId is provided', async () => {
    const conversationId = '123';
    const userMessage = 'Hello';

    const conversation: ConversationDetail = {
      id: conversationId,
      title: 'Test',
      type: 'chat',
      created_at: '',
      updated_at: '',
      messages: [],
    };
    mockGetConversation.mockResolvedValue(conversation);
    mockAddMessage.mockResolvedValue({
      id: 'persisted-1',
      role: 'assistant',
      content: 'Hi user',
      created_at: '',
    } as Message);
    mockAskQuestionStream.mockImplementation((_request, onEvent) => {
      onEvent({ type: 'phase_update', data: { stage: 'retrieval' } } as ChatStreamEvent);
      onEvent({
        type: 'complete',
        data: { question: userMessage, answer: 'Hi user', sources: [], metrics: null },
      } as ChatStreamEvent);
      return Promise.resolve();
    });

    const { result } = renderHook(() => useChat({ conversationId }), { wrapper });

    await waitFor(() => expect(mockGetConversation).toHaveBeenCalledWith(conversationId));

    await act(async () => {
      await result.current.sendMessage(userMessage);
    });

    expect(mockAddMessage).toHaveBeenCalledWith(conversationId, {
      role: 'user',
      content: userMessage,
    });
    expect(mockAddMessage).toHaveBeenCalledWith(conversationId, {
      role: 'assistant',
      content: 'Hi user',
      metadata: {
        sources: [],
        metrics: null,
      },
    });
    expect(result.current.currentStage).toBeNull();
  });

  it('creates a conversation and keeps first-turn messages visible during empty history hydration', async () => {
    const userMessage = 'First question';
    mockGetConversation.mockResolvedValue({
      id: 'new-chat',
      title: 'New Chat',
      type: 'chat',
      created_at: '',
      updated_at: '',
      messages: [],
    } as ConversationDetail);
    mockAddMessage.mockResolvedValue({
      id: 'persisted-2',
      role: 'assistant',
      content: 'Answer',
      created_at: '',
    } as Message);
    mockAskQuestionStream.mockImplementation((_request, onEvent) => {
      onEvent({ type: 'phase_update', data: { stage: 'retrieval' } } as ChatStreamEvent);
      onEvent({
        type: 'complete',
        data: { question: userMessage, answer: 'Answer', sources: [], metrics: null },
      } as ChatStreamEvent);
      return Promise.resolve();
    });

    const { result } = renderHook(
      () => {
        const [conversationId, setConversationId] = useState<string | null>(null);
        return useChat({
          conversationId,
          ensureConversation: () => {
            setConversationId('new-chat');
            return Promise.resolve('new-chat');
          },
        });
      },
      { wrapper }
    );

    await act(async () => {
      await result.current.sendMessage(userMessage);
    });

    await waitFor(() => {
      expect(result.current.messages.some((message) => message.content === userMessage)).toBe(true);
      expect(result.current.messages.some((message) => message.content === 'Answer')).toBe(true);
    });
  });

  it('does not save to history if conversationId is missing and no creator is provided', async () => {
    mockAskQuestionStream.mockImplementation((_request, onEvent) => {
      onEvent({
        type: 'complete',
        data: { question: 'Hello', answer: 'Hi user', sources: [], metrics: null },
      } as ChatStreamEvent);
      return Promise.resolve();
    });

    const { result } = renderHook(() => useChat({}), { wrapper });

    await act(async () => {
      await result.current.sendMessage('Hello');
    });

    expect(mockAddMessage).not.toHaveBeenCalled();
    expect(mockAskQuestionStream).toHaveBeenCalled();
  });
});
