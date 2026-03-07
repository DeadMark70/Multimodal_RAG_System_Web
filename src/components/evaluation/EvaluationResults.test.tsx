import { ChakraProvider } from '@chakra-ui/react';
import { cloneElement, isValidElement, type ReactElement, type ReactNode } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import theme from '../../theme';
import EvaluationResults from './EvaluationResults';

const mockListCampaigns = vi.fn();
const mockGetCampaignMetrics = vi.fn();
const mockEvaluateCampaign = vi.fn();

vi.mock('../../services/evaluationApi', () => ({
  listCampaigns: () => mockListCampaigns(),
  getCampaignMetrics: (...args: unknown[]) => mockGetCampaignMetrics(...args),
  evaluateCampaign: (...args: unknown[]) => mockEvaluateCampaign(...args),
}));

vi.mock('recharts', async () => {
  const actual = await vi.importActual<typeof import('recharts')>('recharts');
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: ReactNode }) => {
      if (isValidElement(children)) {
        return cloneElement(children as ReactElement<{ width?: number; height?: number }>, {
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

describe('EvaluationResults', () => {
  it('renders metrics summary and rerun action', async () => {
    mockListCampaigns.mockResolvedValue([
      {
        id: 'cmp-1',
        name: 'Campaign 1',
        status: 'completed',
        phase: 'evaluation',
        config: {
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
        },
        completed_units: 2,
        total_units: 2,
        evaluation_completed_units: 2,
        evaluation_total_units: 2,
        cancel_requested: false,
        created_at: '2026-03-08T00:00:00+00:00',
        updated_at: '2026-03-08T00:00:00+00:00',
      },
    ]);
    mockGetCampaignMetrics.mockResolvedValue({
      campaign: {
        id: 'cmp-1',
        name: 'Campaign 1',
        status: 'completed',
        phase: 'evaluation',
        config: {
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
        },
        completed_units: 2,
        total_units: 2,
        evaluation_completed_units: 2,
        evaluation_total_units: 2,
        cancel_requested: false,
        created_at: '2026-03-08T00:00:00+00:00',
        updated_at: '2026-03-08T00:00:00+00:00',
      },
      evaluator_model: 'gemini-2.5-pro',
      summary_by_mode: {
        naive: {
          mode: 'naive',
          sample_count: 1,
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
          faithfulness: { mean: 0.7, max: 0.7, stddev: 0 },
          answer_correctness: { mean: 0.8, max: 0.8, stddev: 0 },
          total_tokens: { mean: 150, max: 150, stddev: 0 },
          delta_answer_correctness: 0.3,
          delta_total_tokens: 50,
          ecr: 6,
          ecr_note: null,
        },
      },
      rows: [
        {
          campaign_result_id: 'r1',
          question_id: 'Q1',
          question: 'Question 1',
          mode: 'naive',
          run_number: 1,
          total_tokens: 100,
          faithfulness: 0.4,
          answer_correctness: 0.5,
        },
        {
          campaign_result_id: 'r2',
          question_id: 'Q1',
          question: 'Question 1',
          mode: 'advanced',
          run_number: 1,
          total_tokens: 150,
          faithfulness: 0.7,
          answer_correctness: 0.8,
        },
      ],
    });
    mockEvaluateCampaign.mockResolvedValue({});

    render(
      <ChakraProvider theme={theme}>
        <EvaluationResults />
      </ChakraProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('模式比較總表')).toBeInTheDocument();
    });

    expect(screen.getByText('Evaluator: gemini-2.5-pro')).toBeInTheDocument();
    expect(screen.getAllByText('Advanced').length).toBeGreaterThan(0);
    expect(screen.getAllByText('6.00%').length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole('button', { name: '重新執行 RAGAS' }));
    await waitFor(() => {
      expect(mockEvaluateCampaign).toHaveBeenCalledWith('cmp-1');
    });
  });
});
