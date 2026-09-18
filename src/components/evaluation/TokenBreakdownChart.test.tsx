import { ChakraProvider } from '@chakra-ui/react';
import { render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import theme from '../../theme';
import TokenBreakdownChart from './TokenBreakdownChart';
import { completeFixture } from './researchSummaryFixtures';

it('shows provider cache ratio and measurement coverage separately', () => {
  const row = { ...completeFixture.modes[0], tokens: { ...completeFixture.modes[0].tokens,
    cached_input_tokens: 800, cache_observed_input_tokens: 1000, cache_read_ratio: 0.8,
    cache_hit_call_ratio: 0.5, cache_usage_coverage: 0.75, service_tiers: ['flex'] } };
  render(<ChakraProvider theme={theme}><TokenBreakdownChart rows={[row]} /></ChakraProvider>);
  expect(screen.getByText('Gemini prompt cache：80.0%')).toBeInTheDocument();
  expect(screen.getByText('命中請求：50.0% · 資料涵蓋率：75.0%')).toBeInTheDocument();
  expect(screen.getByText('服務等級：flex')).toBeInTheDocument();
});

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
  expect(screen.getByText('評分用量與快取（RAGAS）')).toBeInTheDocument();
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
it('shows known scoring cost without pretending missing retry usage is free', () => {
  const overhead = { ...completeFixture.evaluation_overhead, cost_usd: null,
    known_cost_usd: 0.0123, pricing_status: 'partial' as const,
    priced_call_count: 12, unpriced_call_count: 1, unpriced_reasons: { unavailable_usage: 1 } };
  render(<ChakraProvider theme={theme}><TokenBreakdownChart evaluationOverhead={overhead} /></ChakraProvider>);
  expect(screen.getByText('已知呼叫小計：US$0.0123（部分估算）')).toBeInTheDocument();
  expect(screen.getByText('已估價：12 次 · 未估價：1 次')).toBeInTheDocument();
  expect(screen.getByText('缺少或不完整的用量：1 次')).toBeInTheDocument();
});

it('keeps costs unknown when no call can be priced', () => {
  const overhead = { ...completeFixture.evaluation_overhead, cost_usd: null,
    known_cost_usd: null, priced_call_count: 0, unpriced_call_count: 1,
    unpriced_reasons: { missing_price: 1 } };
  render(<ChakraProvider theme={theme}><TokenBreakdownChart evaluationOverhead={overhead} /></ChakraProvider>);
  expect(screen.getByText('估算費用：N/A（尚無可估價的呼叫）')).toBeInTheDocument();
  expect(screen.getByText('缺少對應費率：1 次')).toBeInTheDocument();
  expect(screen.queryByText(/US\$0.0000/)).not.toBeInTheDocument();
});
