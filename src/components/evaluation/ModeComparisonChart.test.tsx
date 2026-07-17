import { ChakraProvider } from '@chakra-ui/react';
import { render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import theme from '../../theme';
import ModeComparisonChart from './ModeComparisonChart';
import { partialFixture } from './researchSummaryFixtures';

it('renders nullable quality cells and sample validity metadata', () => {
  render(<ChakraProvider theme={theme}><ModeComparisonChart rows={[{ ...partialFixture.modes[0], quality: partialFixture.quality }]} /></ChakraProvider>);
  expect(screen.getByText('N/A')).toBeInTheDocument();
  expect(screen.getByText('0 valid · 4 missing · 0 failed')).toBeInTheDocument();
});
