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

const { forceGraphPropsMock } = vi.hoisted(() => ({
  forceGraphPropsMock: vi.fn(),
}));

// Mock ForceGraph2D
vi.mock('react-force-graph-2d', () => ({
  default: (props: unknown) => {
    forceGraphPropsMock(props);
    return <div data-testid="force-graph" />;
  },
}));

describe('KnowledgeGraph', () => {
  it('renders graph container', async () => {
    forceGraphPropsMock.mockClear();
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
    forceGraphPropsMock.mockClear();
    render(
      <ChakraProvider theme={theme}>
        <KnowledgeGraph />
      </ChakraProvider>
    );
    expect(screen.getByLabelText('Zoom In')).toBeInTheDocument();
    expect(screen.getByLabelText('Zoom Out')).toBeInTheDocument();
  });

  it('applies large-graph render degradation settings for dense graphs', async () => {
    forceGraphPropsMock.mockClear();
    const denseGraph = {
      nodes: Array.from({ length: 1600 }, (_, index) => ({
        id: `node-${index}`,
        group: index % 8,
        val: 1,
      })),
      links: Array.from({ length: 1599 }, (_, index) => ({
        source: `node-${index}`,
        target: `node-${index + 1}`,
      })),
    };

    render(
      <ChakraProvider theme={theme}>
        <KnowledgeGraph data={denseGraph} />
      </ChakraProvider>
    );

    await waitFor(() => expect(screen.getByTestId('force-graph')).toBeInTheDocument());

    const latestProps = forceGraphPropsMock.mock.calls.at(-1)?.[0] as Record<string, unknown>;
    expect(latestProps.linkDirectionalArrowLength).toBe(0);
    expect(latestProps.cooldownTicks).toBe(35);
    expect(latestProps.warmupTicks).toBe(15);
    expect(latestProps.nodeCanvasObject).toEqual(expect.any(Function));
  });
});
