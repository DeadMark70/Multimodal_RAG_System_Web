import { renderHook, act, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { useDeepResearch } from './useDeepResearch';
import * as ragApi from '../services/ragApi';
import * as conversationApi from '../services/conversationApi';
import { useSessionStore } from '../stores/useSessionStore';
import { useConversationMutations } from '../hooks/useConversations';
import { asMock } from '../test/mock-utils';
import type { Conversation, ConversationDetail, CreateConversationRequest, Message } from '../types/conversation';
import type { ExecutePlanResponse, ResearchPlanResponse } from '../types/rag';

interface MockSessionStoreState {
  currentChatId: string | null;
  actions: {
    setCurrentChatId: (chatId: string | null) => void;
  };
}

// Mock services and hooks
vi.mock('../services/ragApi');
vi.mock('../services/conversationApi');
vi.mock('../stores/useSessionStore', () => {
  const useSessionStore = vi.fn<() => MockSessionStoreState>();
  return {
    useSessionStore,
    useCurrentChatId: (): string | null => useSessionStore().currentChatId,
    useSessionActions: (): MockSessionStoreState['actions'] => useSessionStore().actions,
  };
});
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
  const mockExecuteResearchPlanStream = asMock(ragApi.executeResearchPlanStream);
  const mockGetConversation = asMock(conversationApi.getConversation);
  const mockAddMessage = asMock(conversationApi.addMessage);
  const mockUpdateConversation = asMock(conversationApi.updateConversation);

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

    mockGetConversation.mockResolvedValue({
      id: 'unused',
      title: 'Unused',
      type: 'research',
      created_at: '',
      updated_at: '',
      messages: [],
    } as ConversationDetail);
    mockAddMessage.mockResolvedValue({
      id: 'msg-1',
      role: 'user',
      content: 'Research topic',
      created_at: '',
    } as Message);
    mockUpdateConversation.mockResolvedValue({
      id: 'unused',
      title: 'Unused',
      type: 'research',
      created_at: '',
      updated_at: '',
      metadata: {},
    } as Conversation);
    mockExecuteResearchPlanStream.mockResolvedValue(undefined);
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
    const [, updatePayload] = mockUpdateConversation.mock.calls[0] ?? [];
    expect(mockUpdateConversation).toHaveBeenCalledWith(newConvId, expect.any(Object));
    expect(updatePayload).toMatchObject({
      metadata: {
        research_engine: 'deep_research',
        engine: 'agentic',
        original_question: question,
        plan: planResponse,
      },
    });
    expect(mockAddMessage).toHaveBeenCalledWith(newConvId, {
      role: 'user',
      content: question,
    });
  });

  it('restores research state from canonical conversation metadata', async () => {
    const loadedPlan: ResearchPlanResponse = {
      status: 'waiting_confirmation',
      original_question: 'Loaded Question',
      sub_tasks: [],
      estimated_complexity: 'medium',
      doc_ids: null,
    };
    const loadedResult: ExecutePlanResponse = {
      question: 'Loaded Question',
      summary: 'Loaded Summary',
      detailed_answer: 'Loaded Detailed Answer',
      sub_tasks: [],
      all_sources: [],
      confidence: 0.8,
      total_iterations: 1,
    };

    mockUseSessionStore.mockReturnValue({
      currentChatId: 'research-123',
      actions: { setCurrentChatId: mockSetCurrentChatId },
    } as ReturnType<typeof useSessionStore>);

    mockGetConversation.mockResolvedValue({
      id: 'research-123',
      title: 'Loaded Question',
      type: 'research',
      created_at: '',
      updated_at: '',
      metadata: {
        original_question: 'Loaded Question',
        plan: loadedPlan,
        result: loadedResult,
      },
      messages: [],
    } as ConversationDetail);

    const { result } = renderHook(() => useDeepResearch());

    await waitFor(() => {
      expect(result.current.plan).toEqual(loadedPlan);
      expect(result.current.result).toEqual(loadedResult);
    });
  });

  it('falls back to legacy flat metadata results', async () => {
    mockUseSessionStore.mockReturnValue({
      currentChatId: 'legacy-123',
      actions: { setCurrentChatId: mockSetCurrentChatId },
    } as ReturnType<typeof useSessionStore>);

    mockGetConversation.mockResolvedValue({
      id: 'legacy-123',
      title: 'Legacy Question',
      type: 'research',
      created_at: '',
      updated_at: '',
      metadata: {
        original_question: 'Legacy Question',
        question: 'Legacy Question',
        summary: 'Legacy Summary',
        detailed_answer: 'Legacy Detailed Answer',
        sub_tasks: [],
        all_sources: [],
        confidence: 0.7,
        total_iterations: 0,
      },
      messages: [],
    } as ConversationDetail);

    const { result } = renderHook(() => useDeepResearch());

    await waitFor(() => {
      expect(result.current.plan).toBeNull();
      expect(result.current.result?.summary).toBe('Legacy Summary');
      expect(result.current.result?.detailed_answer).toBe('Legacy Detailed Answer');
    });
  });

  it('tracks per-task stage updates during streamed execution', async () => {
    const question = 'Research topic';
    const newConvId = 'research-123';
    const planResponse: ResearchPlanResponse = {
      status: 'waiting_confirmation',
      original_question: question,
      sub_tasks: [
        { id: 1, question: 'Find evidence', task_type: 'rag', enabled: true },
      ],
      estimated_complexity: 'simple',
      doc_ids: null,
    };

    mockCreateConversation.mockResolvedValue({
      id: newConvId,
      title: question,
      type: 'research',
      created_at: '',
      updated_at: '',
    });
    mockGenerateResearchPlan.mockResolvedValue(planResponse);
    mockExecuteResearchPlanStream.mockImplementation((_request, onEvent) => {
      onEvent({
        type: 'task_start',
        data: { id: 1, question: 'Find evidence', task_type: 'rag', iteration: 0 },
      });
      onEvent({
        type: 'task_phase_update',
        data: { id: 1, iteration: 0, stage: 'retrieval', label: '正在檢索文件' },
      });
      onEvent({
        type: 'task_done',
        data: { id: 1, answer: 'Done', iteration: 0, contexts: ['ctx-1'] },
      });
      onEvent({
        type: 'complete',
        data: {
          question,
          summary: 'Summary',
          detailed_answer: 'Detailed',
          sub_tasks: [],
          all_sources: [],
          confidence: 0.9,
          total_iterations: 0,
        },
      });
      return Promise.resolve();
    });

    const { result } = renderHook(() => useDeepResearch());

    await act(async () => {
      await result.current.generatePlan(question);
    });

    await waitFor(() => {
      expect(result.current.plan).toEqual(planResponse);
    });

    await act(async () => {
      await result.current.executePlan();
    });

    expect(mockExecuteResearchPlanStream).toHaveBeenCalledWith(
      expect.objectContaining({
        enable_reranking: true,
      }),
      expect.any(Function),
      expect.any(AbortSignal)
    );

    await waitFor(() => {
      expect(result.current.progress).toEqual([
        {
          id: 1,
          question: 'Find evidence',
          taskType: 'rag',
          status: 'done',
          stage: 'retrieval',
          stageLabel: '正在檢索文件',
          details: null,
          answer: 'Done',
          contexts: ['ctx-1'],
          iteration: 0,
        },
      ]);
    });
  });
});
