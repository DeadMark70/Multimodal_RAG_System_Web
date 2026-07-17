import { ChakraProvider } from '@chakra-ui/react';
import { render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import theme from '../../theme';
import CostQualityScatter from './CostQualityScatter';
import { mixedFixture } from './researchSummaryFixtures';

it('renders only comparable cost-quality points and excluded reasons', () => {
  render(<ChakraProvider theme={theme}><CostQualityScatter modes={mixedFixture.modes} /></ChakraProvider>);
  expect(screen.getByTestId('cost-quality-agentic')).toBeInTheDocument();
  expect(screen.queryByTestId('cost-quality-graph')).not.toBeInTheDocument();
  expect(screen.getByText('graph: unknown pricing, not comparable')).toBeInTheDocument();
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

  render(<ChakraProvider theme={theme}><CostQualityScatter modes={[mixedFixture.modes[0], missingQuality, multipleReasons]} /></ChakraProvider>);

  expect(screen.queryByTestId('cost-quality-router')).not.toBeInTheDocument();
  expect(screen.getByText('router: missing quality')).toBeInTheDocument();
  expect(screen.getByText('graph: different prompt, different corpus, not comparable, unknown pricing')).toBeInTheDocument();
});
