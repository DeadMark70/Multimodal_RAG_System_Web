import { render, screen, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import KnowledgeGraph from './KnowledgeGraph';
import { ChakraProvider } from '@chakra-ui/react';
import theme from '../../theme';
import React from 'react';

// Mock ResizeObserver
class ResizeObserverMock {
  callback: (entries: any[]) => void;
  constructor(callback: (entries: any[]) => void) {
    this.callback = callback;
  }
  observe(element: HTMLElement) {
    // Trigger callback immediately
    act(() => {
        this.callback([{ contentRect: { width: 800, height: 600 } }]);
    });
  }
  unobserve() {}
  disconnect() {}
}
window.ResizeObserver = ResizeObserverMock as any;

// Mock ForceGraph2D
vi.mock('react-force-graph-2d', () => ({
  default: () => <div data-testid="force-graph" />
}));

describe('KnowledgeGraph', () => {
  it('renders graph container', async () => {
    render(
      <ChakraProvider theme={theme}>
        <KnowledgeGraph />
      </ChakraProvider>
    );
    await waitFor(() => {
        expect(screen.getByTestId('force-graph')).toBeInTheDocument();
    });
  });

  it('renders control buttons', () => {
    render(
      <ChakraProvider theme={theme}>
        <KnowledgeGraph />
      </ChakraProvider>
    );
    expect(screen.getByLabelText('Zoom In')).toBeInTheDocument();
    expect(screen.getByLabelText('Zoom Out')).toBeInTheDocument();
  });
});