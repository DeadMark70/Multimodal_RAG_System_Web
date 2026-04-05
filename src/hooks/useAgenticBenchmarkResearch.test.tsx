import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useAgenticBenchmarkResearch } from './useAgenticBenchmarkResearch';
import * as ragApi from '../services/ragApi';
import * as conversationApi from '../services/conversationApi';
import { useSessionStore } from '../stores/useSessionStore';
import { useSettingsStore } from '../stores/useSettingsStore';
import { asMock } from '../test/mock-utils';

vi.mock('../services/ragApi');
vi.mock('../services/conversationApi');
vi.mock('../stores/useSessionStore');
vi.mock('../stores/useSettingsStore');
vi.mock('@chakra-ui/react', () => ({
  useToast: () => vi.fn(),
}));

describe('useAgenticBenchmarkResearch', () => {
  const mockSetCurrentChatId = vi.fn<(chatId: string | null) => void>();
  const mockUseSessionStore = asMock(useSessionStore);
  const mockUseSettingsStore = asMock(useSettingsStore);
  const mockExecuteAgenticBenchmarkStream = asMock(ragApi.executeAgenticBenchmarkStream);
  const mockCreateConversation = asMock(conversationApi.createConversation);
  const mockAddMessage = asMock(conversationApi.addMessage);
  const mockGetConversation = asMock(conversationApi.getConversation);

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseSessionStore.mockReturnValue({
      currentChatId: null,
      actions: { setCurrentChatId: mockSetCurrentChatId },
    } as ReturnType<typeof useSessionStore>);
    mockUseSettingsStore.mockReturnValue({
      ragSettings: {
        enable_hyde: false,
        enable_multi_query: true,
        enable_reranking: true,
        enable_evaluation: false,
        enable_graph_rag: true,
        graph_search_mode: 'generic',
        enable_graph_planning: false,
        enable_deep_image_analysis: true,
        max_subtasks: 5,
      },
      selectedChatModeId: 'agentic_benchmark',
    } as ReturnType<typeof useSettingsStore>);
    mockCreateConversation.mockResolvedValue({
      id: 'bench-1',
      title: 'q',
      type: 'research',
      created_at: '',
      updated_at: '',
      metadata: {},
    });
    mockAddMessage.mockResolvedValue({
      id: 'msg-1',
      role: 'user',
      content: 'q',
      created_at: '',
    });
    mockGetConversation.mockResolvedValue({
      id: 'bench-1',
      title: 'q',
      type: 'research',
      created_at: '',
      updated_at: '',
      metadata: {},
      messages: [],
    });
  });

  it('maps streamed benchmark SSE events into UI state', async () => {
    mockExecuteAgenticBenchmarkStream.mockImplementation((_request, onEvent) => {
      onEvent({
        type: 'plan_ready',
        data: {
          original_question: 'q',
          estimated_complexity: 'simple',
          task_count: 1,
          enabled_count: 1,
          question_intent: 'enumeration_definition',
          strategy_tier: 'tier_1_detail_lookup',
          max_iterations: 0,
          sub_tasks: [{ id: 1, question: 'task', task_type: 'rag', enabled: true }],
        },
      });
      onEvent({
        type: 'task_start',
        data: { id: 1, question: 'task', task_type: 'rag', iteration: 0 },
      });
      onEvent({
        type: 'task_phase_update',
        data: { id: 1, iteration: 0, stage: 'retrieval', label: '正在檢索文件' },
      });
      onEvent({
        type: 'task_done',
        data: { id: 1, question: 'task', answer: 'done', iteration: 0, contexts: [] },
      });
      onEvent({
        type: 'evaluation_update',
        data: { iteration: 0, stage: 'quality_gate', gate_pass: true },
      });
      onEvent({
        type: 'trace_step',
        data: {
          step_id: 'execution-1',
          phase: 'execution',
          step_type: 'sub_task_execution',
          title: 'Step 1',
          status: 'completed',
          tool_calls: [],
          token_usage: {},
          metadata: {},
        },
      });
      onEvent({
        type: 'complete',
        data: {
          result: {
            question: 'q',
            summary: 'summary',
            detailed_answer: 'detail',
            sub_tasks: [],
            all_sources: [],
            confidence: 0.9,
            total_iterations: 0,
          },
          agent_trace: { steps: [] },
        },
      });
      return Promise.resolve();
    });

    const { result } = renderHook(() => useAgenticBenchmarkResearch([]));

    await act(async () => {
      await result.current.runBenchmark('q');
    });

    await waitFor(() => {
      expect(result.current.plan?.task_count).toBe(1);
      expect(result.current.progress[0]?.status).toBe('done');
      expect(result.current.evaluationUpdates).toHaveLength(1);
      expect(result.current.traceSteps).toHaveLength(1);
      expect(result.current.result?.summary).toBe('summary');
      expect(result.current.currentPhase).toBe('complete');
    });
  });

  it('restores benchmark result from conversation metadata', async () => {
    mockUseSessionStore.mockReturnValue({
      currentChatId: 'bench-restore',
      actions: { setCurrentChatId: mockSetCurrentChatId },
    } as ReturnType<typeof useSessionStore>);
    mockGetConversation.mockResolvedValue({
      id: 'bench-restore',
      title: 'q',
      type: 'research',
      created_at: '',
      updated_at: '',
      metadata: {
        research_engine: 'agentic_benchmark',
        result: {
          question: 'q',
          summary: 'restored summary',
          detailed_answer: 'restored detail',
          sub_tasks: [],
          all_sources: [],
          confidence: 0.8,
          total_iterations: 1,
        },
        agent_trace: {
          steps: [
            {
              step_id: 'planning-1',
              phase: 'planning',
              step_type: 'plan_generation',
              title: 'Plan',
              status: 'completed',
              tool_calls: [],
              token_usage: {},
              metadata: {},
            },
          ],
        },
      },
      messages: [],
    });

    const { result } = renderHook(() => useAgenticBenchmarkResearch([]));

    await waitFor(() => {
      expect(result.current.result?.summary).toBe('restored summary');
      expect(result.current.traceSteps).toHaveLength(1);
      expect(result.current.currentPhase).toBe('complete');
    });
  });

  it('reconstructs plan and timeline from stored result when progress metadata is absent', async () => {
    mockUseSessionStore.mockReturnValue({
      currentChatId: 'bench-rebuild',
      actions: { setCurrentChatId: mockSetCurrentChatId },
    } as ReturnType<typeof useSessionStore>);
    mockGetConversation.mockResolvedValue({
      id: 'bench-rebuild',
      title: 'q',
      type: 'research',
      created_at: '',
      updated_at: '',
      metadata: {
        research_engine: 'agentic_benchmark',
        original_question: 'q',
        result: {
          question: 'q',
          summary: 'restored summary',
          detailed_answer: 'restored detail',
          sub_tasks: [
            {
              id: 1,
              question: 'task-1',
              answer: 'answer-1',
              sources: ['doc-1'],
              contexts: ['ctx-1'],
              is_drilldown: false,
              iteration: 0,
            },
          ],
          all_sources: ['doc-1'],
          confidence: 0.8,
          total_iterations: 1,
        },
        agent_trace: {
          coverage_gaps: [],
          steps: [],
        },
      },
      messages: [],
    });

    const { result } = renderHook(() => useAgenticBenchmarkResearch([]));

    await waitFor(() => {
      expect(result.current.plan?.task_count).toBe(1);
      expect(result.current.progress).toHaveLength(1);
      expect(result.current.evaluationUpdates).toHaveLength(1);
    });
  });
});
