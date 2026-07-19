import { ChakraProvider } from '@chakra-ui/react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import theme from '../../theme';
import CampaignOverviewTab from './CampaignOverviewTab';
import { completeFixture, mixedFixture, partialFixture } from './researchSummaryFixtures';

function renderOverview(data: typeof completeFixture) {
  return render(<ChakraProvider theme={theme}><CampaignOverviewTab data={data} /></ChakraProvider>);
}

describe('CampaignOverviewTab strict research accounting', () => {
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
