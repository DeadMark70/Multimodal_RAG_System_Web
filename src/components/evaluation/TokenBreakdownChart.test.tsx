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
