import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { ChakraProvider } from '@chakra-ui/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import theme from '../theme';
import EvaluationCenter from './EvaluationCenter';
import { completeFixture } from '../components/evaluation/researchSummaryFixtures';

const apiMocks = vi.hoisted(() => ({
  listCampaigns: vi.fn(),
  getCampaignResearchSummary: vi.fn(),
  getCampaignErrors: vi.fn(),
  getResearchQuestionComparison: vi.fn(),
  getCampaignRuns: vi.fn(),
  getRunDetail: vi.fn(),
  getAgentBehavior: vi.fn(),
  getRouterAnalysis: vi.fn(),
  getAblationAnalysis: vi.fn(),
  getHumanVsAuto: vi.fn(),
  getHumanEvalQueue: vi.fn(),
}));

vi.mock('../components/layout/Layout', () => ({
  default: ({ children }: { children: ReactNode }) => <div data-testid="layout">{children}</div>,
}));

vi.mock('../components/evaluation/EvaluationSetupDrawer', () => ({
  default: () => null,
}));

vi.mock('../services/evaluationApi', () => apiMocks);

const campaign = {
  id: 'cmp-integration',
  name: 'Integration campaign',
  status: 'completed',
  phase: 'evaluation',
  config: { test_case_ids: ['Q-integrated'], modes: ['naive', 'agentic'] },
  completed_units: 2,
  total_units: 2,
  evaluation_completed_units: 2,
  evaluation_total_units: 2,
  cancel_requested: false,
  created_at: '2026-07-19T00:00:00Z',
  updated_at: '2026-07-19T00:00:00Z',
};

const runs = {
  campaign_id: 'cmp-integration',
  runs: [
    {
      run_id: 'run-a',
      campaign_id: 'cmp-integration',
      question_id: 'Q-integrated',
      question: 'Which run is selected?',
      mode: 'agentic',
      run_number: 1,
      repeat_number: 1,
      status: 'completed',
      total_tokens: null,
      created_at: '2026-07-19T00:00:00Z',
    },
    {
      run_id: 'run-b',
      campaign_id: 'cmp-integration',
      question_id: 'Q-integrated',
      question: 'Which run is selected?',
      mode: 'naive',
      run_number: 2,
      repeat_number: 1,
      status: 'completed',
      total_tokens: null,
      created_at: '2026-07-19T00:00:01Z',
    },
  ],
};

const detailFor = (runId: string) => ({
  run_id: runId,
  campaign_id: 'cmp-integration',
  trace_events: [{
    event_id: `event-${runId}`,
    sequence: 1,
    stage_name: runId === 'run-a' ? 'Agent trace A' : 'Naive trace B',
    status: 'success',
    started_at: '2026-07-19T00:00:00Z',
    duration_ms: 10,
    payload: {},
  }],
  llm_calls: [],
  retrieval_events: runId === 'run-a' ? [{ retriever_name: 'hybrid', query: 'query A' }] : [],
  retrieval_chunks: runId === 'run-a' ? [
    {
      chunk_id: 'chunk-a',
      doc_id: 'doc-a',
      rank_after_rerank: 1,
      dense_score: 0,
      bm25_score: null,
      rerank_score: null,
      used_in_context: null,
      used_in_answer: null,
      expected_evidence_match: null,
      payload: {},
    },
    {
      chunk_id: 'chunk-false',
      doc_id: 'doc-false',
      rank_after_rerank: 2,
      dense_score: null,
      bm25_score: null,
      rerank_score: null,
      used_in_context: false,
      used_in_answer: false,
      expected_evidence_match: false,
      payload: { instrumentation_depth: 'full' },
    },
  ] : [],
  context_packs: [],
  tool_calls: [],
  routing_decisions: [],
  claims: [],
  human_ratings: [],
  evidence_coverage: runId === 'run-a' ? [] : null,
  evidence_coverage_status: runId === 'run-a' ? 'not_instrumented' : 'not_available',
  run_summary: {
    run_id: runId,
    campaign_id: 'cmp-integration',
    question_id: 'Q-integrated',
    mode: runId === 'run-a' ? 'agentic' : 'naive',
    repeat: 1,
    answer_preview: runId === 'run-a' ? 'Answer from run A' : 'Answer from run B',
    total_tokens: runId === 'run-a' ? null : 80,
    accounting_status: runId === 'run-a' ? 'partial' : 'complete',
  },
});

beforeEach(() => {
  vi.clearAllMocks();
  apiMocks.listCampaigns.mockResolvedValue([campaign]);
  apiMocks.getCampaignResearchSummary.mockResolvedValue({ ...completeFixture, campaign_id: 'cmp-integration', completed_run_count: 2, total_run_count: 2 });
  apiMocks.getCampaignErrors.mockResolvedValue({ campaign_id: 'cmp-integration', rows: [] });
  apiMocks.getResearchQuestionComparison.mockResolvedValue({
    campaign_id: 'cmp-integration',
    analysis_unit: 'question',
    sample_count: 2,
    independent_question_count: 1,
    repeat_count: 1,
    sample_note: 'n = 2',
    warnings: [],
    summaries: {},
    rows: [{
      question_id: 'Q-integrated',
      category: 'neuro',
      difficulty: 'hard',
      required_modalities: ['text'],
      by_mode: [],
      delta_correctness: 0.2,
      delta_faithfulness: null,
      delta_latency_ms: null,
      delta_tokens: null,
      ecr_correctness: null,
      best_quality_mode: 'agentic',
      evidence_coverage: null,
      unsupported_claim_ratio: null,
      comparability_reason: 'incomplete_accounting',
    }],
  });
  apiMocks.getCampaignRuns.mockResolvedValue(runs);
  apiMocks.getRunDetail.mockImplementation((_campaignId: string, runId: string) => Promise.resolve(detailFor(runId)));
  apiMocks.getAgentBehavior.mockResolvedValue({
    campaign_id: 'cmp-integration',
    analysis_unit: 'execution',
    sample_count: 2,
    independent_question_count: 1,
    repeat_count: 1,
    sample_note: 'per-run',
    warnings: [],
    summaries: {},
    rows: [
      {
        run_id: 'run-a', campaign_id: 'cmp-integration', question_id: 'Q-integrated', mode: 'agentic', repeat_number: 1,
        trace_status: 'completed', accounting_status: 'partial', subtasks: 2, tool_calls: 1, visual_calls: 0, graph_calls: 0,
        drilldown_depth: 1, correctness: null, faithfulness: null, unsupported_claim_ratio: null, supported_claim_ratio: null, total_tokens: null,
      },
      {
        run_id: 'run-b', campaign_id: 'cmp-integration', question_id: 'Q-integrated', mode: 'naive', repeat_number: 1,
        trace_status: 'not_applicable', accounting_status: 'not_available', subtasks: null, tool_calls: null, visual_calls: null, graph_calls: null,
        drilldown_depth: null, correctness: null, faithfulness: null, unsupported_claim_ratio: null, supported_claim_ratio: null, total_tokens: null,
      },
    ],
  });
  apiMocks.getRouterAnalysis.mockResolvedValue({
    campaign_id: 'cmp-integration',
    analysis_unit: 'execution',
    analysis_type: 'retrospective',
    sample_count: 2,
    independent_question_count: 1,
    repeat_count: 1,
    sample_note: 'retrospective',
    warnings: [],
    rows: [],
    summaries: { saved_tokens: 0, quality_loss_vs_agentic: 0, quality_gain_vs_naive: 0, router_regret: 0 },
  });
  apiMocks.getAblationAnalysis.mockResolvedValue({ campaign_id: 'cmp-integration', analysis_unit: 'execution', sample_count: 0, independent_question_count: 0, repeat_count: 0, sample_note: 'none', warnings: [], rows: [], summaries: {} });
  apiMocks.getHumanVsAuto.mockResolvedValue({ campaign_id: 'cmp-integration', analysis_unit: 'execution', sample_count: 0, independent_question_count: 0, repeat_count: 0, sample_note: 'none', warnings: [], rows: [], summaries: {} });
  apiMocks.getHumanEvalQueue.mockResolvedValue({ campaign_id: 'cmp-integration', rows: [] });
});

function renderPage() {
  return render(
    <ChakraProvider theme={theme}>
      <EvaluationCenter />
    </ChakraProvider>
  );
}

describe('Evaluation Center real data flow', () => {
  it('keeps same-question agentic v8, v9, and shadow conditions selectable by run ID', async () => {
    apiMocks.getCampaignRuns.mockResolvedValue({
      campaign_id: 'cmp-integration',
      runs: [
        {
          ...runs.runs[0],
          run_id: 'run-v8',
          condition_id: 'condition-v8',
          execution_profile: 'authoritative',
          agentic_execution_version: 'v8',
          response_status: 'complete',
        },
        {
          ...runs.runs[0],
          run_id: 'run-v9',
          condition_id: 'condition-v9',
          execution_profile: 'authoritative',
          agentic_execution_version: 'v9',
          response_status: 'complete',
        },
        {
          ...runs.runs[0],
          run_id: 'run-v9-shadow',
          condition_id: 'condition-v9-shadow',
          execution_profile: 'shadow',
          agentic_execution_version: 'v9',
          response_status: 'qualified_partial',
        },
      ],
    });
    renderPage();

    fireEvent.click(await screen.findByRole('tab', { name: 'Run Trace' }));
    const selector = await screen.findByRole('combobox', { name: 'Run selector' });
    expect(screen.getByRole('option', { name: /Q-integrated · Agentic v8 · repeat 1/ })).toHaveValue('run-v8');
    expect(screen.getByRole('option', { name: /Q-integrated · Agentic v9 · repeat 1/ })).toHaveValue('run-v9');
    expect(screen.getByRole('option', { name: /Q-integrated · Agentic v9 shadow · repeat 1/ })).toHaveValue('run-v9-shadow');

    fireEvent.change(selector, { target: { value: 'run-v9-shadow' } });
    await waitFor(() => expect(apiMocks.getRunDetail).toHaveBeenLastCalledWith('cmp-integration', 'run-v9-shadow'));
    expect(selector).toHaveValue('run-v9-shadow');
  });

  it('keeps unavailable question metrics and measured zero retrieval scores distinct', async () => {
    renderPage();

    fireEvent.click(await screen.findByRole('tab', { name: 'Question Analysis' }));
    expect((await screen.findAllByText('Q-integrated')).length).toBeGreaterThan(0);
    expect(screen.getByText('+0.200')).toBeInTheDocument();
    expect(screen.getByText('agentic')).toBeInTheDocument();
    expect(screen.queryByText('advanced')).not.toBeInTheDocument();
    const questionRows = screen.getAllByRole('row').filter((row) => row.textContent?.includes('Q-integrated'));
    const questionRow = questionRows.at(-1);
    expect(questionRow).toBeTruthy();
    expect(questionRow).toHaveTextContent('neuro');
    expect(questionRow).toHaveTextContent('hard');
    expect(questionRow).toHaveTextContent('+0.200');
    expect(questionRow).toHaveTextContent('N/A');
    expect(questionRow).toHaveTextContent('incomplete_accounting');
    expect(questionRow).not.toHaveTextContent('+0.000');

    fireEvent.click(screen.getByRole('tab', { name: 'Retrieval Evidence' }));
    expect(await screen.findByText('0.00')).toBeInTheDocument();
    const missingChunkRow = screen.getAllByRole('row').find((row) => row.textContent?.includes('doc-a'));
    expect(missingChunkRow).toBeTruthy();
    const missingChunkCells = (missingChunkRow as HTMLElement).querySelectorAll('td');
    expect(missingChunkCells[7]).toHaveTextContent('N/A');
    expect(missingChunkCells[8]).toHaveTextContent('N/A');
    expect(missingChunkCells[9]).toHaveTextContent('N/A');
    expect(within(missingChunkRow as HTMLElement).queryByText('no')).not.toBeInTheDocument();
    const measuredFalseRow = screen.getAllByRole('row').find((row) => row.textContent?.includes('doc-false'));
    expect(measuredFalseRow).toBeTruthy();
    expect(within(measuredFalseRow as HTMLElement).getAllByText('no')).toHaveLength(3);
    expect(screen.getByText(/Evidence coverage: not_instrumented/)).toBeInTheDocument();
  });

  it('updates run-specific panels and keeps missing agent/router metrics unavailable', async () => {
    renderPage();

    fireEvent.click(await screen.findByRole('tab', { name: 'Run Trace' }));
    const runSelector = await screen.findByRole('combobox', { name: 'Run selector' });
    await waitFor(() => expect(runSelector).toHaveValue('run-a'));
    expect(screen.getByText('Answer from run A')).toBeInTheDocument();
    expect(screen.getByText('Agent trace A')).toBeInTheDocument();

    let resolveLateB!: (value: ReturnType<typeof detailFor>) => void;
    apiMocks.getRunDetail.mockImplementation((_campaignId: string, runId: string) => (
      runId === 'run-b'
        ? new Promise((resolve) => { resolveLateB = resolve; })
        : Promise.resolve(detailFor(runId))
    ));
    fireEvent.change(runSelector, { target: { value: 'run-b' } });
    await waitFor(() => expect(apiMocks.getRunDetail).toHaveBeenLastCalledWith('cmp-integration', 'run-b'));
    await waitFor(() => expect(runSelector).toHaveValue('run-b'));
    fireEvent.change(runSelector, { target: { value: 'run-a' } });
    await waitFor(() => expect(screen.getByText('Answer from run A')).toBeInTheDocument());
    resolveLateB(detailFor('run-b'));
    await waitFor(() => expect(screen.queryByText('Answer from run B')).not.toBeInTheDocument());
    expect(screen.getByText('Agent trace A')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: 'Retrieval Evidence' }));
    expect(await screen.findByText('doc-a')).toBeInTheDocument();
    expect(screen.getByText('doc-false')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: 'Agent Behavior' }));
    expect(await screen.findByText('run-a')).toBeInTheDocument();
    expect(screen.getByText('run-b')).toBeInTheDocument();
    const behaviorRows = screen.getAllByRole('row');
    const agentRow = behaviorRows.find((row) => row.textContent?.includes('run-a') && (row.querySelectorAll('td').length ?? 0) > 10);
    const naiveRow = behaviorRows.find((row) => row.textContent?.includes('run-b') && (row.querySelectorAll('td').length ?? 0) > 10);
    expect(agentRow).toHaveTextContent('partial');
    expect(agentRow).toHaveTextContent('N/A');
    expect(naiveRow).toHaveTextContent('not_applicable');
    expect(naiveRow).toHaveTextContent('not_available');

    fireEvent.click(screen.getByRole('tab', { name: 'Router Lab' }));
    expect(await screen.findByText(/no actual router runs/)).toBeInTheDocument();
    expect(screen.getAllByText('N/A').length).toBeGreaterThan(0);
    expect(screen.queryByText('Cost')).not.toBeInTheDocument();
  });
});
