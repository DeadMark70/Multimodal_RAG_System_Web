import { ChakraProvider } from '@chakra-ui/react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import theme from '../../theme';
import CampaignOverviewTab from './CampaignOverviewTab';
import CostQualityScatter from './CostQualityScatter';
import LatencyWaterfall from './LatencyWaterfall';
import MetricCard from './MetricCard';
import ModeComparisonChart from './ModeComparisonChart';
import TokenBreakdownChart from './TokenBreakdownChart';

const overviewData = {
  summary: {
    completedRuns: 18,
    totalRuns: 20,
    avgCorrectness: 0.81,
    avgFaithfulness: 0.76,
    avgRelevancy: 0.79,
    avgTokens: 13420,
    avgCostUsd: 0.18,
    avgLatencyMs: 4820,
    errorRate: 0.1,
  },
  modes: [
    {
      mode: 'naive',
      correctness: 0.68,
      faithfulness: 0.7,
      relevancy: 0.72,
      runs: 10,
      avgCostUsd: 0.04,
      avgLatencyMs: 1800,
    },
    {
      mode: 'agentic',
      correctness: 0.9,
      faithfulness: 0.82,
      relevancy: 0.86,
      runs: 10,
      avgCostUsd: 0.32,
      avgLatencyMs: 7900,
    },
  ],
  costQuality: [
    { mode: 'naive', correctness: 0.68, faithfulness: 0.7, costUsd: 0.04, tokens: 6200 },
    { mode: 'agentic', correctness: 0.9, faithfulness: 0.82, costUsd: 0.32, tokens: 20640 },
  ],
  latency: [
    { stage: 'routing', p50Ms: 120, p95Ms: 210 },
    { stage: 'retrieval', p50Ms: 480, p95Ms: 990 },
    { stage: 'generation', p50Ms: 2200, p95Ms: 4100 },
  ],
  tokens: [
    {
      mode: 'naive',
      promptTokens: 2100,
      completionTokens: 900,
      retrievalTokens: 1200,
      reasoningTokens: 0,
    },
    {
      mode: 'agentic',
      promptTokens: 4800,
      completionTokens: 2200,
      retrievalTokens: 4100,
      reasoningTokens: 3300,
    },
  ],
};

function renderWithTheme(node: React.ReactNode) {
  return render(<ChakraProvider theme={theme}>{node}</ChakraProvider>);
}

describe('CampaignOverviewTab', () => {
  it('renders campaign KPIs and compact chart sections', () => {
    renderWithTheme(<CampaignOverviewTab data={overviewData} />);

    expect(screen.getByText('18 / 20')).toBeInTheDocument();
    expect(screen.getByText('81.0%')).toBeInTheDocument();
    expect(screen.getByText('76.0%')).toBeInTheDocument();
    expect(screen.getByText('79.0%')).toBeInTheDocument();
    expect(screen.getByText('13,420')).toBeInTheDocument();
    expect(screen.getByText('$0.18')).toBeInTheDocument();
    expect(screen.getByText('4,820 ms')).toBeInTheDocument();
    expect(screen.getByText('10.0%')).toBeInTheDocument();
    expect(screen.getByText('Mode Comparison')).toBeInTheDocument();
    expect(screen.getByText('Cost vs Quality')).toBeInTheDocument();
    expect(screen.getByText('Latency Waterfall')).toBeInTheDocument();
    expect(screen.getByText('Token Breakdown')).toBeInTheDocument();
    expect(screen.getAllByText('agentic').length).toBeGreaterThan(0);
  });

  it('shows concise empty states when detail sections are missing', () => {
    renderWithTheme(
      <CampaignOverviewTab
        data={{
          summary: overviewData.summary,
          modes: [],
          costQuality: [],
          latency: [],
          tokens: [],
        }}
      />
    );

    expect(screen.getByText('No mode comparison data for this campaign yet.')).toBeInTheDocument();
    expect(screen.getByText('No cost-quality rows are available for this campaign yet.')).toBeInTheDocument();
    expect(screen.getByText('No latency stage breakdown is available yet.')).toBeInTheDocument();
    expect(screen.getByText('No token breakdown is available yet.')).toBeInTheDocument();
  });
});

describe('Campaign overview subcomponents', () => {
  it('renders a metric card with helper text', () => {
    renderWithTheme(<MetricCard label="Average Cost" value="$0.18" helper="Across completed runs" />);

    expect(screen.getByText('Average Cost')).toBeInTheDocument();
    expect(screen.getByText('$0.18')).toBeInTheDocument();
    expect(screen.getByText('Across completed runs')).toBeInTheDocument();
  });

  it('renders comparison, scatter, latency, and token tables', () => {
    renderWithTheme(
      <>
        <ModeComparisonChart rows={overviewData.modes} />
        <CostQualityScatter points={overviewData.costQuality} />
        <LatencyWaterfall stages={overviewData.latency} />
        <TokenBreakdownChart rows={overviewData.tokens} />
      </>
    );

    expect(screen.getByText('Correctness')).toBeInTheDocument();
    expect(screen.getByText('Faithfulness')).toBeInTheDocument();
    expect(screen.getByText('Quality Mix')).toBeInTheDocument();
    expect(screen.getByText('P95')).toBeInTheDocument();
    expect(screen.getByText('Reasoning')).toBeInTheDocument();
  });
});
