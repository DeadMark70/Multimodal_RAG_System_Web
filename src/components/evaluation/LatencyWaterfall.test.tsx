import { ChakraProvider } from '@chakra-ui/react';
import { render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import theme from '../../theme';
import LatencyWaterfall from './LatencyWaterfall';
import { completeFixture } from './researchSummaryFixtures';

it('renders measured mean, percentiles, sample count, method, and low-sample warning', () => {
  render(<ChakraProvider theme={theme}><LatencyWaterfall rows={completeFixture.modes} /></ChakraProvider>);
  expect(screen.getByText('4.80 秒')).toBeInTheDocument();
  expect(screen.getByText('3.90 秒')).toBeInTheDocument();
  expect(screen.getByText('7.10 秒')).toBeInTheDocument();
  expect(screen.getByText('nearest_rank')).toBeInTheDocument();
  expect(screen.getByText('樣本較少（n=4）')).toBeInTheDocument();
});
