import { ChakraProvider } from '@chakra-ui/react';
import { render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import theme from '../../theme';
import ModeComparisonChart from './ModeComparisonChart';
import { completeFixture, partialFixture } from './researchSummaryFixtures';

it('renders nullable quality cells and sample validity metadata', () => {
  render(<ChakraProvider theme={theme}><ModeComparisonChart rows={[{ ...partialFixture.modes[0], quality: partialFixture.quality }]} /></ChakraProvider>);
  expect(screen.getByText('N/A')).toBeInTheDocument();
  expect(screen.getByText('0 有效 · 4 缺少 · 0 失敗')).toBeInTheDocument();
});

it('puts quality, seconds and per-answer cost together without repeated success counts', () => {
  render(<ChakraProvider theme={theme}><ModeComparisonChart rows={completeFixture.modes} /></ChakraProvider>);
  expect(screen.getByText('Agentic RAG')).toBeInTheDocument();
  expect(screen.getByText('4.80 秒')).toBeInTheDocument();
  expect(screen.getByText('US$0.0300')).toBeInTheDocument();
  expect(screen.queryByText(/有效 ·/)).not.toBeInTheDocument();
});
