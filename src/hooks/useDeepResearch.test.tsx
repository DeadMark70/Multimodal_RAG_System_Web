import { renderHook, act, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { useDeepResearch } from './useDeepResearch';
import * as ragApi from '../services/ragApi';
import * as conversationApi from '../services/conversationApi';
import { useSessionStore } from '../stores/useSessionStore';
import { useConversationMutations } from '../hooks/useConversations';
import React from 'react';

// Mock services and hooks
vi.mock('../services/ragApi');
vi.mock('../services/conversationApi');
vi.mock('../stores/useSessionStore');
vi.mock('../hooks/useConversations');
vi.mock('@chakra-ui/react', () => ({
  useToast: () => vi.fn(),
}));

describe('useDeepResearch Hook - Persistence', () => {
  const mockSetCurrentChatId = vi.fn();
  const mockCreateConversation = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    (useSessionStore as any).mockReturnValue({
      currentChatId: null,
      actions: { setCurrentChatId: mockSetCurrentChatId },
    });

    (useConversationMutations as any).mockReturnValue({
      create: mockCreateConversation,
    });
  });

  it('should create a research conversation when generating a plan', async () => {
    const question = 'Research topic';
    const newConvId = 'research-123';

    // Mock API responses
    (ragApi.generateResearchPlan as any).mockResolvedValue({
      original_question: question,
      sub_tasks: [],
    });

    (mockCreateConversation as any).mockResolvedValue({
      id: newConvId,
      title: question,
      type: 'research',
    });

    const { result } = renderHook(() => useDeepResearch());

    await act(async () => {
      await result.current.generatePlan(question);
    });

    expect(mockCreateConversation).toHaveBeenCalledWith(expect.objectContaining({
      title: question,
      type: 'research',
    }));
    
    expect(mockSetCurrentChatId).toHaveBeenCalledWith(newConvId);
  });

  it('should load existing plan from history if conversationId is set', async () => {
    // This test simulates loading a previous session.
    // Since useDeepResearch currently doesn't auto-load, we might need to implement that.
    // For now, let's verify if we can manually trigger a load or if we pass an ID it loads.
    
    // NOTE: The current implementation of useDeepResearch DOES NOT accept a conversationId to load.
    // We need to implement this capability.
  });
});
