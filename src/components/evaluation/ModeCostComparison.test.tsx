import { ChakraProvider } from '@chakra-ui/react';
import { render, screen, within } from '@testing-library/react';
import { expect, it } from 'vitest';
import theme from '../../theme';
import ModeCostComparison from './ModeCostComparison';

it('compares current answers and cumulative cost without treating unknown prices as zero', () => {
  render(<ChakraProvider theme={theme}><ModeCostComparison rows={[
    { mode: 'naive', completed_run_count: 4, execution_cost: { benchmark_usd: 0.12,
      operational_usd: 0.18, known_cost_usd: 0.18, pricing_status: 'complete', priced_call_count: 6, unpriced_call_count: 0 } },
    { mode: 'agentic', completed_run_count: 2, execution_cost: { benchmark_usd: 0.4,
      operational_usd: null, known_cost_usd: 0.6, pricing_status: 'partial', priced_call_count: 8, unpriced_call_count: 1 } },
    { mode: 'graph', completed_run_count: 0, execution_cost: { benchmark_usd: null,
      operational_usd: 0.05, known_cost_usd: 0.05, pricing_status: 'complete', priced_call_count: 1, unpriced_call_count: 0 } },
    { mode: 'advanced', completed_run_count: 1, execution_cost: { benchmark_usd: null,
      operational_usd: null, known_cost_usd: null, pricing_status: 'unknown', priced_call_count: 0, unpriced_call_count: 1 } },
  ]} /></ChakraProvider>);
  const naive = within(screen.getByText('Naive RAG').closest('tr')!);
  expect(naive.getByText('US$0.0300')).toBeInTheDocument();
  expect(naive.getByText('US$0.1800')).toBeInTheDocument();
  const agentic = within(screen.getByText('Agentic RAG').closest('tr')!);
  expect(agentic.getByText('US$0.2000')).toBeInTheDocument();
  expect(agentic.getByText('US$0.6000')).toBeInTheDocument();
  expect(agentic.getByText('已知小計，資料不完整')).toBeInTheDocument();
  const graph = within(screen.getByText('Graph RAG').closest('tr')!);
  expect(graph.getAllByText('N/A')).toHaveLength(2);
  expect(graph.getByText('US$0.0500')).toBeInTheDocument();
  expect(within(screen.getByText('Advanced RAG').closest('tr')!).getAllByText('N/A')).toHaveLength(3);
});
