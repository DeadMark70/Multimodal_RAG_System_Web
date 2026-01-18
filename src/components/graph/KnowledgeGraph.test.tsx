import { render, screen, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import KnowledgeGraph from './KnowledgeGraph';
import { ChakraProvider } from '@chakra-ui/react';
import theme from '../../theme';

// Mock ResizeObserver
class ResizeObserverMock implements ResizeObserver {
  callback: ResizeObserverCallback;
  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
  }
  observe() {
    // Trigger callback immediately
    act(() => {
        const entries: Partial<ResizeObserverEntry>[] = [{
            contentRect: { width: 800, height: 600, top: 0, left: 0, right: 800, bottom: 600, x: 0, y: 0, toJSON: () => {} } as DOMRectReadOnly,
            target: document.createElement('div'),
            borderBoxSize: [],
            contentBoxSize: [],
            devicePixelContentBoxSize: []
        }];
        this.callback(entries as ResizeObserverEntry[], this);
    });
  }
  unobserve() {}
  disconnect() {}
}
window.ResizeObserver = ResizeObserverMock;

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