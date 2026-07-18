import { ChakraProvider } from '@chakra-ui/react';
import { render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import theme from '../../theme';
import TokenBreakdownChart from './TokenBreakdownChart';
import { completeFixture } from './researchSummaryFixtures';

it('renders the authoritative explicit unclassified phase subtotal', () => {
  const row = {
    ...completeFixture.modes[0],
    tokens: {
      ...completeFixture.modes[0].tokens,
      total_tokens: 100,
      by_phase: { answer_generation: 80, unclassified: 20 },
      phase_attribution_status: 'partial' as const,
    },
  };

  render(<ChakraProvider theme={theme}><TokenBreakdownChart rows={[row]} /></ChakraProvider>);
  expect(screen.getByText('Output text')).toBeInTheDocument();
  expect(screen.getByText('Phase attribution: partial')).toBeInTheDocument();
  expect(screen.getByText('Unclassified: 20')).toBeInTheDocument();
});

it.each([
  ['complete', 'Unclassified: 0'],
  ['partial', 'Unclassified: N/A'],
  ['not_available', 'Unclassified: N/A'],
] as const)('renders %s missing unclassified phase as %s', (phaseAttributionStatus, expected) => {
  const row = {
    ...completeFixture.modes[0],
    tokens: {
      ...completeFixture.modes[0].tokens,
      total_tokens: 100,
      by_phase: { answer_generation: 80 },
      phase_attribution_status: phaseAttributionStatus,
    },
  };

  render(<ChakraProvider theme={theme}><TokenBreakdownChart rows={[row]} /></ChakraProvider>);
  expect(screen.getByText(expected)).toBeInTheDocument();
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
