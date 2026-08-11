import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React, { useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useChat } from './useChat';
import * as ragApi from '../services/ragApi';
import * as conversationApi from '../services/conversationApi';
import { asMock } from '../test/mock-utils';
import type { ChatStreamEvent } from '../types/rag';
import type { Message } from '../types/conversation';
import { SseTransportError } from '../services/sse/streamSse';

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
  const mockGetConversationMessagesPage = asMock(conversationApi.getConversationMessagesPage);
  const mockAddMessage = asMock(conversationApi.addMessage);

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient.clear();
  });

  it('sends message and saves to history when conversationId is provided', async () => {
    const conversationId = '123';
    const userMessage = 'Hello';

    mockGetConversationMessagesPage.mockResolvedValue({ items: [], next_cursor: null });
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

    await waitFor(() => expect(mockGetConversationMessagesPage).toHaveBeenCalledWith(conversationId));

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
    mockGetConversationMessagesPage.mockResolvedValue({ items: [], next_cursor: null });
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

  it('exposes a disconnected state and an explicit retry for the last request', async () => {
    mockAskQuestionStream.mockImplementation((_request, _onEvent, _signal, onStatus) => {
      onStatus?.({ state: 'reconnecting', attempt: 1, maxAttempts: 2 });
      onStatus?.({ state: 'disconnected' });
      return Promise.reject(new SseTransportError('disconnected', '串流連線已中斷'));
    });

    const { result } = renderHook(() => useChat({}), { wrapper });

    await act(async () => {
      await result.current.sendMessage('Retry this exact question');
    });

    expect(result.current.connectionStatus.state).toBe('disconnected');
    expect(result.current.canRetryLastRequest).toBe(true);
    expect(mockToast).not.toHaveBeenCalledWith(
      expect.objectContaining({ title: '請求失敗' })
    );
  });

  it('reuses the exact request and bounds immediate manual retries to one new stream', async () => {
    mockAskQuestionStream.mockRejectedValueOnce(
      new SseTransportError('disconnected', '串流連線已中斷')
    );
    const { result } = renderHook(() => useChat({ enableHyde: true }), { wrapper });
    await act(async () => result.current.sendMessage('Exact request'));

    mockAskQuestionStream.mockImplementation((_request, onEvent) => {
      onEvent({
        type: 'complete',
        data: { question: 'Exact request', answer: 'Retried answer', sources: [], metrics: null },
      } as ChatStreamEvent);
      return Promise.resolve();
    });

    await act(async () => {
      await Promise.all([
        result.current.retryLastRequest(),
        result.current.retryLastRequest(),
      ]);
    });

    expect(mockAskQuestionStream).toHaveBeenCalledTimes(2);
    expect(mockAskQuestionStream.mock.calls[1]?.[0]).toEqual(
      mockAskQuestionStream.mock.calls[0]?.[0]
    );
    expect(result.current.messages.filter((message) => message.content === 'Retried answer')).toHaveLength(1);
  });

  it('does not overlap retries while the repeated user message is still being persisted', async () => {
    mockGetConversationMessagesPage.mockResolvedValue({ items: [], next_cursor: null });
    mockAddMessage.mockResolvedValue({
      id: 'persisted-user', role: 'user', content: 'Persisted retry', created_at: '',
    } as Message);
    mockAskQuestionStream.mockRejectedValueOnce(
      new SseTransportError('disconnected', '串流連線已中斷')
    );
    const { result } = renderHook(() => useChat({ conversationId: 'chat-1' }), { wrapper });
    await waitFor(() => expect(mockGetConversationMessagesPage).toHaveBeenCalled());
    await act(async () => result.current.sendMessage('Persisted retry'));

    const persistenceResolvers: Array<() => void> = [];
    mockAddMessage.mockImplementation((_conversationId, message) => {
      if (message.role === 'assistant') {
        return Promise.resolve({
          id: 'persisted-answer', role: 'assistant', content: message.content, created_at: '',
        } as Message);
      }
      return new Promise((resolve) => {
        persistenceResolvers.push(() => resolve({
          id: 'persisted-retry', role: 'user', content: 'Persisted retry', created_at: '',
        } as Message));
      });
    });
    mockAskQuestionStream.mockImplementation((_request, onEvent) => {
      onEvent({
        type: 'complete',
        data: { question: 'Persisted retry', answer: 'One answer', sources: [], metrics: null },
      } as ChatStreamEvent);
      return Promise.resolve();
    });

    let retries: Promise<void>[] = [];
    act(() => {
      retries = [result.current.retryLastRequest(), result.current.retryLastRequest()];
    });

    expect(mockAddMessage).toHaveBeenCalledTimes(2);
    await act(async () => {
      persistenceResolvers.forEach((resolve) => resolve());
      await Promise.all(retries);
    });
    expect(mockAskQuestionStream).toHaveBeenCalledTimes(2);
  });
});
