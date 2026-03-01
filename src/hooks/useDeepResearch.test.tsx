import { renderHook, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { useDeepResearch } from './useDeepResearch';
import * as ragApi from '../services/ragApi';
import { useSessionStore } from '../stores/useSessionStore';
import { useConversationMutations } from '../hooks/useConversations';
import { asMock } from '../test/mock-utils';
import type { Conversation, CreateConversationRequest } from '../types/conversation';
import type { ResearchPlanResponse } from '../types/rag';

// Mock services and hooks
vi.mock('../services/ragApi');
vi.mock('../services/conversationApi');
vi.mock('../stores/useSessionStore');
vi.mock('../hooks/useConversations');
vi.mock('@chakra-ui/react', () => ({
  useToast: () => vi.fn(),
}));

describe('useDeepResearch Hook - Persistence', () => {
  const mockSetCurrentChatId = vi.fn<(chatId: string | null) => void>();
  const mockCreateConversation = vi.fn<
    (request: CreateConversationRequest) => Promise<Conversation>
  >();
  const mockUseSessionStore = asMock(useSessionStore);
  const mockUseConversationMutations = asMock(useConversationMutations);
  const mockGenerateResearchPlan = asMock(ragApi.generateResearchPlan);

  beforeEach(() => {
    vi.clearAllMocks();

    mockUseSessionStore.mockReturnValue({
      currentChatId: null,
      actions: { setCurrentChatId: mockSetCurrentChatId },
    } as ReturnType<typeof useSessionStore>);

    mockUseConversationMutations.mockReturnValue({
      create: mockCreateConversation,
      update: vi.fn(),
      remove: vi.fn(),
      isCreating: false,
      isUpdating: false,
      isDeleting: false,
    });
  });

  it('should create a research conversation when generating a plan', async () => {
    const question = 'Research topic';
    const newConvId = 'research-123';

    // Mock API responses
    const planResponse: ResearchPlanResponse = {
      status: 'waiting_confirmation',
      original_question: question,
      sub_tasks: [],
      estimated_complexity: 'simple',
      doc_ids: null,
    };
    mockGenerateResearchPlan.mockResolvedValue(planResponse);

    mockCreateConversation.mockResolvedValue({
      id: newConvId,
      title: question,
      type: 'research',
      created_at: '',
      updated_at: '',
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

  it('should load existing plan from history if conversationId is set', () => {
    // This test simulates loading a previous session.
    // Since useDeepResearch currently doesn't auto-load, we might need to implement that.
    // For now, let's verify if we can manually trigger a load or if we pass an ID it loads.
    
    // NOTE: The current implementation of useDeepResearch DOES NOT accept a conversationId to load.
    // We need to implement this capability.
  });
});
