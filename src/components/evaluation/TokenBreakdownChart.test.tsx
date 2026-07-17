import { ChakraProvider } from '@chakra-ui/react';
import { render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import theme from '../../theme';
import TokenBreakdownChart from './TokenBreakdownChart';
import { completeFixture } from './researchSummaryFixtures';

it('renders non-overlapping token categories with phase attribution and unclassified tokens', () => {
  render(<ChakraProvider theme={theme}><TokenBreakdownChart rows={completeFixture.modes} /></ChakraProvider>);
  expect(screen.getByText('Output text')).toBeInTheDocument();
  expect(screen.getByText('Phase attribution: partial')).toBeInTheDocument();
  expect(screen.getByText('Unclassified: 20')).toBeInTheDocument();
});

it('renders all five categories and evaluation overhead separately', () => {
  render(<ChakraProvider theme={theme}><TokenBreakdownChart rows={completeFixture.modes} evaluationOverhead={completeFixture.evaluation_overhead} /></ChakraProvider>);

  for (const heading of ['Input', 'Output text', 'Reasoning', 'Other', 'Total']) {
    expect(screen.getByText(heading)).toBeInTheDocument();
  }
  expect(screen.getByText('170')).toBeInTheDocument();
  expect(screen.getByText('By phase: execution 150')).toBeInTheDocument();
  expect(screen.getByText('Evaluation overhead (RAGAS)')).toBeInTheDocument();
  expect(screen.getByText('By phase: ragas 35')).toBeInTheDocument();
});

it('renders null token categories as N/A without synthesizing zero', () => {
  const row = {
    ...completeFixture.modes[0],
    tokens: {
      ...completeFixture.modes[0].tokens,
      input_tokens: null,
      output_text_tokens: null,
      reasoning_tokens: null,
      other_tokens: null,
      total_tokens: null,
      by_phase: {},
      accounting_status: 'partial' as const,
    },
  };
  render(<ChakraProvider theme={theme}><TokenBreakdownChart rows={[row]} /></ChakraProvider>);

  expect(screen.getAllByText('N/A')).toHaveLength(5);
  expect(screen.queryByText('0')).not.toBeInTheDocument();
});
