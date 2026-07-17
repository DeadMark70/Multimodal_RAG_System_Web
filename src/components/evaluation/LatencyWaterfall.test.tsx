import { ChakraProvider } from '@chakra-ui/react';
import { render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import theme from '../../theme';
import LatencyWaterfall from './LatencyWaterfall';
import { completeFixture } from './researchSummaryFixtures';

it('renders measured mean, percentiles, sample count, method, and low-sample warning', () => {
  render(<ChakraProvider theme={theme}><LatencyWaterfall rows={completeFixture.modes} /></ChakraProvider>);
  expect(screen.getByText('4,800 ms')).toBeInTheDocument();
  expect(screen.getByText('nearest_rank')).toBeInTheDocument();
  expect(screen.getByText('Low sample size (n=4)')).toBeInTheDocument();
});
