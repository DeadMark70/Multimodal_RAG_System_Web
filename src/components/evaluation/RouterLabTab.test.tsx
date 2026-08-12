import { ChakraProvider } from '@chakra-ui/react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import theme from '../../theme';
import RouterDecisionCard from './RouterDecisionCard';
import RouterLabTab from './RouterLabTab';

const routerData = {
  analysisType: 'retrospective' as const,
  decisions: [{
    routingDecisionId: 'routing-7',
    runId: 'run-7',
    campaignId: 'cmp-1',
    questionId: 'Q-7',
    repeat: 2,
    spanId: null,
    selectedMode: 'graph',
    decisionSource: 'deterministic' as const,
    candidateRoutes: ['graph'],
    matchedRules: ['graph-required'],
    fallbackReason: null,
    confidence: 1,
    reason: 'The question requires graph retrieval.',
    createdAt: '2026-08-13T00:00:00Z',
  }],
};

function renderWithTheme(node: React.ReactNode) {
  return render(<ChakraProvider theme={theme}>{node}</ChakraProvider>);
}

describe('RouterLabTab', () => {
  it('renders only recorded retrospective fields and no fabricated router analysis', () => {
    renderWithTheme(<RouterLabTab data={routerData} />);

    expect(screen.getByText('graph')).toBeInTheDocument();
    expect(screen.getByText('Q-7 · run-7 · repeat 2')).toBeInTheDocument();
    expect(screen.getByText('The question requires graph retrieval.')).toBeInTheDocument();
    expect(screen.getByText('graph-required')).toBeInTheDocument();
    expect(screen.getByText('retrospective')).toBeInTheDocument();
    for (const unsupportedLabel of [
      'Tier', 'Complexity', 'Saved Tokens', 'Quality Loss vs Agentic',
      'Quality Gain vs Naive', 'Latency', 'Tokens', 'Regret',
      'Utility Formula', 'Oracle', 'Router Confusion Matrix',
    ]) {
      expect(screen.queryByText(unsupportedLabel, { exact: false })).not.toBeInTheDocument();
    }
    expect(screen.queryByText('N/A')).not.toBeInTheDocument();
  });

  it('renders the execution route while omitting unavailable provenance placeholders', () => {
    renderWithTheme(<RouterLabTab
      data={routerData}
      executionRoute={{
        route: 'visual', decisionSource: null, routeReason: null,
        matchedRules: [], candidateRoutes: [], fallbackReason: null,
      }}
    />);

    expect(screen.getByText('Execution Route')).toBeInTheDocument();
    expect(screen.getByText('Route: visual')).toBeInTheDocument();
    expect(screen.queryByText(/Decision source:/)).not.toBeInTheDocument();
    expect(screen.queryByText('N/A')).not.toBeInTheDocument();
  });
});

describe('RouterDecisionCard', () => {
  it('renders recorded router decision details without fabricated classifications', () => {
    renderWithTheme(<RouterDecisionCard decision={routerData.decisions[0]} />);

    expect(screen.getByText('Retrospective selected mode')).toBeInTheDocument();
    expect(screen.getByText('Decision source')).toBeInTheDocument();
    expect(screen.getByText('Matched rules')).toBeInTheDocument();
    expect(screen.getByText('Reason')).toBeInTheDocument();
    expect(screen.queryByText('Tier')).not.toBeInTheDocument();
    expect(screen.queryByText('Complexity')).not.toBeInTheDocument();
  });
});
