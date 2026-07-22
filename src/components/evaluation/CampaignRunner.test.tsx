import { ChakraProvider } from '@chakra-ui/react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  cancelCampaign as cancelCampaignFn,
  createCampaign as createCampaignFn,
  getCampaignResults as getCampaignResultsFn,
  listCampaigns as listCampaignsFn,
  listModelConfigs as listModelConfigsFn,
  listTestCases as listTestCasesFn,
  preflightCampaign as preflightCampaignFn,
  streamCampaign as streamCampaignFn,
} from '../../services/evaluationApi';
import type { CampaignConfigInput, CampaignStatus } from '../../types/evaluation';
import theme from '../../theme';
import CampaignRunner from './CampaignRunner';

const {
  mockListTestCases,
  mockListModelConfigs,
  mockListCampaigns,
  mockCreateCampaign,
  mockStreamCampaign,
  mockGetCampaignResults,
  mockCancelCampaign,
  mockPreflightCampaign,
} = vi.hoisted(() => ({
  mockListTestCases: vi.fn<typeof listTestCasesFn>(),
  mockListModelConfigs: vi.fn<typeof listModelConfigsFn>(),
  mockListCampaigns: vi.fn<typeof listCampaignsFn>(),
  mockCreateCampaign: vi.fn<typeof createCampaignFn>(),
  mockStreamCampaign: vi.fn<typeof streamCampaignFn>(),
  mockGetCampaignResults: vi.fn<typeof getCampaignResultsFn>(),
  mockCancelCampaign: vi.fn<typeof cancelCampaignFn>(),
  mockPreflightCampaign: vi.fn<typeof preflightCampaignFn>(),
}));

vi.mock('../../services/evaluationApi', () => ({
  listTestCases: mockListTestCases,
  listModelConfigs: mockListModelConfigs,
  listCampaigns: mockListCampaigns,
  createCampaign: mockCreateCampaign,
  streamCampaign: mockStreamCampaign,
  getCampaignResults: mockGetCampaignResults,
  cancelCampaign: mockCancelCampaign,
  preflightCampaign: mockPreflightCampaign,
}));

const baseTestCases = [
  {
    id: 'Q1',
    question: 'Question 1',
    ground_truth: 'Answer 1',
    ground_truth_short: 'Short answer 1',
    key_points: ['point-1'],
    ragas_focus: ['answer_correctness'],
    category: '基礎',
    difficulty: 'easy',
    source_docs: [],
    requires_multi_doc_reasoning: false,
  },
];

const baseConfig = {
  id: 'cfg-1',
  name: 'Balanced',
  model_name: 'gemini-2.5-flash',
  temperature: 0.7,
  top_p: 0.95,
  top_k: 40,
  max_input_tokens: 8192,
  max_output_tokens: 2048,
  thinking_mode: false,
  thinking_budget: 8192,
};

const baseCampaignConfig: CampaignConfigInput = {
  test_case_ids: ['Q1'],
  modes: ['naive'],
  model_config: baseConfig,
  model_config_id: 'cfg-1',
  repeat_count: 1,
  batch_size: 1,
  rpm_limit: 60,
  ragas_batch_size: 8,
  ragas_parallel_batches: 8,
  ragas_rpm_limit: 1000,
};

function createCampaignStatus(overrides: Partial<CampaignStatus> = {}): CampaignStatus {
  return {
    id: 'cmp-1',
    name: 'Smoke campaign',
    status: 'pending',
    phase: 'execution',
    config: baseCampaignConfig,
    completed_units: 0,
    total_units: 1,
    evaluation_completed_units: 0,
    evaluation_total_units: 0,
    cancel_requested: false,
    created_at: '2026-03-07T00:00:00+00:00',
    updated_at: '2026-03-07T00:00:00+00:00',
    ...overrides,
  };
}

function renderRunner() {
  render(
    <ChakraProvider theme={theme}>
      <CampaignRunner />
    </ChakraProvider>
  );
}

describe('CampaignRunner', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('creates a campaign and renders streamed progress', async () => {
    mockListTestCases.mockResolvedValue(baseTestCases);
    mockListModelConfigs.mockResolvedValue([baseConfig]);
    mockListCampaigns
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([createCampaignStatus()])
      .mockResolvedValue([
        createCampaignStatus({
          status: 'completed',
          phase: 'evaluation',
          completed_units: 1,
          total_units: 1,
          evaluation_completed_units: 1,
          evaluation_total_units: 1,
          current_question_id: 'Q1',
          current_mode: 'naive',
          completed_at: '2026-03-07T00:00:10+00:00',
          updated_at: '2026-03-07T00:00:10+00:00',
        }),
      ]);
    mockCreateCampaign.mockResolvedValue({ campaign_id: 'cmp-1', status: 'pending' });
    mockStreamCampaign.mockImplementation((_campaignId, onEvent) => {
      onEvent({
        type: 'campaign_snapshot',
        data: createCampaignStatus({
          status: 'running',
          current_question_id: 'Q1',
          current_mode: 'naive',
        }),
      });
      onEvent({
        type: 'campaign_completed',
        data: createCampaignStatus({
          status: 'completed',
          phase: 'evaluation',
          completed_units: 1,
          total_units: 1,
          evaluation_completed_units: 1,
          evaluation_total_units: 1,
          current_question_id: 'Q1',
          current_mode: 'naive',
          completed_at: '2026-03-07T00:00:10+00:00',
          updated_at: '2026-03-07T00:00:10+00:00',
        }),
      });
      return Promise.resolve();
    });
    mockGetCampaignResults.mockResolvedValue({
      campaign: createCampaignStatus({
        status: 'completed',
        phase: 'evaluation',
        completed_units: 1,
        total_units: 1,
        evaluation_completed_units: 1,
        evaluation_total_units: 1,
        completed_at: '2026-03-07T00:00:10+00:00',
        updated_at: '2026-03-07T00:00:10+00:00',
      }),
      results: [
        {
          id: 'result-1',
          campaign_id: 'cmp-1',
          question_id: 'Q1',
          question: 'Question 1',
          ground_truth: 'Answer 1',
          ground_truth_short: 'Short answer 1',
          key_points: ['point-1'],
          ragas_focus: ['answer_correctness'],
          mode: 'agentic',
          execution_profile: 'agentic_eval_v1',
          run_number: 1,
          answer: 'agentic answer',
          contexts: ['ctx-1'],
          source_doc_ids: ['doc-1'],
          expected_sources: [],
          latency_ms: 10,
          token_usage: { total_tokens: 42 },
          status: 'completed',
          has_trace: true,
          created_at: '2026-03-07T00:00:10+00:00',
        },
      ],
    });
    mockCancelCampaign.mockResolvedValue(
      createCampaignStatus({
        status: 'cancelled',
        phase: 'evaluation',
        completed_units: 1,
        total_units: 1,
        evaluation_completed_units: 1,
        evaluation_total_units: 1,
        cancel_requested: true,
        updated_at: '2026-03-07T00:00:10+00:00',
      })
    );

    renderRunner();

    await waitFor(() => {
      expect(screen.getByText('已選擇 1 題')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: '開始評估' }));

    await waitFor(() => {
      expect(mockCreateCampaign).toHaveBeenCalledTimes(1);
    });
    expect(mockCreateCampaign).toHaveBeenCalledWith(
      expect.objectContaining({
        ragas_batch_size: 8,
        ragas_parallel_batches: 8,
        ragas_rpm_limit: 1000,
      })
    );
    await waitFor(() => {
      expect(screen.getAllByText('1 / 1').length).toBeGreaterThan(0);
    });
    expect(screen.getAllByText('已完成').length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole('button', { name: '查看結果' }));
    await waitFor(() => {
      expect(mockGetCampaignResults).toHaveBeenCalledWith('cmp-1');
    });
    expect(screen.getByText('agentic_eval_v1')).toBeInTheDocument();
  }, 15000);

  it('falls back to polling when SSE reconnects are exhausted and stops after terminal status', async () => {
    mockListTestCases.mockResolvedValue(baseTestCases);
    mockListModelConfigs.mockResolvedValue([baseConfig]);
    mockListCampaigns
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        createCampaignStatus({
          id: 'cmp-poll',
          status: 'running',
          current_question_id: 'Q1',
          current_mode: 'naive',
        }),
      ])
      .mockResolvedValueOnce([
        createCampaignStatus({
          id: 'cmp-poll',
          status: 'running',
          current_question_id: 'Q1',
          current_mode: 'naive',
        }),
      ])
      .mockResolvedValue([
        createCampaignStatus({
          id: 'cmp-poll',
          status: 'completed',
          phase: 'evaluation',
          completed_units: 1,
          total_units: 1,
          evaluation_completed_units: 1,
          evaluation_total_units: 1,
          current_question_id: 'Q1',
          current_mode: 'naive',
          completed_at: '2026-03-07T00:00:10+00:00',
          updated_at: '2026-03-07T00:00:10+00:00',
        }),
      ]);
    mockCreateCampaign.mockResolvedValue({ campaign_id: 'cmp-poll', status: 'pending' });
    mockStreamCampaign.mockRejectedValue(new Error('SSE disconnected'));
    renderRunner();

    await waitFor(() => {
      expect(screen.getByText('已選擇 1 題')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: '開始評估' }));

    await waitFor(() => {
      expect(mockCreateCampaign).toHaveBeenCalledTimes(1);
    });

    await waitFor(() => {
      expect(screen.getAllByText('已完成').length).toBeGreaterThan(0);
    }, { timeout: 17000 });

    const callCountAfterTerminal = mockListCampaigns.mock.calls.length;
    await new Promise((resolve) => window.setTimeout(resolve, 4500));
    expect(mockListCampaigns.mock.calls.length).toBe(callCountAfterTerminal);
  }, 20000);

  it('stops polling fallback after SSE reconnect succeeds', async () => {
    mockListTestCases.mockResolvedValue(baseTestCases);
    mockListModelConfigs.mockResolvedValue([baseConfig]);
    mockListCampaigns
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        createCampaignStatus({
          id: 'cmp-recover',
          status: 'running',
          current_question_id: 'Q1',
          current_mode: 'naive',
        }),
      ])
      .mockResolvedValue([
        createCampaignStatus({
          id: 'cmp-recover',
          status: 'running',
          current_question_id: 'Q1',
          current_mode: 'naive',
        }),
      ]);
    mockCreateCampaign.mockResolvedValue({ campaign_id: 'cmp-recover', status: 'pending' });
    let streamCalls = 0;
    mockStreamCampaign.mockImplementation(async (_campaignId, onEvent) => {
      await Promise.resolve();
      streamCalls += 1;
      if (streamCalls <= 4) {
        throw new Error('SSE disconnected');
      }
      onEvent({
        type: 'campaign_completed',
        data: createCampaignStatus({
          id: 'cmp-recover',
          status: 'completed',
          phase: 'evaluation',
          completed_units: 1,
          total_units: 1,
          evaluation_completed_units: 1,
          evaluation_total_units: 1,
          current_question_id: 'Q1',
          current_mode: 'naive',
          completed_at: '2026-03-07T00:00:10+00:00',
          updated_at: '2026-03-07T00:00:10+00:00',
        }),
      });
    });
    renderRunner();

    await waitFor(() => {
      expect(screen.getByText('已選擇 1 題')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: '開始評估' }));
    await waitFor(() => {
      expect(mockCreateCampaign).toHaveBeenCalledTimes(1);
    });

    await waitFor(() => {
      expect(screen.getByText('串流中斷，已切換輪詢備援')).toBeInTheDocument();
    }, { timeout: 10000 });

    fireEvent.click(screen.getAllByRole('button', { name: '重連' })[0]);
    await waitFor(() => {
      expect(streamCalls).toBe(5);
    });
    await waitFor(() => {
      expect(screen.getAllByText('已完成').length).toBeGreaterThan(0);
    }, { timeout: 5000 });

    const callCountAfterReconnect = mockListCampaigns.mock.calls.length;
    await new Promise((resolve) => window.setTimeout(resolve, 4500));
    expect(mockListCampaigns.mock.calls.length).toBe(callCountAfterReconnect);
  }, 25000);

  it('renders execution failure from streamed terminal event', async () => {
    mockListTestCases.mockResolvedValue(baseTestCases);
    mockListModelConfigs.mockResolvedValue([baseConfig]);
    mockListCampaigns
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        createCampaignStatus({
          id: 'cmp-fail-exec',
          name: 'Execution failure',
          status: 'failed',
          error_message: 'Execution step failed',
          updated_at: '2026-03-07T00:00:10+00:00',
        }),
      ]);
    mockCreateCampaign.mockResolvedValue({ campaign_id: 'cmp-fail-exec', status: 'pending' });
    mockStreamCampaign.mockImplementation((_campaignId, onEvent) => {
      onEvent({
        type: 'campaign_failed',
        data: createCampaignStatus({
          id: 'cmp-fail-exec',
          name: 'Execution failure',
          status: 'failed',
          current_question_id: 'Q1',
          current_mode: 'naive',
          error_message: 'Execution step failed',
          updated_at: '2026-03-07T00:00:10+00:00',
        }),
      });
      return Promise.resolve();
    });

    renderRunner();

    await waitFor(() => {
      expect(screen.getByText('已選擇 1 題')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: '開始評估' }));

    await waitFor(() => {
      expect(screen.getAllByText('失敗').length).toBeGreaterThan(0);
    });
    expect(screen.getByText('Execution step failed')).toBeInTheDocument();
    expect(screen.getByText('目前階段：Raw 執行')).toBeInTheDocument();
  });

  it('renders evaluation failure from streamed terminal event', async () => {
    mockListTestCases.mockResolvedValue(baseTestCases);
    mockListModelConfigs.mockResolvedValue([baseConfig]);
    mockListCampaigns
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        createCampaignStatus({
          id: 'cmp-fail-eval',
          name: 'Evaluation failure',
          status: 'failed',
          phase: 'evaluation',
          completed_units: 1,
          total_units: 1,
          evaluation_completed_units: 0,
          evaluation_total_units: 1,
          error_message: 'RAGAS evaluation failed',
          updated_at: '2026-03-07T00:00:10+00:00',
        }),
      ]);
    mockCreateCampaign.mockResolvedValue({ campaign_id: 'cmp-fail-eval', status: 'pending' });
    mockStreamCampaign.mockImplementation((_campaignId, onEvent) => {
      onEvent({
        type: 'campaign_failed',
        data: createCampaignStatus({
          id: 'cmp-fail-eval',
          name: 'Evaluation failure',
          status: 'failed',
          phase: 'evaluation',
          completed_units: 1,
          total_units: 1,
          evaluation_completed_units: 0,
          evaluation_total_units: 1,
          current_question_id: 'Q1',
          current_mode: 'naive',
          error_message: 'RAGAS evaluation failed',
          updated_at: '2026-03-07T00:00:10+00:00',
        }),
      });
      return Promise.resolve();
    });

    renderRunner();

    await waitFor(() => {
      expect(screen.getByText('已選擇 1 題')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: '開始評估' }));

    await waitFor(() => {
      expect(screen.getAllByText('失敗').length).toBeGreaterThan(0);
    });
    expect(screen.getByText('RAGAS evaluation failed')).toBeInTheDocument();
    expect(screen.getByText('目前階段：RAGAS 評估')).toBeInTheDocument();
  });

  it('treats completed_with_errors as terminal warning status', async () => {
    mockListTestCases.mockResolvedValue(baseTestCases);
    mockListModelConfigs.mockResolvedValue([baseConfig]);
    const partialCampaign = createCampaignStatus({
      id: 'cmp-partial',
      status: 'completed_with_errors',
      error_message: 'One item has no compatible result',
      updated_at: '2026-03-07T00:00:10+00:00',
    });
    mockListCampaigns
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([partialCampaign])
      .mockResolvedValue([partialCampaign]);
    mockCreateCampaign.mockResolvedValue({ campaign_id: 'cmp-partial', status: 'pending' });
    mockStreamCampaign.mockImplementation((_campaignId, onEvent) => {
      onEvent({
        type: 'campaign_completed_with_errors',
        data: createCampaignStatus({
          id: 'cmp-partial',
          status: 'completed_with_errors',
          error_message: 'One item has no compatible result',
          updated_at: '2026-03-07T00:00:10+00:00',
        }),
      });
      return Promise.resolve();
    });

    renderRunner();
    await waitFor(() => expect(screen.getByText('已選擇 1 題')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: '開始評估' }));
    await waitFor(() => expect(screen.getByText('完成但有錯誤')).toBeInTheDocument());
    expect(screen.getByText('One item has no compatible result')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '取消' })).not.toBeInTheDocument();
  });
  it('shows model reasoning settings in setup, history, and raw result summaries', async () => {
    const reasoningConfig = {
      ...baseConfig,
      thinking_mode: true,
      thinking_budget: 8192,
      thinking_level: null,
      thinking_include_thoughts: false,
    };
    const campaign = createCampaignStatus({
      config: {
        ...baseCampaignConfig,
        model_config: reasoningConfig,
      },
    });

    mockListTestCases.mockResolvedValue(baseTestCases);
    mockListModelConfigs.mockResolvedValue([reasoningConfig]);
    mockListCampaigns.mockResolvedValue([campaign]);
    mockStreamCampaign.mockResolvedValue(undefined);
    mockGetCampaignResults.mockResolvedValue({
      campaign,
      results: [
        {
          id: 'result-reasoning-1',
          campaign_id: campaign.id,
          question_id: 'Q1',
          question: 'Question 1',
          ground_truth: 'Answer 1',
          ground_truth_short: 'Short answer 1',
          key_points: ['point-1'],
          ragas_focus: ['answer_correctness'],
          mode: 'naive',
          run_number: 1,
          answer: 'answer',
          contexts: [],
          source_doc_ids: [],
          expected_sources: [],
          latency_ms: 10,
          token_usage: { total_tokens: 42, reasoning_tokens: 7 },
          status: 'completed',
          has_trace: false,
          created_at: '2026-03-07T00:00:10+00:00',
        },
      ],
    });

    renderRunner();

    await waitFor(() => {
      expect(screen.getAllByText('gemini-2.5-flash - Reasoning: budget 8192').length).toBeGreaterThan(1);
    });

    fireEvent.click(screen.getByRole('button', { name: '查看結果' }));
    await waitFor(() => {
      expect(screen.getByText('Reasoning tokens: 7')).toBeInTheDocument();
    });
  });

  it('preflights selected v9 Agentic cases before creating the Evidence-First campaign', async () => {
    mockListTestCases.mockResolvedValue(baseTestCases);
    mockListModelConfigs.mockResolvedValue([baseConfig]);
    mockListCampaigns.mockResolvedValue([]);
    mockPreflightCampaign.mockResolvedValue({
      questions: [{ question_id: 'Q1', status: 'feasible', issues: [] }],
    });
    mockCreateCampaign.mockResolvedValue({ campaign_id: 'cmp-v9', status: 'pending' });
    mockStreamCampaign.mockResolvedValue(undefined);

    renderRunner();

    await waitFor(() => expect(screen.getByText('已選擇 1 題')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('checkbox', { name: 'Agentic RAG' }));
    expect(screen.getByLabelText('Agentic 執行版本')).toHaveValue('v8');

    fireEvent.change(screen.getByLabelText('Agentic 執行版本'), { target: { value: 'v9' } });
    expect(screen.getByText(/^Evidence-First：/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '開始評估' }));

    await waitFor(() => {
      expect(mockPreflightCampaign).toHaveBeenCalledWith({
        test_case_ids: ['Q1'],
        model_config: baseConfig,
        runtime_token_budget: 50000,
        max_llm_calls: 5,
      });
    });
    const request = mockCreateCampaign.mock.calls[0]?.[0];
    expect(request?.modes).toContain('agentic-v9');
    expect(request?.agentic_execution_version).toBe('v9');
    expect(request?.shadow_evaluation_policy).toBeNull();
  });

  it('rejects a v9 authoritative selection combined with a v9 shadow', async () => {
    mockListTestCases.mockResolvedValue(baseTestCases);
    mockListModelConfigs.mockResolvedValue([baseConfig]);
    mockListCampaigns.mockResolvedValue([]);

    renderRunner();

    await waitFor(() => expect(screen.getByText('已選擇 1 題')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('checkbox', { name: 'Agentic RAG' }));
    fireEvent.change(screen.getByLabelText('Agentic 執行版本'), { target: { value: 'v9' } });
    fireEvent.click(screen.getByRole('checkbox', { name: '同時執行 v9 shadow' }));
    fireEvent.click(screen.getByRole('button', { name: '開始評估' }));

    await waitFor(() => {
      expect(screen.getAllByText('v9 Evidence-First 不能同時設定 v9 shadow。').length).toBeGreaterThan(0);
    });
    expect(mockPreflightCampaign).not.toHaveBeenCalled();
    expect(mockCreateCampaign).not.toHaveBeenCalled();
  });

  it('renders per-question v9 preflight incompatibilities and does not submit', async () => {
    mockListTestCases.mockResolvedValue(baseTestCases);
    mockListModelConfigs.mockResolvedValue([baseConfig]);
    mockListCampaigns.mockResolvedValue([]);
    mockPreflightCampaign.mockResolvedValue({
      questions: [{
        question_id: 'Q1',
        status: 'configuration_incompatible',
        issues: [{ status: 'configuration_incompatible', stage: 'post_contract', reason: 'output_cap_too_small' }],
      }],
    });

    renderRunner();

    await waitFor(() => expect(screen.getByText('已選擇 1 題')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('checkbox', { name: 'Agentic RAG' }));
    fireEvent.change(screen.getByLabelText('Agentic 執行版本'), { target: { value: 'v9' } });
    fireEvent.click(screen.getByRole('button', { name: '開始評估' }));

    await waitFor(() => {
      expect(screen.getByText('Q1: configuration_incompatible')).toBeInTheDocument();
    });
    expect(screen.getByText('post_contract: output_cap_too_small')).toBeInTheDocument();
    expect(mockCreateCampaign).not.toHaveBeenCalled();
  });

  it('creates an independent v9 shadow after the authoritative v8 campaign', async () => {
    const authoritative = createCampaignStatus({ id: 'cmp-authoritative' });
    const shadow = createCampaignStatus({
      id: 'cmp-shadow',
      config: {
        ...baseCampaignConfig,
        modes: ['agentic-v9-shadow'],
        agentic_execution_version: 'v9',
        shadow_evaluation_policy: 'research',
      },
    });
    mockListTestCases.mockResolvedValue(baseTestCases);
    mockListModelConfigs.mockResolvedValue([baseConfig]);
    mockListCampaigns
      .mockResolvedValueOnce([])
      .mockResolvedValue([authoritative, shadow]);
    mockPreflightCampaign.mockResolvedValue({
      questions: [{ question_id: 'Q1', status: 'feasible', issues: [] }],
    });
    mockCreateCampaign
      .mockResolvedValueOnce({ campaign_id: 'cmp-authoritative', status: 'pending' })
      .mockResolvedValueOnce({ campaign_id: 'cmp-shadow', status: 'pending' });
    mockStreamCampaign.mockResolvedValue(undefined);

    renderRunner();

    await waitFor(() => expect(screen.getByText('已選擇 1 題')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('checkbox', { name: 'Agentic RAG' }));
    fireEvent.click(screen.getByRole('checkbox', { name: '同時執行 v9 shadow' }));
    fireEvent.change(screen.getByLabelText('v9 shadow policy'), { target: { value: 'research' } });
    fireEvent.click(screen.getByRole('button', { name: '開始評估' }));

    await waitFor(() => expect(mockCreateCampaign).toHaveBeenCalledTimes(2));
    const authoritativeRequest = mockCreateCampaign.mock.calls[0]?.[0];
    const shadowRequest = mockCreateCampaign.mock.calls[1]?.[0];
    expect(authoritativeRequest?.modes).toContain('agentic');
    expect(authoritativeRequest?.agentic_execution_version).toBe('v8');
    expect(authoritativeRequest?.shadow_evaluation_policy).toBeNull();
    expect(shadowRequest?.modes).toEqual(['agentic-v9-shadow']);
    expect(shadowRequest?.agentic_execution_version).toBe('v9');
    expect(shadowRequest?.shadow_evaluation_policy).toBe('research');
    expect(screen.getByText(/v9 shadow 已建立為獨立 campaign/)).toBeInTheDocument();
  });

  it('does not submit stale v9 shadow state after Agentic is deselected', async () => {
    mockListTestCases.mockResolvedValue(baseTestCases);
    mockListModelConfigs.mockResolvedValue([baseConfig]);
    mockListCampaigns.mockResolvedValue([]);
    mockCreateCampaign.mockResolvedValue({ campaign_id: 'cmp-naive-advanced', status: 'pending' });
    mockStreamCampaign.mockResolvedValue(undefined);

    renderRunner();

    await waitFor(() => expect(screen.getByText('已選擇 1 題')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('checkbox', { name: 'Agentic RAG' }));
    fireEvent.click(screen.getByRole('checkbox', { name: '同時執行 v9 shadow' }));
    fireEvent.change(screen.getByLabelText('v9 shadow policy'), { target: { value: 'research' } });
    fireEvent.click(screen.getByRole('checkbox', { name: 'Agentic RAG' }));

    fireEvent.click(screen.getByRole('button', { name: '開始評估' }));

    await waitFor(() => expect(mockCreateCampaign).toHaveBeenCalledTimes(1));
    expect(mockCreateCampaign).toHaveBeenCalledWith(expect.objectContaining({
      modes: ['naive', 'advanced'],
    }));
    expect(mockPreflightCampaign).not.toHaveBeenCalled();
  });

  it('displays the stored agentic version and shadow condition from campaign history', async () => {
    const v9Campaign = createCampaignStatus({
      id: 'cmp-v9-history',
      config: {
        ...baseCampaignConfig,
        modes: ['agentic-v9'],
        agentic_execution_version: 'v9',
        shadow_evaluation_policy: null,
      },
    });
    const shadowCampaign = createCampaignStatus({
      id: 'cmp-shadow-history',
      config: {
        ...baseCampaignConfig,
        modes: ['agentic-v9-shadow'],
        agentic_execution_version: 'v9',
        shadow_evaluation_policy: 'operational',
      },
    });
    mockListTestCases.mockResolvedValue(baseTestCases);
    mockListModelConfigs.mockResolvedValue([baseConfig]);
    mockListCampaigns.mockResolvedValue([v9Campaign, shadowCampaign]);
    mockStreamCampaign.mockResolvedValue(undefined);

    renderRunner();

    await waitFor(() => {
      expect(screen.getByText('Agentic v9 Evidence-First')).toBeInTheDocument();
    });
    expect(screen.getByText('Agentic v9 shadow (operational)')).toBeInTheDocument();
  });
});
