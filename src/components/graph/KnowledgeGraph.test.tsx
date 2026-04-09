import { render, screen, act, waitFor, fireEvent } from '@testing-library/react';
import { forwardRef, type Ref } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
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

const {
  forceGraph3DPropsMock,
  setSelectedNodeIdMock,
  get3DImportPromise,
  resolve3DImport,
} = vi.hoisted(() => {
  let resolveImport: (() => void) | null = null;
  let importPromise = new Promise<void>((resolve) => {
    resolveImport = resolve;
  });

  return {
    forceGraph3DPropsMock: vi.fn(),
    setSelectedNodeIdMock: vi.fn(),
    get3DImportPromise: () => importPromise,
    resolve3DImport: () => {
      resolveImport?.();
      importPromise = Promise.resolve();
    },
  };
});

vi.mock('../../stores', () => ({
  useSessionActions: () => ({
    setSelectedNodeId: setSelectedNodeIdMock,
  }),
}));

// Mock ForceGraph2D
vi.mock('react-force-graph-2d', () => ({
  default: forwardRef((_props: unknown, ref) => {
    forceGraphPropsMock(_props);
    return <div data-testid="force-graph-2d" ref={ref as Ref<HTMLDivElement>} />;
  }),
}));

vi.mock('react-force-graph-3d', async () => {
  await get3DImportPromise();

  return {
    default: (props: unknown) => {
      forceGraph3DPropsMock(props);
      const typedProps = props as {
        graphData: { nodes: Array<{ id: string }> };
        onNodeClick?: (node: { id: string }) => void;
      };

      return (
        <button
          data-testid="force-graph-3d"
          onClick={() => typedProps.onNodeClick?.(typedProps.graphData.nodes[0])}
          type="button"
        >
          3D Graph
        </button>
      );
    },
  };
});

describe('KnowledgeGraph', () => {
  beforeEach(() => {
    forceGraphPropsMock.mockClear();
    forceGraph3DPropsMock.mockClear();
    setSelectedNodeIdMock.mockClear();
  });

  it('renders graph container', async () => {
    render(
      <ChakraProvider theme={theme}>
        <KnowledgeGraph />
      </ChakraProvider>
    );
    await waitFor(() => {
        expect(screen.getByTestId('force-graph-2d')).toBeInTheDocument();
    });
  });

  it('renders control buttons', () => {
    render(
      <ChakraProvider theme={theme}>
        <KnowledgeGraph />
      </ChakraProvider>
    );
    expect(screen.getByLabelText('Switch to 3D graph')).toBeInTheDocument();
    expect(screen.getByLabelText('Zoom In')).toBeInTheDocument();
    expect(screen.getByLabelText('Zoom Out')).toBeInTheDocument();
  });

  it('shows a suspense fallback before the 3D graph finishes loading', async () => {
    render(
      <ChakraProvider theme={theme}>
        <KnowledgeGraph />
      </ChakraProvider>
    );

    fireEvent.click(screen.getByLabelText('Switch to 3D graph'));

    expect(screen.getByText('Loading 3D Graph...')).toBeInTheDocument();

    resolve3DImport();

    await waitFor(() => {
      expect(screen.getByTestId('force-graph-3d')).toBeInTheDocument();
    });
  });

  it('hides zoom buttons in 3D mode and restores them after switching back to 2D', async () => {
    render(
      <ChakraProvider theme={theme}>
        <KnowledgeGraph />
      </ChakraProvider>
    );

    fireEvent.click(screen.getByLabelText('Switch to 3D graph'));
    await waitFor(() => expect(screen.getByTestId('force-graph-3d')).toBeInTheDocument());

    expect(screen.queryByLabelText('Zoom In')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Zoom Out')).not.toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('Switch to 2D graph'));

    await waitFor(() => expect(screen.getByTestId('force-graph-2d')).toBeInTheDocument());
    expect(screen.getByLabelText('Zoom In')).toBeInTheDocument();
    expect(screen.getByLabelText('Zoom Out')).toBeInTheDocument();
  });

  it('drops pinned 2D coordinates from the 3D graph projection', async () => {
    const graphWithPinnedNode = {
      nodes: [
        { id: 'Pinned Node', group: 1, val: 3, fx: 120, fy: 240 },
      ],
      links: [],
    };

    render(
      <ChakraProvider theme={theme}>
        <KnowledgeGraph data={graphWithPinnedNode} />
      </ChakraProvider>
    );

    fireEvent.click(screen.getByLabelText('Switch to 3D graph'));
    await waitFor(() => expect(screen.getByTestId('force-graph-3d')).toBeInTheDocument());

    const latestProps = forceGraph3DPropsMock.mock.calls.at(-1)?.[0] as {
      graphData: { nodes: Array<Record<string, unknown>> };
    };

    expect(latestProps.graphData.nodes[0]).not.toHaveProperty('fx');
    expect(latestProps.graphData.nodes[0]).not.toHaveProperty('fy');
  });

  it('keeps node selection callbacks active in 3D mode', async () => {
    const onNodeClick = vi.fn();
    const graphData = {
      nodes: [{ id: 'Node 1', group: 1, val: 2 }],
      links: [],
    };

    render(
      <ChakraProvider theme={theme}>
        <KnowledgeGraph data={graphData} onNodeClick={onNodeClick} />
      </ChakraProvider>
    );

    fireEvent.click(screen.getByLabelText('Switch to 3D graph'));
    await waitFor(() => expect(screen.getByTestId('force-graph-3d')).toBeInTheDocument());

    fireEvent.click(screen.getByTestId('force-graph-3d'));

    expect(setSelectedNodeIdMock).toHaveBeenCalledWith('Node 1');
    expect(onNodeClick).toHaveBeenCalledWith(expect.objectContaining({ id: 'Node 1' }));
  });

  it('applies large-graph render degradation settings for dense graphs', async () => {
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

    await waitFor(() => expect(screen.getByTestId('force-graph-2d')).toBeInTheDocument());

    const latestProps = forceGraphPropsMock.mock.calls.at(-1)?.[0] as Record<string, unknown>;
    expect(latestProps.linkDirectionalArrowLength).toBe(0);
    expect(latestProps.cooldownTicks).toBe(35);
    expect(latestProps.warmupTicks).toBe(15);
    expect(latestProps.nodeCanvasObject).toEqual(expect.any(Function));
  });
});
