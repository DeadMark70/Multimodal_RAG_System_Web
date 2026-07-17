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
  expect(screen.getByText('graph: unknown pricing')).toBeInTheDocument();
});
