import { ChakraProvider } from '@chakra-ui/react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import theme from '../../theme';
import RouterDecisionCard from './RouterDecisionCard';
import RouterLabTab from './RouterLabTab';

const routerData = {
  analysisType: 'retrospective' as const,
  oracleLabelSource: 'utility_best_mode' as const,
  hasActualRouterRuns: false,
  utilityFormula:
    '0.40 * correctness + 0.25 * faithfulness + 0.20 * relevancy + 0.15 * evidence_coverage - cost_penalty - latency_penalty - unsupported_claim_penalty',
  selectedDecision: {
    selectedMode: 'naive',
    tier: 'fast-lane',
    complexity: 'medium',
    routingReason: 'Evidence need is moderate and router utility penalizes agentic latency.',
  },
  comparisonRows: [
    {
      label: 'Always Naive',
      qualityScore: 0.71,
      avgLatencyMs: 1800,
      tokens: 6200,
      regret: 0.12,
      policyType: 'observed',
    },
    {
      label: 'Always Agentic',
      qualityScore: 0.89,
      avgLatencyMs: 7900,
      tokens: 20640,
      regret: 0,
      policyType: 'observed',
    },
    {
      label: 'Router',
      qualityScore: 0.84,
      avgLatencyMs: 3100,
      tokens: 10120,
      regret: 0.05,
      policyType: 'simulated retrospective policy',
    },
    {
      label: 'Oracle',
      qualityScore: 0.91,
      avgLatencyMs: 3500,
      tokens: 11000,
      regret: 0,
      policyType: 'upper bound',
    },
  ],
  savedTokens: 10520,
  qualityLossVsAgentic: 0.05,
  qualityGainVsNaive: 0.13,
  routerRegret: 0.05,
  confusionMatrix: [
    { expected: 'naive', predicted: 'naive', count: 8 },
    { expected: 'agentic', predicted: 'naive', count: 2 },
  ],
};

function renderWithTheme(node: React.ReactNode) {
  return render(<ChakraProvider theme={theme}>{node}</ChakraProvider>);
}

describe('RouterLabTab', () => {
  it('renders selected mode, utility details, comparison rows, and retrospective notice', () => {
    renderWithTheme(<RouterLabTab data={routerData} />);

    expect(screen.getAllByText('naive').length).toBeGreaterThan(0);
    expect(screen.getByText('fast-lane')).toBeInTheDocument();
    expect(screen.getByText('medium')).toBeInTheDocument();
    expect(screen.getByText('Evidence need is moderate and router utility penalizes agentic latency.')).toBeInTheDocument();
    expect(screen.getByText('retrospective')).toBeInTheDocument();
    expect(screen.getAllByText('N/A').length).toBeGreaterThan(0);
    expect(screen.queryByText('Cost')).not.toBeInTheDocument();
    expect(screen.getAllByText('Router').length).toBeGreaterThan(0);
    expect(screen.getByText('Retrospective analysis only: no actual router runs in this campaign.')).toBeInTheDocument();
    expect(screen.getByText('utility_best_mode')).toBeInTheDocument();
  });
});

describe('RouterDecisionCard', () => {
  it('renders router decision details', () => {
    renderWithTheme(<RouterDecisionCard decision={routerData.selectedDecision} analysisType="retrospective" />);

    expect(screen.getByText('Selected Mode')).toBeInTheDocument();
    expect(screen.getByText('Tier')).toBeInTheDocument();
    expect(screen.getByText('Complexity')).toBeInTheDocument();
    expect(screen.getByText('Routing Reason')).toBeInTheDocument();
  });
});
