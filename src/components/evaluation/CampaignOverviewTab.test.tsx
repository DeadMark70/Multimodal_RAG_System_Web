import { ChakraProvider } from '@chakra-ui/react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import theme from '../../theme';
import type { ReleaseMetricsReport } from '../../types/evaluation';
import CampaignOverviewTab from './CampaignOverviewTab';
import { completeFixture, mixedFixture, partialFixture } from './researchSummaryFixtures';

function renderOverview(data: typeof completeFixture, releaseMetrics?: ReleaseMetricsReport) {
  return render(<ChakraProvider theme={theme}><CampaignOverviewTab data={data} releaseMetrics={releaseMetrics} /></ChakraProvider>);
}

const smokeReleaseFixture: ReleaseMetricsReport = {
  benchmark_id: 'smoke-1', benchmark_kind: 'smoke', comparable: true, gate_reasons: [], manifest: { kind: 'smoke' },
  arms: [{ mode: 'agentic', condition_id: 'agentic-v9-official', execution_profile: 'agentic_eval_v9', agentic_execution_version: 'v9', shadow_evaluation_policy: null, response_status_counts: { complete: 3 }, run_count: 3, complete_run_count: 3, accounting_complete_run_count: 3 }],
  required_slot_coverage: { value: 1, reason: null }, important_unsupported_claim_rate: { value: 0, reason: null }, provenance_failure_rate: { value: 0, reason: null }, pack_efficiency: { value: 0.75, reason: null },
  graph_locator_success: { value: null, reason: 'graph_not_instrumented' }, graph_locator_fallback: { value: null, reason: 'graph_not_instrumented' }, final_generation_count: { value: 1, reason: null }, latency_p95_ms: { value: 1200, reason: null }, token_ratio: { value: 2.2, reason: null },
  paired_quality_delta: { value: 0.04, reason: null }, paired_quality_ci_lower: { value: -0.01, reason: null }, paired_quality_ci_upper: { value: 0.08, reason: null },
  category_quality_deltas: { retrieval: { value: 0.04, reason: null } }, per_question_quality_deltas: { Q9: { value: 0.04, reason: null } },
  statistics: { method: 'paired_question_cluster_bootstrap', token_ratio_method: 'ratio_of_summed_official_runtime_tokens' },
};

describe('CampaignOverviewTab strict research accounting', () => {
  it('renders backend-authoritative smoke metrics without inventing unavailable Graph values', () => {
    renderOverview(completeFixture, smokeReleaseFixture);

    expect(screen.getByRole('heading', { name: 'Release Metrics' })).toBeInTheDocument();
    expect(screen.getByText('Smoke')).toBeInTheDocument();
    expect(screen.getByText('agentic · agentic-v9-official · agentic_eval_v9 · v9')).toBeInTheDocument();
    expect(screen.getAllByText('N/A — graph_not_instrumented')).toHaveLength(2);
    expect(screen.getByText(/clustered by question/)).toBeInTheDocument();
    expect(screen.queryByText('$0.000')).not.toBeInTheDocument();
  });

  it('renders missing RAGAS without requiring monetary pricing', () => {
    renderOverview(partialFixture);
    expect(screen.getAllByText('N/A').length).toBeGreaterThan(0);
    expect(screen.getByText(/Token accounting is partial/)).toBeInTheDocument();
    expect(screen.queryByText('Pricing: unknown')).not.toBeInTheDocument();
    expect(screen.queryByText('Benchmark Cost')).not.toBeInTheDocument();
  });

  it('shows measured percentiles and low sample warning', () => {
    renderOverview(completeFixture);
    expect(screen.getByText('3,900 ms')).toBeInTheDocument();
    expect(screen.getByText('7,100 ms')).toBeInTheDocument();
    expect(screen.getAllByText(/Low sample size/).length).toBeGreaterThan(0);
  });

  it('renders token-quality rows when monetary pricing is unavailable', () => {
    const tokenOnly = {
      ...mixedFixture,
      modes: [{
        ...mixedFixture.modes[0],
        mode: 'graph',
        execution_cost: { ...mixedFixture.modes[0].execution_cost, benchmark_usd: null, operational_usd: null, pricing_status: 'unknown' as const },
      }],
    };
    renderOverview(tokenOnly);
    expect(screen.getByTestId('token-quality-graph')).toBeInTheDocument();
    expect(screen.queryByText(/unknown pricing/)).not.toBeInTheDocument();
  });
});
