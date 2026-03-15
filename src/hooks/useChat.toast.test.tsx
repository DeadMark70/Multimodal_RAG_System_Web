import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useChat } from './useChat';
import * as ragApi from '../services/ragApi';
import * as conversationApi from '../services/conversationApi';
import { asMock } from '../test/mock-utils';
import type { ChatStreamEvent } from '../types/rag';
import type { ConversationDetail } from '../types/conversation';

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

describe('useChat Hook Error Handling', () => {
  const mockAskQuestionStream = asMock(ragApi.askQuestionStream);
  const mockGetConversation = asMock(conversationApi.getConversation);
  const mockAddMessage = asMock(conversationApi.addMessage);

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient.clear();
  });

  it('shows error toast when saving user message fails', async () => {
    const conversationId = '123';

    mockGetConversation.mockResolvedValue({
      id: conversationId,
      title: 'Test',
      type: 'chat',
      created_at: '',
      updated_at: '',
      messages: [],
    } as ConversationDetail);
    mockAddMessage.mockRejectedValue(new Error('Save failed'));
    mockAskQuestionStream.mockImplementation(async (_request, onEvent) => {
      onEvent({
        type: 'complete',
        data: { question: 'Hello', answer: 'Hi user', sources: [], metrics: null },
      } as ChatStreamEvent);
    });

    const { result } = renderHook(() => useChat({ conversationId }), { wrapper });

    await waitFor(() => expect(mockGetConversation).toHaveBeenCalledWith(conversationId));

    await act(async () => {
      await result.current.sendMessage('Hello');
    });

    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: '儲存訊息失敗',
        status: 'error',
      })
    );
  });
});
