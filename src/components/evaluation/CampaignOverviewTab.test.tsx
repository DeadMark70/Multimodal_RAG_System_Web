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
  it('renders missing RAGAS and unknown price without synthetic zero', () => {
    renderOverview(partialFixture);
    expect(screen.getAllByText('N/A').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Unknown').length).toBeGreaterThan(0);
    expect(screen.queryByText('$0.00')).not.toBeInTheDocument();
  });

  it('shows measured percentiles and low sample warning', () => {
    renderOverview(completeFixture);
    expect(screen.getByText('3,900 ms')).toBeInTheDocument();
    expect(screen.getByText('7,100 ms')).toBeInTheDocument();
    expect(screen.getAllByText(/Low sample size/).length).toBeGreaterThan(0);
  });

  it('excludes non-comparable modes from cost quality rows', () => {
    renderOverview(mixedFixture);
    expect(screen.getByTestId('cost-quality-agentic')).toBeInTheDocument();
    expect(screen.queryByTestId('cost-quality-graph')).not.toBeInTheDocument();
    expect(screen.getByText(/graph: unknown pricing/)).toBeInTheDocument();
  });
});
