import { ChakraProvider } from '@chakra-ui/react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import theme from '../../theme';
import { exportCampaignAnalysis } from '../../services/evaluationApi';
import type { ExportCampaignResponse } from '../../types/evaluation';
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

function exportV2(
  options: Partial<ExportCampaignResponse['export_metadata']['options']> = {},
  overrides: Partial<Pick<ExportCampaignResponse, 'runs'>> = {}
): ExportCampaignResponse {
  const includeRunObservability = options.include_run_observability ?? false;
  return {
    schema_version: '2.0',
    export_metadata: {
      exported_at: '2026-08-13T00:00:00Z',
      options: {
        include_run_observability: includeRunObservability,
        include_raw_trace_payloads: options.include_raw_trace_payloads ?? false,
        include_prompt_previews: options.include_prompt_previews ?? true,
        include_full_prompts: options.include_full_prompts ?? false,
        include_answers: options.include_answers ?? true,
        include_retrieved_excerpts: options.include_retrieved_excerpts ?? true,
        format: 'json',
      },
      redaction: { provider_errors: 'excluded', stack_traces: 'excluded', credentials: 'redacted' },
      availability_warnings: ['authoritative warning'],
    },
    campaign: {
      id: 'cmp-1', name: 'Campaign', status: 'completed', benchmark_id: 'benchmark-1',
      modes: ['agentic-v9'], repeat_count: 1,
      created_at: '2026-08-13T00:00:00Z', updated_at: '2026-08-13T00:00:00Z',
    },
    sections: {
      overview: { availability: { status: 'not_available', reasons: ['summary unavailable'] }, data: null },
      question_analysis: { availability: { status: 'not_available', reasons: [] }, data: null },
      agent_behavior: { availability: { status: 'not_available', reasons: [] }, data: null },
      router_analysis: { availability: { status: 'not_available', reasons: [] }, data: null },
      ablation: { availability: { status: 'not_available', reasons: [] }, data: null },
      human_evaluation: { availability: { status: 'not_available', reasons: [] }, data: null },
      diagnostics: { availability: { status: 'partial', reasons: ['diagnostics partial'] }, data: null },
    },
    runs: overrides.runs ?? [],
  };
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

  it('offers run observability as a larger-file option that is off by default', () => {
    renderWithTheme(<AblationDashboardTab campaignId="cmp-1" data={dashboardData} />);

    const observability = screen.getByRole('checkbox', { name: 'Include all run observability' });
    expect(observability).not.toBeChecked();
    expect(screen.getByText('Larger file')).toBeInTheDocument();

    const fullPrompts = screen.getByRole('checkbox', { name: 'Full prompts' });
    expect(fullPrompts).not.toBeChecked();
    fireEvent.click(fullPrompts);
    expect(fullPrompts).toBeChecked();
  });

  it('sends include_run_observability false by default and previews only authoritative v2 fields', async () => {
    vi.mocked(exportCampaignAnalysis).mockResolvedValue(exportV2());
    vi.stubGlobal('URL', {
      createObjectURL: vi.fn(() => 'blob:campaign-export'),
      revokeObjectURL: vi.fn(),
    });
    const anchorClick = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
    renderWithTheme(<AblationDashboardTab campaignId="cmp-1" data={dashboardData} />);

    fireEvent.click(screen.getByRole('button', { name: 'Export redacted JSON' }));

    await waitFor(() => {
      expect(exportCampaignAnalysis).toHaveBeenCalledWith('cmp-1', {
        include_run_observability: false,
        include_raw_trace_payloads: false,
        include_prompt_previews: true,
        include_full_prompts: false,
        include_answers: true,
        include_retrieved_excerpts: true,
        format: 'json',
      });
    });
    expect(await screen.findByText('Preview: 0 runs')).toBeInTheDocument();
    expect(screen.queryByText(/0 LLM calls/)).not.toBeInTheDocument();
    expect(screen.getByText('authoritative warning')).toBeInTheDocument();
    expect(screen.getByText(/diagnostics: partial/)).toBeInTheDocument();
    expect(screen.getByText(/full prompts redacted/)).toBeInTheDocument();
    expect(anchorClick).toHaveBeenCalledOnce();
  });

  it.each([
    [false, false, 'cmp-1-summary-redacted-v2.json'],
    [true, false, 'cmp-1-observability-redacted-v2.json'],
    [false, true, 'cmp-1-summary-custom-v2.json'],
    [true, true, 'cmp-1-observability-custom-v2.json'],
  ])('downloads the exact v2 filename for observability=%s custom=%s', async (observability, custom, filename) => {
    vi.mocked(exportCampaignAnalysis).mockResolvedValue(exportV2({
      include_run_observability: observability,
      include_full_prompts: custom,
    }));
    const revokeObjectURL = vi.fn();
    vi.stubGlobal('URL', { createObjectURL: vi.fn(() => 'blob:campaign-export'), revokeObjectURL });
    let downloaded = '';
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      downloaded = this.download;
    });
    renderWithTheme(<AblationDashboardTab campaignId="cmp-1" data={dashboardData} />);
    if (observability) fireEvent.click(screen.getByRole('checkbox', { name: 'Include all run observability' }));
    if (custom) fireEvent.click(screen.getByRole('checkbox', { name: 'Full prompts' }));
    fireEvent.click(screen.getByRole('button', { name: 'Export redacted JSON' }));
    await waitFor(() => expect(downloaded).toBe(filename));
  });

  it('uses custom filename when raw trace payloads are requested', async () => {
    vi.mocked(exportCampaignAnalysis).mockResolvedValue(exportV2({ include_raw_trace_payloads: true }));
    vi.stubGlobal('URL', { createObjectURL: vi.fn(() => 'blob:campaign-export'), revokeObjectURL: vi.fn() });
    let downloaded = '';
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) { downloaded = this.download; });
    renderWithTheme(<AblationDashboardTab campaignId="cmp-1" data={dashboardData} />);
    fireEvent.click(screen.getByRole('checkbox', { name: 'Raw trace payloads' }));
    fireEvent.click(screen.getByRole('button', { name: 'Export redacted JSON' }));
    await waitFor(() => expect(downloaded).toBe('cmp-1-summary-custom-v2.json'));
  });

  it('disables every export control while pending and one click creates one request and download', async () => {
    let resolveExport!: (value: ExportCampaignResponse) => void;
    vi.mocked(exportCampaignAnalysis).mockReturnValue(new Promise((resolve) => { resolveExport = resolve; }));
    const revokeObjectURL = vi.fn();
    vi.stubGlobal('URL', { createObjectURL: vi.fn(() => 'blob:campaign-export'), revokeObjectURL });
    const anchorClick = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
    renderWithTheme(<AblationDashboardTab campaignId="cmp-1" data={dashboardData} />);
    const button = screen.getByRole('button', { name: 'Export redacted JSON' });
    fireEvent.click(button);
    fireEvent.click(button);
    expect(button).toBeDisabled();
    for (const checkbox of screen.getAllByRole('checkbox')) expect(checkbox).toBeDisabled();
    expect(exportCampaignAnalysis).toHaveBeenCalledOnce();
    resolveExport(exportV2());
    await waitFor(() => expect(anchorClick).toHaveBeenCalledOnce());
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:campaign-export');
  });

  it('on rejection creates no download, preserves prior preview, and restores controls', async () => {
    vi.mocked(exportCampaignAnalysis).mockResolvedValueOnce(exportV2()).mockRejectedValueOnce(new Error('Invalid export response.'));
    vi.stubGlobal('URL', { createObjectURL: vi.fn(() => 'blob:campaign-export'), revokeObjectURL: vi.fn() });
    const anchorClick = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
    const onExportError = vi.fn();
    renderWithTheme(<AblationDashboardTab campaignId="cmp-1" data={dashboardData} onExportError={onExportError} />);
    const button = screen.getByRole('button', { name: 'Export redacted JSON' });
    fireEvent.click(button);
    expect(await screen.findByText('Preview: 0 runs')).toBeInTheDocument();
    fireEvent.click(button);
    await waitFor(() => expect(onExportError).toHaveBeenCalledWith('Invalid export response.'));
    expect(screen.getByText('Preview: 0 runs')).toBeInTheDocument();
    expect(button).not.toBeDisabled();
    expect(anchorClick).toHaveBeenCalledOnce();
  });

  it('clears a prior export preview when the selected campaign changes', async () => {
    vi.mocked(exportCampaignAnalysis).mockResolvedValue(exportV2());
    vi.stubGlobal('URL', {
      createObjectURL: vi.fn(() => 'blob:campaign-export'),
      revokeObjectURL: vi.fn(),
    });
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
    const rendered = renderWithTheme(<AblationDashboardTab campaignId="cmp-1" data={dashboardData} />);

    fireEvent.click(screen.getByRole('button', { name: 'Export redacted JSON' }));
    expect(await screen.findByText('Preview: 0 runs')).toBeInTheDocument();

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
    resolveExport!(exportV2());

    await waitFor(() => expect(exportCampaignAnalysis).toHaveBeenCalledOnce());
    expect(screen.getByText('Preview: not generated')).toBeInTheDocument();
    expect(anchorClick).not.toHaveBeenCalled();
  });
});
