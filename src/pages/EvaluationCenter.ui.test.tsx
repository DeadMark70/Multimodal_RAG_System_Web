import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ChakraProvider } from '@chakra-ui/react';
import { describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import theme from '../theme';
import EvaluationCenter from './EvaluationCenter';
import { exportCampaignAnalysis, getCampaignOverview, getQuestionComparison } from '../services/evaluationApi';

vi.mock('../components/layout/Layout', () => ({
  default: ({ children }: { children: ReactNode }) => <div data-testid="layout">{children}</div>,
}));

vi.mock('../components/evaluation/TestCaseManager', () => ({
  default: () => <div>TestCaseManager</div>,
}));

vi.mock('../components/evaluation/ModelConfigPanel', () => ({
  default: () => <div>ModelConfigPanel</div>,
}));

vi.mock('../components/evaluation/CampaignRunner', () => ({
  default: () => <div>CampaignRunner</div>,
}));

vi.mock('../components/evaluation/CampaignOverviewTab', () => ({
  default: ({ data }: { data?: { summary?: { completedRuns?: number } } }) => (
    <div>CampaignOverviewTab {data?.summary?.completedRuns ?? 'none'}</div>
  ),
}));

vi.mock('../components/evaluation/QuestionAnalysisTab', () => ({
  default: () => <div>QuestionAnalysisTab</div>,
}));

vi.mock('../components/evaluation/RunTraceTab', () => ({
  default: () => <div>RunTraceTab</div>,
}));

vi.mock('../components/evaluation/RetrievalEvidenceTab', () => ({
  default: () => <div>RetrievalEvidenceTab</div>,
}));

vi.mock('../components/evaluation/AgentBehaviorTab', () => ({
  default: () => <div>AgentBehaviorTab</div>,
}));

vi.mock('../components/evaluation/ClaimEvidenceTab', () => ({
  default: () => <div>ClaimEvidenceTab</div>,
}));

vi.mock('../components/evaluation/RouterLabTab', () => ({
  default: () => <div>RouterLabTab</div>,
}));

vi.mock('../components/evaluation/AblationDashboardTab', () => ({
  default: () => <div>AblationDashboardTab</div>,
}));

vi.mock('../services/evaluationApi', () => ({
  listCampaigns: vi.fn().mockResolvedValue([
    {
      id: 'cmp-1',
      name: 'Campaign 1',
      status: 'completed',
      phase: 'evaluation',
      config: { test_case_ids: ['Q1'], modes: ['agentic'], model_config: {}, repeat_count: 1, batch_size: 1, rpm_limit: 60, ragas_batch_size: 8, ragas_parallel_batches: 8, ragas_rpm_limit: 1000 },
      completed_units: 1,
      total_units: 1,
      evaluation_completed_units: 1,
      evaluation_total_units: 1,
      cancel_requested: false,
      created_at: '2026-07-08T00:00:00Z',
      updated_at: '2026-07-08T00:00:00Z',
    },
  ]),
  getCampaignOverview: vi.fn().mockResolvedValue({
    campaign_id: 'cmp-1',
    sample_count: 2,
    independent_question_count: 1,
    repeat_count: 1,
    sample_note: 'n = 2',
    mode_counts: { agentic: 2 },
    total_tokens: 200,
    total_cost_usd: 0.02,
    total_cost_twd: 0.64,
    cost_status: 'complete',
    priced_call_count: 1,
    unpriced_call_count: 0,
    avg_latency_ms: 1000,
  }),
  getCampaignResults: vi.fn().mockResolvedValue({
    campaign: {},
    results: [
      {
        id: 'run-1',
        campaign_id: 'cmp-1',
        question_id: 'Q1',
        question: 'Question?',
        ground_truth: 'Answer',
        mode: 'agentic',
        run_number: 1,
        repeat_number: 1,
        answer: 'Answer',
        contexts: [],
        source_doc_ids: [],
        expected_sources: [],
        latency_ms: 100,
        token_usage: { total_tokens: 100 },
        status: 'completed',
        has_trace: false,
        created_at: '2026-07-08T00:00:00Z',
      },
    ],
  }),
  getCampaignRuns: vi.fn().mockResolvedValue({
    campaign_id: 'cmp-1',
    runs: [{ run_id: 'run-1', campaign_id: 'cmp-1', question_id: 'Q1', question: 'Question?', mode: 'agentic', run_number: 1, repeat_number: 1, status: 'completed', total_tokens: 100, created_at: '2026-07-08T00:00:00Z' }],
  }),
  getModeComparison: vi.fn().mockResolvedValue({
    campaign_id: 'cmp-1',
    analysis_unit: 'execution',
    sample_count: 2,
    independent_question_count: 1,
    repeat_count: 1,
    sample_note: 'n = 2',
    warnings: [],
    rows: [],
    summaries: { agentic: { sample_count: 2, total_tokens_mean: 100, latency_ms_mean: 1000 } },
  }),
  getQuestionComparison: vi.fn().mockResolvedValue({
    campaign_id: 'cmp-1',
    analysis_unit: 'question',
    sample_count: 2,
    independent_question_count: 1,
    repeat_count: 1,
    sample_note: 'n = 2',
    warnings: [],
    rows: [],
    summaries: { Q1: { execution_sample_count: 2, modes: ['agentic'], total_tokens_mean: 100 } },
  }),
  getCostLatency: vi.fn().mockResolvedValue({ campaign_id: 'cmp-1', analysis_unit: 'execution', sample_count: 2, independent_question_count: 1, repeat_count: 1, sample_note: 'n = 2', warnings: [], rows: [], summaries: {} }),
  getRouterAnalysis: vi.fn().mockResolvedValue({ campaign_id: 'cmp-1', analysis_unit: 'execution', analysis_type: 'retrospective', sample_count: 2, independent_question_count: 1, repeat_count: 1, sample_note: 'n = 2', warnings: [], rows: [], summaries: {} }),
  getAblationAnalysis: vi.fn().mockResolvedValue({ campaign_id: 'cmp-1', analysis_unit: 'execution', sample_count: 2, independent_question_count: 1, repeat_count: 1, sample_note: 'n = 2', warnings: [], rows: [], summaries: { condition_counts: {}, condition_labels: {} } }),
  getHumanVsAuto: vi.fn().mockResolvedValue({ campaign_id: 'cmp-1', analysis_unit: 'execution', sample_count: 0, independent_question_count: 0, repeat_count: 0, sample_note: 'none', warnings: [], rows: [], summaries: {} }),
  getHumanEvalQueue: vi.fn().mockResolvedValue({ campaign_id: 'cmp-1', rows: [] }),
  getCampaignErrors: vi.fn().mockResolvedValue({ campaign_id: 'cmp-1', rows: [] }),
  exportCampaignAnalysis: vi.fn().mockResolvedValue({ campaign: {}, redaction: { include_full_prompts: false }, runs: [], llm_calls: [] }),
  getRunDetail: vi.fn().mockResolvedValue({ run_id: 'run-1', campaign_id: 'cmp-1', trace_events: [], llm_calls: [], retrieval_events: [], retrieval_chunks: [], context_packs: [], tool_calls: [], routing_decisions: [], claims: [], human_ratings: [] }),
}));

describe('EvaluationCenter UI', () => {
  it('renders research dashboard tabs with setup access', async () => {
    render(
      <ChakraProvider theme={theme}>
        <EvaluationCenter />
      </ChakraProvider>
    );

    expect(screen.getByTestId('layout')).toBeInTheDocument();
    expect(screen.getByTestId('evaluation-scroll-region')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Campaign Overview' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Question Analysis' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Run Trace' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Retrieval Evidence' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Agent Behavior' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Claim Evidence' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Router Lab' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Ablation' })).toBeInTheDocument();
    await waitFor(() => expect(getCampaignOverview).toHaveBeenCalledWith('cmp-1'));
    expect(await screen.findByText('CampaignOverviewTab 2')).toBeInTheDocument();
    expect(exportCampaignAnalysis).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Setup evaluation' }));
    expect(screen.getByText('TestCaseManager')).toBeInTheDocument();
    expect(screen.getByText('ModelConfigPanel')).toBeInTheDocument();
    expect(screen.getByText('CampaignRunner')).toBeInTheDocument();
  });

  it('does not keep the whole dashboard loading while deferred tab analytics are pending', async () => {
    vi.mocked(getQuestionComparison).mockReturnValueOnce(new Promise(() => {}));

    render(
      <ChakraProvider theme={theme}>
        <EvaluationCenter />
      </ChakraProvider>
    );

    expect(await screen.findByText('CampaignOverviewTab 2')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByText('Loading evaluation analytics...')).not.toBeInTheDocument());
  });
});
