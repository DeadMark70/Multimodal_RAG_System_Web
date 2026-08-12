import { ChakraProvider } from '@chakra-ui/react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import theme from '../../theme';
import { exportCampaignAnalysis } from '../../services/evaluationApi';
import AblationDashboardTab from './AblationDashboardTab';

vi.mock('../../services/evaluationApi', () => ({
  exportCampaignAnalysis: vi.fn(),
}));

const dashboardData: NonNullable<Parameters<typeof AblationDashboardTab>[0]['data']> = {
  ablation: {
    campaign_id: 'cmp-1',
    analysis_unit: 'execution',
    sample_count: 4,
    independent_question_count: 1,
    repeat_count: 2,
    sample_note: 'n = 4 execution samples',
    warnings: [],
    rows: [],
    summaries: {
      condition_counts: {
        text_only: 2,
        visual_verifier: 2,
      },
      condition_labels: {
        text_only: 'Text only',
        visual_verifier: 'Visual + verifier',
      },
    },
  },
  humanVsAuto: {
    campaign_id: 'cmp-1',
    analysis_unit: 'execution',
    sample_count: 1,
    independent_question_count: 1,
    repeat_count: 1,
    sample_note: 'n = 1 execution samples',
    warnings: ['Correlation summaries require at least 2 paired samples.'],
    rows: [{ run_id: 'run-1' }],
    summaries: {
      human_correctness_mean: 0.91,
      human_faithfulness_mean: 0.82,
      ragas_human_pearson_r: null,
    },
  },
  humanQueue: {
    campaign_id: 'cmp-1',
    rows: [
      {
        run_id: 'run-1',
        campaign_id: 'cmp-1',
        question_id: 'Q1',
        question: 'What supports the answer?',
        mode: 'agentic',
        run_number: 1,
        answer_preview: 'Grounded answer',
        existing_rating_count: 1,
        already_rated_by_current_user: true,
      },
    ],
  },
  errors: {
    campaign_id: 'cmp-1',
    rows: [
      {
        run_id: 'run-1',
        campaign_id: 'cmp-1',
        stage_name: 'answer_generation',
        code: 'LLM_CALL_FAILED',
        message: 'Provider error details were redacted.',
        source: 'llm_call',
        created_at: '2026-07-08T00:00:00Z',
      },
    ],
  },
  stageWarnings: {
    campaign_id: 'cmp-1',
    rows: [
      {
        run_id: 'run-1',
        campaign_id: 'cmp-1',
        question_id: 'Q1',
        mode: 'agentic',
        stage_name: 'agentic_v9_graph_locator',
        status: 'partial',
        failure_reason: 'graph_capability_not_available',
        created_at: '2026-07-08T00:00:00Z',
      },
    ],
  },
};

const conditionDashboardData: NonNullable<Parameters<typeof AblationDashboardTab>[0]['data']> = {
  ...dashboardData,
  ablation: {
    ...dashboardData.ablation!,
    summaries: {
      ...dashboardData.ablation?.summaries,
      condition_comparison: {
        conditions: {
          'v9-baseline': {
            condition_id: 'v9-baseline',
            label: 'Requirement guidance off',
            ablation_flags: { requirement_guidance: false },
            execution_count: 2,
            completed_count: 1,
            failed_count: 1,
            quality: {
              answer_correctness: { mean: 0.6, valid_count: 1, missing_count: 1 },
              faithfulness: { mean: null, valid_count: 0, missing_count: 2 },
              answer_relevancy: { mean: 0.7, valid_count: 1, missing_count: 1 },
            },
            mean_tokens: 100,
            mean_latency_ms: 10,
          },
          'v9-guided': {
            condition_id: 'v9-guided',
            label: 'Requirement guidance on',
            ablation_flags: { requirement_guidance: true },
            execution_count: 2,
            completed_count: 2,
            failed_count: 0,
            quality: {
              answer_correctness: { mean: 0.8, valid_count: 2, missing_count: 0 },
              faithfulness: { mean: null, valid_count: 0, missing_count: 2 },
              answer_relevancy: { mean: 0.9, valid_count: 2, missing_count: 0 },
            },
            mean_tokens: 120,
            mean_latency_ms: 20,
          },
        },
        paired: {
          baseline_condition_id: 'v9-baseline',
          guided_condition_id: 'v9-guided',
          completed_pair_count: 1,
          metric_pair_counts: {
            answer_correctness: 1,
            faithfulness: 0,
            answer_relevancy: 1,
          },
          delta: {
            answer_correctness: { mean: 0.2, valid_count: 1, missing_count: 0 },
            faithfulness: { mean: null, valid_count: 0, missing_count: 1 },
            answer_relevancy: { mean: 0.2, valid_count: 1, missing_count: 0 },
          },
          excluded_pairs: { run_not_completed: 1 },
        },
        availability: {
          ragas_rows_found: true,
          valid_metric_row_count: 6,
          warning: null,
        },
      },
    },
  },
};

function renderWithTheme(node: React.ReactNode) {
  return render(<ChakraProvider theme={theme}>{node}</ChakraProvider>);
}

describe('AblationDashboardTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('renders ablation, human calibration, export, and debug surfaces', () => {
    renderWithTheme(<AblationDashboardTab campaignId="cmp-1" data={dashboardData} />);

    expect(screen.getByText('Ablation Conditions')).toBeInTheDocument();
    expect(screen.getByText('Graph Ablation Families')).toBeInTheDocument();
    expect(screen.getByText('text_only')).toBeInTheDocument();
    expect(screen.getByText('Visual + verifier')).toBeInTheDocument();
    expect(screen.getByText('Human Calibration')).toBeInTheDocument();
    expect(screen.getAllByText('run-1').length).toBeGreaterThan(0);
    expect(screen.getByText('rated')).toBeInTheDocument();
    expect(screen.getByText('Export Controls')).toBeInTheDocument();
    expect(screen.getByText('Preview: not generated')).toBeInTheDocument();
    expect(screen.getByText('Stage Warnings / Capability Gaps')).toBeInTheDocument();
    expect(screen.getByText('graph_capability_not_available')).toBeInTheDocument();
    expect(screen.getByText('Sanitized Errors')).toBeInTheDocument();
    expect(screen.getByText('Provider error details were redacted.')).toBeInTheDocument();
  });

  it('renders condition quality metrics, paired deltas, and N/A for missing scores', () => {
    renderWithTheme(<AblationDashboardTab campaignId="cmp-1" data={conditionDashboardData} />);

    expect(screen.getByText('Condition Metrics')).toBeInTheDocument();
    expect(screen.getByText('Requirement guidance on')).toBeInTheDocument();
    expect(screen.getByText('Paired Delta (guided - baseline)')).toBeInTheDocument();
    expect(screen.getAllByText('N/A').length).toBeGreaterThan(0);
    expect(screen.getByText('0.80')).toBeInTheDocument();
    expect(screen.getByText('run_not_completed: 1')).toBeInTheDocument();
  });

  it('preserves missing counts as N/A while retaining a reported zero failed count', () => {
    const dataWithUnknownCounts = {
      ...conditionDashboardData,
      ablation: {
        ...conditionDashboardData.ablation!,
        sample_count: null,
        summaries: {
          ...conditionDashboardData.ablation!.summaries,
          condition_counts: { text_only: null },
          condition_labels: { text_only: 'Text only' },
        },
      },
    } as unknown as NonNullable<Parameters<typeof AblationDashboardTab>[0]['data']>;

    renderWithTheme(<AblationDashboardTab campaignId="cmp-1" data={dataWithUnknownCounts} />);

    const samplesCard = screen.getAllByText('Samples')[0].closest('.chakra-stat');
    expect(samplesCard).not.toBeNull();
    expect(within(samplesCard as HTMLElement).getByText('N/A')).toBeInTheDocument();

    const conditionRow = screen.getByText('Text only').closest('tr');
    expect(conditionRow).not.toBeNull();
    expect(within(conditionRow as HTMLElement).getByText('N/A')).toBeInTheDocument();

    const failedCard = screen.getByText('Requirement guidance on').closest('tr');
    expect(failedCard).not.toBeNull();
    expect(within(failedCard as HTMLElement).getByText('0')).toBeInTheDocument();
  });

  it('allows export redaction options to be toggled locally', () => {
    renderWithTheme(<AblationDashboardTab campaignId="cmp-1" data={dashboardData} />);

    const fullPrompts = screen.getByRole('checkbox', { name: 'Full prompts' });
    expect(fullPrompts).not.toBeChecked();
    fireEvent.click(fullPrompts);
    expect(fullPrompts).toBeChecked();
  });

  it('exports the selected redaction options and previews the returned export', async () => {
    vi.mocked(exportCampaignAnalysis).mockResolvedValue({
      campaign: { id: 'cmp-1' },
      redaction: { include_full_prompts: false },
      runs: [{ run_id: 'run-1' }, { run_id: 'run-2' }],
      llm_calls: [{ llm_call_id: 'call-1' }],
    });
    vi.stubGlobal('URL', {
      createObjectURL: vi.fn(() => 'blob:campaign-export'),
      revokeObjectURL: vi.fn(),
    });
    const anchorClick = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
    renderWithTheme(<AblationDashboardTab campaignId="cmp-1" data={dashboardData} />);

    fireEvent.click(screen.getByRole('button', { name: 'Export redacted JSON' }));

    await waitFor(() => {
      expect(exportCampaignAnalysis).toHaveBeenCalledWith('cmp-1', {
        include_raw_trace_payloads: false,
        include_prompt_previews: true,
        include_full_prompts: false,
        include_answers: true,
        include_retrieved_excerpts: true,
        format: 'json',
      });
    });
    expect(await screen.findByText('Preview: 2 runs, 1 LLM calls')).toBeInTheDocument();
    expect(anchorClick).toHaveBeenCalledOnce();
  });

  it('reports execution-time prompt availability rather than implying export can recover uncaptured full prompts', async () => {
    vi.mocked(exportCampaignAnalysis).mockResolvedValue({
      campaign: { id: 'cmp-1' },
      redaction: { include_full_prompts: true },
      summary: {
        run_count: 2,
        llm_call_count: 3,
        per_phase_counts: { final_generation: 2 },
        full_prompt_availability: { not_captured_at_execution: 3 },
      },
      availability_warnings: [],
      runs: [],
      llm_calls: [],
    });
    vi.stubGlobal('URL', {
      createObjectURL: vi.fn(() => 'blob:campaign-export'),
      revokeObjectURL: vi.fn(),
    });
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
    renderWithTheme(<AblationDashboardTab campaignId="cmp-1" data={dashboardData} />);

    fireEvent.click(screen.getByRole('checkbox', { name: 'Full prompts' }));
    fireEvent.click(screen.getByRole('button', { name: 'Export redacted JSON' }));

    expect(await screen.findByText('Preview: 2 runs, 3 LLM calls')).toBeInTheDocument();
    expect(screen.getByText('final_generation: 2')).toBeInTheDocument();
    expect(screen.getByText('full_prompts_not_captured_at_execution')).toBeInTheDocument();
  });

  it('renders every returned prompt-capture availability map without rendering prompt content', async () => {
    vi.mocked(exportCampaignAnalysis).mockResolvedValue({
      campaign: { id: 'cmp-1' }, redaction: {}, runs: [], llm_calls: [],
      summary: {
        run_count: 1, llm_call_count: 2,
        prompt_hash_availability: { captured: 2 },
        prompt_preview_availability: { captured: 1, not_captured_at_execution: 1 },
        full_prompt_availability: { not_captured_at_execution: 2 },
      },
    });
    vi.stubGlobal('URL', { createObjectURL: vi.fn(() => 'blob:campaign-export'), revokeObjectURL: vi.fn() });
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
    renderWithTheme(<AblationDashboardTab campaignId="cmp-1" data={dashboardData} />);

    fireEvent.click(screen.getByRole('button', { name: 'Export redacted JSON' }));

    expect(await screen.findByText('Prompt hash availability: captured: 2')).toBeInTheDocument();
    expect(screen.getByText('Prompt preview availability: captured: 1 · not_captured_at_execution: 1')).toBeInTheDocument();
    expect(screen.getByText('Full prompt availability: not_captured_at_execution: 2')).toBeInTheDocument();
  });

  it('clears a prior export preview when the selected campaign changes', async () => {
    vi.mocked(exportCampaignAnalysis).mockResolvedValue({
      campaign: { id: 'cmp-1' },
      redaction: { include_full_prompts: false },
      runs: [{ run_id: 'run-1' }],
      llm_calls: [],
    });
    vi.stubGlobal('URL', {
      createObjectURL: vi.fn(() => 'blob:campaign-export'),
      revokeObjectURL: vi.fn(),
    });
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
    const rendered = renderWithTheme(<AblationDashboardTab campaignId="cmp-1" data={dashboardData} />);

    fireEvent.click(screen.getByRole('button', { name: 'Export redacted JSON' }));
    expect(await screen.findByText('Preview: 1 runs, 0 LLM calls')).toBeInTheDocument();

    rendered.rerender(
      <ChakraProvider theme={theme}>
        <AblationDashboardTab campaignId="cmp-2" data={dashboardData} />
      </ChakraProvider>
    );

    expect(screen.getByText('Preview: not generated')).toBeInTheDocument();
  });

  it('ignores an export response that resolves after switching campaigns', async () => {
    let resolveExport: (value: Awaited<ReturnType<typeof exportCampaignAnalysis>>) => void;
    vi.mocked(exportCampaignAnalysis).mockReturnValue(
      new Promise((resolve) => {
        resolveExport = resolve;
      })
    );
    vi.stubGlobal('URL', {
      createObjectURL: vi.fn(() => 'blob:campaign-export'),
      revokeObjectURL: vi.fn(),
    });
    const anchorClick = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
    const rendered = renderWithTheme(<AblationDashboardTab campaignId="cmp-1" data={dashboardData} />);

    fireEvent.click(screen.getByRole('button', { name: 'Export redacted JSON' }));
    rendered.rerender(
      <ChakraProvider theme={theme}>
        <AblationDashboardTab campaignId="cmp-2" data={dashboardData} />
      </ChakraProvider>
    );
    resolveExport!({
      campaign: { id: 'cmp-1' },
      redaction: { include_full_prompts: false },
      runs: [{ run_id: 'run-1' }],
      llm_calls: [],
    });

    await waitFor(() => expect(exportCampaignAnalysis).toHaveBeenCalledOnce());
    expect(screen.getByText('Preview: not generated')).toBeInTheDocument();
    expect(anchorClick).not.toHaveBeenCalled();
  });
});
