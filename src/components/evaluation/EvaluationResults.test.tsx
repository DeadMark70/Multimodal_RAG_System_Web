import { ChakraProvider } from '@chakra-ui/react';
import { cloneElement, isValidElement, type ReactNode } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  evaluateCampaign as evaluateCampaignFn,
  getCampaignMetrics as getCampaignMetricsFn,
  listCampaigns as listCampaignsFn,
} from '../../services/evaluationApi';
import type { CampaignConfigInput, CampaignMetricsResponse, CampaignStatus } from '../../types/evaluation';
import theme from '../../theme';
import EvaluationResults from './EvaluationResults';

const { mockListCampaigns, mockGetCampaignMetrics, mockEvaluateCampaign } = vi.hoisted(() => ({
  mockListCampaigns: vi.fn<typeof listCampaignsFn>(),
  mockGetCampaignMetrics: vi.fn<typeof getCampaignMetricsFn>(),
  mockEvaluateCampaign: vi.fn<typeof evaluateCampaignFn>(),
}));

vi.mock('../../services/evaluationApi', () => ({
  listCampaigns: mockListCampaigns,
  getCampaignMetrics: mockGetCampaignMetrics,
  evaluateCampaign: mockEvaluateCampaign,
}));

vi.mock('recharts', async () => {
  const actual = await vi.importActual<Record<string, unknown>>('recharts');
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: ReactNode }) => {
      if (isValidElement<{ width?: number; height?: number }>(children)) {
        return cloneElement(children, {
          width: 800,
          height: 320,
        });
      }
      return <div>{children}</div>;
    },
  };
});

beforeAll(() => {
  window.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

const baseCampaignConfig: CampaignConfigInput = {
  test_case_ids: ['Q1'],
  modes: ['naive', 'advanced'],
  model_config: {
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
  },
  repeat_count: 1,
  batch_size: 1,
  rpm_limit: 60,
};

const completedCampaign: CampaignStatus = {
  id: 'cmp-1',
  name: 'Campaign 1',
  status: 'completed',
  phase: 'evaluation',
  config: baseCampaignConfig,
  completed_units: 2,
  total_units: 2,
  evaluation_completed_units: 2,
  evaluation_total_units: 2,
  cancel_requested: false,
  created_at: '2026-03-08T00:00:00+00:00',
  updated_at: '2026-03-08T00:00:00+00:00',
};

const evaluatingCampaign: CampaignStatus = {
  ...completedCampaign,
  status: 'evaluating',
  evaluation_completed_units: 0,
  evaluation_total_units: 2,
};

const populatedMetrics: CampaignMetricsResponse = {
  campaign: completedCampaign,
  evaluator_model: 'gemini-2.5-pro',
  available_metrics: ['faithfulness', 'answer_correctness', 'answer_relevancy'],
  summary_by_mode: {
    naive: {
      mode: 'naive',
      sample_count: 1,
      metric_summaries: {
        faithfulness: { mean: 0.4, max: 0.4, stddev: 0 },
        answer_correctness: { mean: 0.5, max: 0.5, stddev: 0 },
        answer_relevancy: { mean: 0.45, max: 0.45, stddev: 0 },
      },
      faithfulness: { mean: 0.4, max: 0.4, stddev: 0 },
      answer_correctness: { mean: 0.5, max: 0.5, stddev: 0 },
      total_tokens: { mean: 100, max: 100, stddev: 0 },
      delta_answer_correctness: 0,
      delta_total_tokens: 0,
      ecr: 0,
      ecr_note: null,
    },
    advanced: {
      mode: 'advanced',
      sample_count: 1,
      metric_summaries: {
        faithfulness: { mean: 0.7, max: 0.7, stddev: 0 },
        answer_correctness: { mean: 0.8, max: 0.8, stddev: 0 },
        answer_relevancy: { mean: 0.85, max: 0.85, stddev: 0 },
      },
      faithfulness: { mean: 0.7, max: 0.7, stddev: 0 },
      answer_correctness: { mean: 0.8, max: 0.8, stddev: 0 },
      total_tokens: { mean: 150, max: 150, stddev: 0 },
      delta_answer_correctness: 0.3,
      delta_total_tokens: 50,
      ecr: 6,
      ecr_note: null,
    },
  },
  summary_by_category: {
    '綜合比較題': {
      group_key: '綜合比較題',
      sample_count: 2,
      metric_summaries: {
        faithfulness: { mean: 0.55, max: 0.7, stddev: 0.2 },
        answer_correctness: { mean: 0.65, max: 0.8, stddev: 0.2 },
        answer_relevancy: { mean: 0.65, max: 0.85, stddev: 0.28 },
      },
      total_tokens: { mean: 125, max: 150, stddev: 35.3 },
    },
  },
  summary_by_focus: {
    answer_correctness: {
      group_key: 'answer_correctness',
      sample_count: 2,
      metric_summaries: {
        faithfulness: { mean: 0.55, max: 0.7, stddev: 0.2 },
        answer_correctness: { mean: 0.65, max: 0.8, stddev: 0.2 },
        answer_relevancy: { mean: 0.65, max: 0.85, stddev: 0.28 },
      },
      total_tokens: { mean: 125, max: 150, stddev: 35.3 },
    },
  },
  rows: [
    {
      campaign_result_id: 'r1',
      question_id: 'Q1',
      question: 'Question 1',
      mode: 'naive',
      run_number: 1,
      category: '綜合比較題',
      difficulty: 'hard',
      ragas_focus: ['answer_correctness'],
      reference_source: 'ground_truth_short',
      total_tokens: 100,
      metric_values: {
        faithfulness: 0.4,
        answer_correctness: 0.5,
        answer_relevancy: 0.45,
      },
      faithfulness: 0.4,
      answer_correctness: 0.5,
    },
    {
      campaign_result_id: 'r2',
      question_id: 'Q1',
      question: 'Question 1',
      mode: 'advanced',
      run_number: 1,
      category: '綜合比較題',
      difficulty: 'hard',
      ragas_focus: ['answer_correctness'],
      reference_source: 'ground_truth_fallback_long',
      total_tokens: 150,
      metric_values: {
        faithfulness: 0.7,
        answer_correctness: 0.8,
        answer_relevancy: 0.85,
      },
      faithfulness: 0.7,
      answer_correctness: 0.8,
    },
  ],
};

const emptyMetrics: CampaignMetricsResponse = {
  campaign: completedCampaign,
  evaluator_model: 'gemini-2.5-pro',
  available_metrics: ['faithfulness', 'answer_correctness', 'answer_relevancy'],
  summary_by_mode: {},
  summary_by_category: {},
  summary_by_focus: {},
  rows: [],
};

function renderResults() {
  render(
    <ChakraProvider theme={theme}>
      <EvaluationResults />
    </ChakraProvider>
  );
}

describe('EvaluationResults', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders metrics summary, selector, exports, and rerun action', async () => {
    const createObjectURL = vi.fn(() => 'blob:metrics');
    const revokeObjectURL = vi.fn();
    const clickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => {});
    vi.stubGlobal('URL', {
      ...URL,
      createObjectURL,
      revokeObjectURL,
    });

    mockListCampaigns.mockResolvedValue([completedCampaign]);
    mockGetCampaignMetrics.mockResolvedValue(populatedMetrics);
    mockEvaluateCampaign.mockResolvedValue(evaluatingCampaign);

    renderResults();

    await waitFor(() => {
      expect(screen.getByText('模式比較總表')).toBeInTheDocument();
    });

    expect(screen.getByText('Evaluator: gemini-2.5-pro')).toBeInTheDocument();
    expect(screen.getByText(/Available metrics:/)).toBeInTheDocument();
    expect(screen.getByText('依 Category 摘要')).toBeInTheDocument();
    expect(screen.getByText('依 RAGAS Focus 摘要')).toBeInTheDocument();
    expect(screen.getByText('ground_truth_short')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('目前指標'), {
      target: { value: 'answer_relevancy' },
    });
    expect(screen.getAllByText('Answer Relevancy Mean').length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole('button', { name: '匯出 JSON' }));
    expect(createObjectURL).toHaveBeenCalledTimes(1);
    expect(clickSpy).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: '匯出 CSV' }));
    expect(createObjectURL).toHaveBeenCalledTimes(2);
    expect(clickSpy).toHaveBeenCalledTimes(2);

    fireEvent.click(screen.getByRole('button', { name: '重新執行 RAGAS' }));
    await waitFor(() => {
      expect(mockEvaluateCampaign).toHaveBeenCalledWith('cmp-1');
    });

    clickSpy.mockRestore();
  }, 15000);

  it('shows empty metrics copy for completed campaigns without RAGAS rows', async () => {
    mockListCampaigns.mockResolvedValue([completedCampaign]);
    mockGetCampaignMetrics.mockResolvedValue(emptyMetrics);

    renderResults();

    await waitFor(() => {
      expect(screen.getByText('此 campaign 目前尚無可視覺化的 RAGAS 指標。')).toBeInTheDocument();
    });
  });

  it('shows evaluating copy while metrics are still being generated', async () => {
    mockListCampaigns.mockResolvedValue([evaluatingCampaign]);
    mockGetCampaignMetrics.mockResolvedValue({
      ...emptyMetrics,
      campaign: evaluatingCampaign,
    });

    renderResults();

    await waitFor(() => {
      expect(screen.getByText('RAGAS 評估進行中，結果會在完成後自動更新。')).toBeInTheDocument();
    });
  });

  it('reloads metrics after rerun and renders refreshed summary', async () => {
    mockListCampaigns
      .mockResolvedValueOnce([completedCampaign])
      .mockResolvedValueOnce([completedCampaign]);
    mockGetCampaignMetrics
      .mockResolvedValueOnce(emptyMetrics)
      .mockResolvedValueOnce(populatedMetrics);
    mockEvaluateCampaign.mockResolvedValue(evaluatingCampaign);

    renderResults();

    await waitFor(() => {
      expect(screen.getByText('此 campaign 目前尚無可視覺化的 RAGAS 指標。')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: '重新執行 RAGAS' }));

    await waitFor(() => {
      expect(mockEvaluateCampaign).toHaveBeenCalledWith('cmp-1');
    });
    await waitFor(() => {
      expect(screen.getByText('模式比較總表')).toBeInTheDocument();
    });
    expect(screen.getByText('Evaluator: gemini-2.5-pro')).toBeInTheDocument();
  }, 15000);
});
