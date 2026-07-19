import { ChakraProvider } from '@chakra-ui/react';
import { render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import theme from '../../theme';
import TokenQualityTable from './TokenQualityTable';
import { mixedFixture } from './researchSummaryFixtures';

it('renders token-quality points without requiring monetary pricing', () => {
  const tokenOnly = {
    ...mixedFixture.modes[0],
    mode: 'graph',
    execution_cost: { ...mixedFixture.modes[0].execution_cost, benchmark_usd: null, operational_usd: null, pricing_status: 'unknown' as const },
  };
  render(<ChakraProvider theme={theme}><TokenQualityTable modes={[tokenOnly]} /></ChakraProvider>);
  expect(screen.getByTestId('token-quality-graph')).toBeInTheDocument();
  expect(screen.getByText('Tokens')).toBeInTheDocument();
  expect(screen.queryByText(/unknown pricing/)).not.toBeInTheDocument();
});

it('excludes comparable modes with incomplete quality and preserves every exclusion reason', () => {
  const missingQuality = {
    ...mixedFixture.modes[0],
    mode: 'router',
    quality: {
      ...mixedFixture.modes[0].quality,
      faithfulness: { ...mixedFixture.modes[0].quality.faithfulness, value: null },
    },
  };
  const multipleReasons = {
    ...mixedFixture.modes[1],
    not_comparable_reasons: ['different prompt', 'different corpus'],
  };

  render(<ChakraProvider theme={theme}><TokenQualityTable modes={[mixedFixture.modes[0], missingQuality, multipleReasons]} /></ChakraProvider>);

  expect(screen.queryByTestId('token-quality-router')).not.toBeInTheDocument();
  expect(screen.getByText('router: missing quality')).toBeInTheDocument();
  expect(screen.getByText('graph: different prompt, different corpus, not comparable')).toBeInTheDocument();
});
