import { ChakraProvider } from '@chakra-ui/react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  cancelCampaign as cancelCampaignFn,
  createCampaign as createCampaignFn,
  getCampaignResults as getCampaignResultsFn,
  listCampaigns as listCampaignsFn,
  listModelConfigs as listModelConfigsFn,
  listTestCases as listTestCasesFn,
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
} = vi.hoisted(() => ({
  mockListTestCases: vi.fn<typeof listTestCasesFn>(),
  mockListModelConfigs: vi.fn<typeof listModelConfigsFn>(),
  mockListCampaigns: vi.fn<typeof listCampaignsFn>(),
  mockCreateCampaign: vi.fn<typeof createCampaignFn>(),
  mockStreamCampaign: vi.fn<typeof streamCampaignFn>(),
  mockGetCampaignResults: vi.fn<typeof getCampaignResultsFn>(),
  mockCancelCampaign: vi.fn<typeof cancelCampaignFn>(),
}));

vi.mock('../../services/evaluationApi', () => ({
  listTestCases: mockListTestCases,
  listModelConfigs: mockListModelConfigs,
  listCampaigns: mockListCampaigns,
  createCampaign: mockCreateCampaign,
  streamCampaign: mockStreamCampaign,
  getCampaignResults: mockGetCampaignResults,
  cancelCampaign: mockCancelCampaign,
}));

const baseTestCases = [
  {
    id: 'Q1',
    question: 'Question 1',
    ground_truth: 'Answer 1',
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
});
