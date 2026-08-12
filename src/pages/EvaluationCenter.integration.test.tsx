import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { ChakraProvider } from '@chakra-ui/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import theme from '../theme';
import EvaluationCenter from './EvaluationCenter';
import { completeFixture } from '../components/evaluation/researchSummaryFixtures';

const { apiMocks, jobPanelProps } = vi.hoisted(() => ({
  jobPanelProps: [] as Array<{
    campaignId: string;
    onJobTerminal?: (job: never) => void;
  }>,
  apiMocks: {
  listCampaigns: vi.fn(),
  getCampaignResearchSummary: vi.fn(),
  getCampaignReleaseMetrics: vi.fn(),
  getCampaignErrors: vi.fn(),
  getResearchQuestionComparison: vi.fn(),
  getCampaignRuns: vi.fn(),
  getRunObservability: vi.fn(),
  getAgentBehavior: vi.fn(),
  getRouterAnalysis: vi.fn(),
  getAblationAnalysis: vi.fn(),
  getHumanVsAuto: vi.fn(),
  getHumanEvalQueue: vi.fn(),
  },
}));

vi.mock('../components/layout/Layout', () => ({
  default: ({ children }: { children: ReactNode }) => <div data-testid="layout">{children}</div>,
}));

vi.mock('../components/evaluation/EvaluationSetupDrawer', () => ({
  default: () => null,
}));

vi.mock('../components/evaluation/EvaluationJobPanel', () => ({
  default: (props: { campaignId: string; onJobTerminal?: (job: never) => void }) => {
    jobPanelProps.push(props);
    return <div>EvaluationJobPanel {props.campaignId}</div>;
  },
}));

vi.mock('../services/evaluationApi', () => apiMocks);

const campaign = {
  id: 'cmp-integration',
  name: 'Integration campaign',
  status: 'completed',
  phase: 'evaluation',
  config: { test_case_ids: ['Q-integrated'], modes: ['naive', 'agentic'], benchmark_id: 'smoke-1' },
  completed_units: 2,
  total_units: 2,
  evaluation_completed_units: 2,
  evaluation_total_units: 2,
  cancel_requested: false,
  created_at: '2026-07-19T00:00:00Z',
  updated_at: '2026-07-19T00:00:00Z',
};

const releaseMetrics = {
  benchmark_id: 'smoke-1', benchmark_kind: 'smoke', comparable: false, gate_reasons: ['partial_accounting'], manifest: {}, arms: [],
  required_slot_coverage: { value: null, reason: 'partial_accounting' }, important_unsupported_claim_rate: { value: null, reason: 'partial_accounting' }, provenance_failure_rate: { value: null, reason: 'partial_accounting' }, pack_efficiency: { value: null, reason: 'partial_accounting' },
  graph_locator_success: { value: null, reason: 'graph_not_instrumented' }, graph_locator_fallback: { value: null, reason: 'graph_not_instrumented' }, final_generation_count: { value: null, reason: 'partial_accounting' }, latency_p95_ms: { value: null, reason: 'partial_accounting' }, token_ratio: { value: null, reason: 'partial_accounting' },
  paired_quality_delta: { value: null, reason: 'missing_ragas' }, paired_quality_ci_lower: { value: null, reason: 'missing_ragas' }, paired_quality_ci_upper: { value: null, reason: 'missing_ragas' }, category_quality_deltas: {}, per_question_quality_deltas: {}, statistics: {},
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
      retrieval_chunk_id: 'retrieval-chunk-a',
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
      retrieval_chunk_id: 'retrieval-chunk-false',
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
  claim_extraction_status: runId === 'run-a' ? 'empty' : 'not_instrumented',
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

const detailWithRoute = (
  campaignId: string,
  runId: string,
  route: string,
  routeDecision: Record<string, unknown> | null = null,
) => ({
  ...detailFor(runId),
  run_id: runId,
  campaign_id: campaignId,
  run_summary: {
    ...detailFor(runId).run_summary,
    run_id: runId,
    campaign_id: campaignId,
  },
  agentic_v9: {
    schema_version: '2',
    contract: {
      route,
      intent: `route ${route}`,
      route_decision: routeDecision,
    },
    slot_resolutions: [],
    evidence_packets: [],
    context_pack: null,
    final_claims: [],
  },
});

const routerAnalysisFor = (campaignId: string, reason = 'Retrospective decision recorded.') => ({
  campaign_id: campaignId,
  analysis_unit: 'execution',
  analysis_type: 'retrospective',
  sample_count: 1,
  independent_question_count: 1,
  repeat_count: 1,
  sample_note: 'retrospective',
  warnings: [],
  rows: [{
    routing_decision_id: `routing-${campaignId}`,
    run_id: `analysis-run-${campaignId}`,
    campaign_id: campaignId,
    question_id: 'Q-router',
    repeat_number: 1,
    span_id: null,
    selected_mode: 'graph',
    analysis_type: 'retrospective',
    decision_source: 'deterministic',
    candidate_routes: ['graph'],
    matched_rules: ['graph-required'],
    fallback_reason: null,
    confidence: 1,
    reason,
    created_at: '2026-08-13T00:00:00Z',
  }],
  summaries: {},
});

beforeEach(() => {
  vi.clearAllMocks();
  jobPanelProps.length = 0;
  apiMocks.listCampaigns.mockResolvedValue([campaign]);
  apiMocks.getCampaignResearchSummary.mockResolvedValue({ ...completeFixture, campaign_id: 'cmp-integration', completed_run_count: 2, total_run_count: 2 });
  apiMocks.getCampaignReleaseMetrics.mockResolvedValue(releaseMetrics);
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
  apiMocks.getRunObservability.mockImplementation((_campaignId: string, runId: string) => Promise.resolve(detailFor(runId)));
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
    summaries: {},
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
  it('renders release-gated, unavailable values without converting them into zeros', async () => {
    renderPage();

    expect(await screen.findByRole('heading', { name: 'Release Metrics' })).toBeInTheDocument();
    expect(screen.getByText('Smoke')).toBeInTheDocument();
    expect(screen.getByText(/Release gates blocked: partial_accounting/)).toBeInTheDocument();
    expect(screen.getAllByText('N/A — graph_not_instrumented')).toHaveLength(2);
    expect(screen.queryByText('$0.000')).not.toBeInTheDocument();
    expect(apiMocks.getCampaignReleaseMetrics).toHaveBeenCalledWith('cmp-integration');
  });

  it('does not request release metrics when the selected campaign has no benchmark', async () => {
    apiMocks.listCampaigns.mockResolvedValue([
      { ...campaign, config: { ...campaign.config, benchmark_id: null } },
    ]);

    renderPage();

    expect(await screen.findByText('Release Metrics 不適用：尚未設定 benchmark。')).toBeInTheDocument();
    expect(apiMocks.getCampaignResearchSummary).toHaveBeenCalledWith('cmp-integration');
    expect(apiMocks.getCampaignReleaseMetrics).not.toHaveBeenCalled();
  });

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
    await waitFor(() => expect(apiMocks.getRunObservability).toHaveBeenLastCalledWith('cmp-integration', 'run-v9-shadow'));
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
    apiMocks.getRunObservability.mockImplementation((_campaignId: string, runId: string) => (
      runId === 'run-b'
        ? new Promise((resolve) => { resolveLateB = resolve; })
        : Promise.resolve(detailFor(runId))
    ));
    fireEvent.change(runSelector, { target: { value: 'run-b' } });
    await waitFor(() => expect(apiMocks.getRunObservability).toHaveBeenLastCalledWith('cmp-integration', 'run-b'));
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
    expect(await screen.findByText('Retrospective Router Analysis')).toBeInTheDocument();
  });

  it('loads Router Lab directly and renders contract.route without route-decision provenance', async () => {
    apiMocks.getRouterAnalysis.mockResolvedValue(routerAnalysisFor(campaign.id));
    apiMocks.getRunObservability.mockResolvedValue(
      detailWithRoute(campaign.id, 'run-a', 'visual', null),
    );

    renderPage();

    fireEvent.click(await screen.findByRole('tab', { name: 'Router Lab' }));

    await waitFor(() => expect(apiMocks.getRouterAnalysis).toHaveBeenCalledWith(campaign.id));
    expect(apiMocks.getCampaignRuns).toHaveBeenCalledWith(campaign.id);
    expect(apiMocks.getRunObservability).toHaveBeenCalledWith(campaign.id, 'run-a');
    expect(await screen.findByText('Route: visual')).toBeInTheDocument();
    for (const unsupportedLabel of [
      'Tier', 'Complexity', 'Saved Tokens', 'Quality Loss vs Agentic',
      'Quality Gain vs Naive', 'Latency', 'Tokens', 'Regret',
      'Utility Formula', 'Oracle', 'Router Confusion Matrix',
    ]) {
      expect(screen.queryByText(unsupportedLabel, { exact: false })).not.toBeInTheDocument();
    }
  });

  it('keeps retrospective decisions visible when selected-run observability fails', async () => {
    apiMocks.getRouterAnalysis.mockResolvedValue(
      routerAnalysisFor(campaign.id, 'Retrospective row survives selected-run failure.'),
    );
    apiMocks.getRunObservability.mockRejectedValue(new Error('selected run unavailable'));

    renderPage();
    fireEvent.click(await screen.findByRole('tab', { name: 'Router Lab' }));

    expect(await screen.findByText('Retrospective row survives selected-run failure.')).toBeInTheDocument();
    expect(apiMocks.getRunObservability).toHaveBeenCalledWith(campaign.id, 'run-a');
  });

  it('keeps the execution route visible when retrospective analysis fails', async () => {
    apiMocks.getRouterAnalysis.mockRejectedValue(new Error('router analysis unavailable'));
    apiMocks.getRunObservability.mockResolvedValue(
      detailWithRoute(campaign.id, 'run-a', 'graph_relational'),
    );

    renderPage();
    fireEvent.click(await screen.findByRole('tab', { name: 'Router Lab' }));

    expect(await screen.findByText('Route: graph_relational')).toBeInTheDocument();
    expect(apiMocks.getRouterAnalysis).toHaveBeenCalledWith(campaign.id);
  });

  it('stays on Router Lab across campaign switches and rejects a late old execution route', async () => {
    const nextCampaign = { ...campaign, id: 'cmp-router-next', name: 'Next Router campaign' };
    const oldRun = { ...runs.runs[0], run_id: 'run-router-old', campaign_id: campaign.id };
    const newRun = { ...runs.runs[0], run_id: 'run-router-new', campaign_id: nextCampaign.id };
    const oldDetail = detailWithRoute(campaign.id, oldRun.run_id, 'multi_hop');
    const newDetail = detailWithRoute(nextCampaign.id, newRun.run_id, 'graph_relational');
    let oldDetailCalls = 0;
    let resolveLateOld!: (value: typeof oldDetail) => void;

    apiMocks.listCampaigns.mockResolvedValue([campaign, nextCampaign]);
    apiMocks.getCampaignResearchSummary.mockImplementation((campaignId: string) => Promise.resolve({
      ...completeFixture,
      campaign_id: campaignId,
    }));
    apiMocks.getRouterAnalysis.mockImplementation((campaignId: string) => (
      Promise.resolve(routerAnalysisFor(campaignId))
    ));
    apiMocks.getCampaignRuns.mockImplementation((campaignId: string) => Promise.resolve({
      campaign_id: campaignId,
      runs: campaignId === campaign.id ? [oldRun] : [newRun],
    }));
    apiMocks.getRunObservability.mockImplementation((campaignId: string) => {
      if (campaignId === nextCampaign.id) {
        return Promise.resolve(newDetail);
      }
      oldDetailCalls += 1;
      return oldDetailCalls === 1
        ? Promise.resolve(oldDetail)
        : new Promise<typeof oldDetail>((resolve) => { resolveLateOld = resolve; });
    });

    renderPage();
    fireEvent.click(await screen.findByRole('tab', { name: 'Router Lab' }));
    expect(await screen.findByText('Route: multi_hop')).toBeInTheDocument();

    jobPanelProps.at(-1)?.onJobTerminal?.({ job_id: 'router-refresh', campaign_id: campaign.id } as never);
    await waitFor(() => expect(apiMocks.getRunObservability).toHaveBeenCalledTimes(2));

    fireEvent.change(screen.getByRole('combobox', { name: 'Campaign selector' }), {
      target: { value: nextCampaign.id },
    });

    expect(screen.getByRole('tab', { name: 'Router Lab' })).toHaveAttribute('aria-selected', 'true');
    await waitFor(() => expect(screen.queryByText('Route: multi_hop')).not.toBeInTheDocument());
    await waitFor(() => expect(apiMocks.getRouterAnalysis).toHaveBeenCalledWith(nextCampaign.id));
    expect(apiMocks.getCampaignRuns).toHaveBeenCalledWith(nextCampaign.id);
    expect(apiMocks.getRunObservability).toHaveBeenCalledWith(nextCampaign.id, newRun.run_id);
    expect(await screen.findByText('Route: graph_relational')).toBeInTheDocument();

    resolveLateOld(oldDetail);
    await waitFor(() => expect(screen.queryByText('Route: multi_hop')).not.toBeInTheDocument());
    expect(screen.getByText('Route: graph_relational')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Router Lab' })).toHaveAttribute('aria-selected', 'true');
  });

  it('refreshes the selected tab after a terminal job without returning to Campaign Overview', async () => {
    renderPage();

    fireEvent.click(await screen.findByRole('tab', { name: 'Question Analysis' }));
    await waitFor(() => expect(apiMocks.getResearchQuestionComparison).toHaveBeenCalledTimes(1));
    expect(screen.getByRole('tab', { name: 'Question Analysis' })).toHaveAttribute('aria-selected', 'true');
    await waitFor(() => expect(jobPanelProps.at(-1)?.campaignId).toBe(campaign.id));

    jobPanelProps.at(-1)?.onJobTerminal?.({ job_id: 'job-terminal' } as never);

    await waitFor(() => expect(apiMocks.listCampaigns).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(apiMocks.getResearchQuestionComparison).toHaveBeenCalledTimes(2));
    expect(screen.getByRole('tab', { name: 'Question Analysis' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'Campaign Overview' })).toHaveAttribute('aria-selected', 'false');
  });

  it('propagates recorded-empty and not-instrumented claim extraction states by selected run', async () => {
    renderPage();

    fireEvent.click(await screen.findByRole('tab', { name: 'Run Trace' }));
    await screen.findByRole('combobox', { name: 'Run selector' });
    expect(await screen.findByText('Claim extraction ran and recorded zero claims.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: 'Claim Evidence' }));
    expect(await screen.findByText('Claim extraction ran and recorded zero claims.')).toBeInTheDocument();

    const claimRunSelector = await screen.findByRole('combobox', { name: 'Run selector' });
    fireEvent.change(claimRunSelector, { target: { value: 'run-b' } });
    await waitFor(() => expect(apiMocks.getRunObservability).toHaveBeenLastCalledWith('cmp-integration', 'run-b'));
    expect(await screen.findByText('Claim extraction telemetry was not recorded for this run.')).toBeInTheDocument();
  });

  it('keeps directly opened v9 Run Trace scoped to the new campaign when an old response resolves late', async () => {
    const nextCampaign = { ...campaign, id: 'cmp-new', name: 'New campaign' };
    const oldRun = { ...runs.runs[0], run_id: 'run-old', campaign_id: campaign.id };
    const newRun = { ...runs.runs[0], run_id: 'run-new', campaign_id: nextCampaign.id };
    const oldDetail = {
      ...detailFor('run-a'),
      run_id: 'run-old',
      campaign_id: campaign.id,
      run_summary: { ...detailFor('run-a').run_summary, run_id: 'run-old', campaign_id: campaign.id, answer_preview: 'Answer from old run' },
    };
    const newDetail = {
      ...detailFor('run-b'),
      run_id: 'run-new',
      campaign_id: nextCampaign.id,
      run_summary: { ...detailFor('run-b').run_summary, run_id: 'run-new', campaign_id: nextCampaign.id, answer_preview: 'Answer from new run' },
      agentic_v9: {
        schema_version: '1',
        contract: { route: 'single_lookup', intent: 'new campaign v9 trace' },
        slot_resolutions: [],
        evidence_packets: [],
        context_pack: null,
        final_claims: [],
      },
    };
    let resolveOld!: (value: typeof oldDetail) => void;

    apiMocks.listCampaigns.mockResolvedValue([campaign, nextCampaign]);
    apiMocks.getCampaignResearchSummary.mockImplementation((campaignId: string) => Promise.resolve({
      ...completeFixture,
      campaign_id: campaignId,
    }));
    apiMocks.getCampaignRuns.mockImplementation((campaignId: string) => Promise.resolve({
      campaign_id: campaignId,
      runs: campaignId === campaign.id ? [oldRun] : [newRun],
    }));
    apiMocks.getRunObservability.mockImplementation((_campaignId: string, runId: string) => (
      runId === 'run-old'
        ? new Promise<typeof oldDetail>((resolve) => { resolveOld = resolve; })
        : Promise.resolve(newDetail)
    ));

    renderPage();
    fireEvent.click(await screen.findByRole('tab', { name: 'Run Trace' }));
    await waitFor(() => expect(apiMocks.getRunObservability).toHaveBeenLastCalledWith(campaign.id, 'run-old'));

    fireEvent.change(screen.getByRole('combobox', { name: 'Campaign selector' }), { target: { value: nextCampaign.id } });
    await waitFor(() => expect(apiMocks.getCampaignResearchSummary).toHaveBeenLastCalledWith(nextCampaign.id));
    fireEvent.click(screen.getByRole('tab', { name: 'Run Trace' }));
    await waitFor(() => expect(apiMocks.getRunObservability).toHaveBeenLastCalledWith(nextCampaign.id, 'run-new'));
    expect((await screen.findAllByText('Answer from new run')).length).toBeGreaterThan(0);
    expect(screen.getByTestId('agentic-v9-trace')).toHaveTextContent('v9 schema 1');

    resolveOld(oldDetail);
    await waitFor(() => expect(screen.queryByText('Answer from old run')).not.toBeInTheDocument());
    expect(screen.getAllByText('Answer from new run').length).toBeGreaterThan(0);
  });
});
