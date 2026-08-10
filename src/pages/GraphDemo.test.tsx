import { ChakraProvider } from '@chakra-ui/react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode, RefObject } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import theme from '../theme';
import GraphDemo from './GraphDemo';

const {
  rebuildMutateMock,
  rebuildFullMutateMock,
  resumeFullRebuildMutateMock,
  startNodeVectorSyncMutateMock,
  optimizeMutateMock,
  purgeMutateMock,
  retryMutateMock,
  graphNodeEvidenceMutateMock,
  graphNodeEvidenceCallbacks,
  evidenceDrawerFinalFocusMock,
  lazyViewerBoundaryMock,
} = vi.hoisted(() => ({
  rebuildMutateMock: vi.fn(),
  rebuildFullMutateMock: vi.fn(),
  resumeFullRebuildMutateMock: vi.fn(),
  startNodeVectorSyncMutateMock: vi.fn(),
  optimizeMutateMock: vi.fn(),
  purgeMutateMock: vi.fn(),
  retryMutateMock: vi.fn(),
  graphNodeEvidenceMutateMock: vi.fn(),
  evidenceDrawerFinalFocusMock: vi.fn(),
  lazyViewerBoundaryMock: vi.fn<(props: {
    evidence: { docId: string };
    onClose: () => void;
  }) => void>(),
  graphNodeEvidenceCallbacks: [] as Array<{
    onSuccess?: (payload: {
      title: string;
      items: Array<{
        docId: string;
        filename: string | null;
        page: number | null;
        quote: string | null;
        bbox: [number, number, number, number] | null;
        provenanceStatus: 'full' | 'partial' | 'source_only';
      }>;
    }) => void;
    onError?: () => void;
  }>,
}));

vi.mock('../components/layout/Layout', () => ({
  default: ({ children }: { children: ReactNode }) => <div data-testid="layout">{children}</div>,
}));

vi.mock('../components/common/PageHeader', () => ({
  default: ({ title }: { title: string }) => <div>{title}</div>,
}));

vi.mock('../components/common/SurfaceCard', () => ({
  default: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock('../components/graph/KnowledgeGraph', () => ({
  KnowledgeGraph: ({ onNodeClick, evidenceControlRef }: {
    onNodeClick?: (node: {
    id: string;
    node_key: string;
    source_docs: string[];
    group: number;
    val: number;
    desc: string;
    }, origin: HTMLElement) => void;
    evidenceControlRef?: RefObject<HTMLButtonElement>;
  }) => (
    <>
      <button
        ref={evidenceControlRef}
        onClick={(event) => onNodeClick?.({
          id: 'Transformer', node_key: 'node-transformer', source_docs: ['doc-1'],
          group: 1, val: 2, desc: 'Method',
        }, event.currentTarget)}
        type="button"
      >
        Transformer node
      </button>
      <button
        onClick={(event) => onNodeClick?.({
          id: 'BERT', node_key: 'node-bert', source_docs: ['doc-2'],
          group: 1, val: 2, desc: 'Method',
        }, event.currentTarget)}
        type="button"
      >
        BERT node
      </button>
    </>
  ),
}));

vi.mock('../components/evidence/EvidenceDrawer', () => ({
  EvidenceDrawer: ({ state, finalFocusRef, onOpenSource }: { state: {
    isOpen: boolean;
    title: string;
    items: Array<{
      docId: string;
      filename: string | null;
      page: number | null;
      quote: string | null;
      bbox: [number, number, number, number] | null;
      provenanceStatus: 'full' | 'partial' | 'source_only';
    }>;
  };
    finalFocusRef?: RefObject<HTMLElement | null>;
    onOpenSource: (item: typeof state.items[number]) => void;
  }) => {
    evidenceDrawerFinalFocusMock(finalFocusRef);
    return state.isOpen ? (
      <div data-testid="evidence-drawer">
        {state.title} {state.items.map((item) => `${item.filename} 第 ${item.page} 頁 ${item.quote}`).join(' ')}
        {state.items[0] && (
          <button type="button" onClick={() => onOpenSource(state.items[0])}>
            Open graph source
          </button>
        )}
      </div>
    ) : null;
  },
}));

vi.mock('../components/evidence/LazySourceViewerBoundary', () => ({
  LazySourceViewerBoundary: (props: { evidence: { docId: string }; onClose: () => void }) => {
    lazyViewerBoundaryMock(props);
    return <div>Protected source viewer</div>;
  },
}));

vi.mock('../components/graph/ResearchFlow', () => ({
  ResearchFlow: () => <div>ResearchFlow</div>,
}));

vi.mock('../hooks/useGraphData', () => ({
  useGraphData: () => ({
    data: { nodes: [], links: [] },
    isLoading: false,
    error: null,
  }),
  useGraphStatus: () => ({
    data: {
      has_graph: true,
      node_count: 8,
      edge_count: 5,
      community_count: 0,
      pending_resolution: 0,
      needs_optimization: true,
      last_updated: null,
      eligible_document_count: 2,
      indexed_document_count: 0,
      failed_document_count: 1,
      partial_document_count: 0,
      empty_document_count: 1,
      active_job_state: null,
    },
  }),
  useGraphDocuments: () => ({
    data: {
      documents: [
        {
          doc_id: 'doc-1',
          status: 'failed',
          chunk_count: 2,
          chunks_succeeded: 1,
          chunks_failed: 1,
          entities_added: 3,
          edges_added: 2,
          last_error: 'chunk 1: quota exceeded',
          last_attempted_at: null,
          last_succeeded_at: null,
          file_name: 'failed.pdf',
          is_eligible: true,
        },
        {
          doc_id: 'doc-2',
          status: 'empty',
          chunk_count: 1,
          chunks_succeeded: 1,
          chunks_failed: 0,
          entities_added: 0,
          edges_added: 0,
          last_error: null,
          last_attempted_at: null,
          last_succeeded_at: null,
          file_name: 'empty.pdf',
          is_eligible: true,
        },
        {
          doc_id: 'doc-orphan',
          status: 'indexed',
          chunk_count: 1,
          chunks_succeeded: 1,
          chunks_failed: 0,
          entities_added: 2,
          edges_added: 1,
          last_error: null,
          last_attempted_at: null,
          last_succeeded_at: null,
          file_name: null,
          is_eligible: false,
        },
      ],
      total: 3,
    },
    isLoading: false,
    error: null,
  }),
  useNodeVectorSyncStatus: () => ({
    data: {
      state: 'completed',
      processed: 3,
      total: 3,
      changed: 1,
      reused: 2,
      removed: 0,
      index_state: 'ready',
      autosync_duration_ms: 12,
      last_error: null,
      started_at: null,
      updated_at: null,
      finished_at: null,
    },
  }),
  useGraphQuality: () => ({
    data: {
      score: 82,
      num_nodes: 8,
      num_edges: 5,
      edge_with_provenance_ratio: 0.8,
      generic_relation_ratio: 0.1,
      duplicate_method_node_ratio: 0,
      orphan_node_ratio: 0.1,
      claim_scope_missing_count: 0,
      issues: [
        {
          code: 'missing_edge_provenance',
          severity: 'warning',
          message: 'Some graph edges lack full provenance.',
          recommended_action: 'Rebuild affected documents.',
        },
      ],
    },
  }),
  useGraphRuntimeQuality: () => ({ data: undefined }),
  useDebugGraphSearch: () => ({ mutate: vi.fn(), isPending: false, data: undefined }),
  useGraphNodeEvidence: () => ({ mutate: graphNodeEvidenceMutateMock }),
  useOptimizeGraph: () => ({
    mutate: optimizeMutateMock,
    isPending: false,
  }),
  useRebuildGraph: () => ({
    mutate: rebuildMutateMock,
    isPending: false,
  }),
  useRebuildFullGraph: () => ({
    mutate: rebuildFullMutateMock,
    isPending: false,
  }),
  useFullGraphRebuildStatus: () => ({
    data: {
      job_id: 'job-1',
      state: 'interrupted',
      phase: 'done',
      total: 2,
      processed: 1,
      succeeded: 1,
      empty: 0,
      failed: 0,
      partial: 0,
      pending: 1,
      progress_percent: 50,
      current_document: null,
      documents: [],
      can_resume: true,
      can_retry_failed: false,
      live_graph_unchanged: true,
      last_error: null,
    },
  }),
  useResumeFullGraphRebuild: () => ({
    mutate: resumeFullRebuildMutateMock,
    isPending: false,
  }),
  useRetryGraphDocument: () => ({
    mutate: retryMutateMock,
    isPending: false,
    variables: undefined,
  }),
  usePurgeGraphDocument: () => ({
    mutate: purgeMutateMock,
    isPending: false,
    variables: undefined,
  }),
  useStartNodeVectorSync: () => ({
    mutate: startNodeVectorSyncMutateMock,
    isPending: false,
  }),
}));

describe('GraphDemo', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    graphNodeEvidenceCallbacks.length = 0;
    graphNodeEvidenceMutateMock.mockImplementation((_: string, callbacks: typeof graphNodeEvidenceCallbacks[number]) => {
      graphNodeEvidenceCallbacks.push(callbacks);
      callbacks.onSuccess?.({
        title: 'Transformer',
        items: [{
          docId: 'doc-1', filename: 'paper.pdf', page: 3,
          quote: 'Transformer uses self-attention.', bbox: null,
          provenanceStatus: 'full',
        }],
      });
    });
  });

  it('opens verified node evidence in the shared drawer', () => {
    render(
      <ChakraProvider theme={theme}>
        <GraphDemo />
      </ChakraProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Transformer node' }));

    expect(screen.getByTestId('evidence-drawer')).toHaveTextContent('paper.pdf');
    expect(screen.getByTestId('evidence-drawer')).toHaveTextContent('第 3 頁');
    expect(screen.getByTestId('evidence-drawer')).toHaveTextContent('Transformer uses self-attention.');
  });

  it('preserves the exact graph trigger and mounts the protected source viewer', () => {
    render(
      <ChakraProvider theme={theme}>
        <GraphDemo />
      </ChakraProvider>
    );

    const trigger = screen.getByRole('button', { name: 'Transformer node' });
    fireEvent.click(trigger);

    const finalFocusRef = evidenceDrawerFinalFocusMock.mock.calls.at(-1)?.[0] as
      | RefObject<HTMLElement | null>
      | undefined;
    expect(finalFocusRef?.current).toBe(trigger);

    fireEvent.click(screen.getByRole('button', { name: 'Open graph source' }));
    expect(lazyViewerBoundaryMock).toHaveBeenCalled();
    expect(lazyViewerBoundaryMock.mock.calls.at(-1)?.[0].evidence.docId).toBe('doc-1');
  });

  it('keeps evidence from an earlier node click out of the drawer after a newer click', () => {
    graphNodeEvidenceMutateMock.mockImplementation((_: string, callbacks: typeof graphNodeEvidenceCallbacks[number]) => {
      graphNodeEvidenceCallbacks.push(callbacks);
    });

    render(
      <ChakraProvider theme={theme}>
        <GraphDemo />
      </ChakraProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Transformer node' }));
    fireEvent.click(screen.getByRole('button', { name: 'BERT node' }));

    act(() => {
      graphNodeEvidenceCallbacks[0].onSuccess?.({
        title: 'Transformer',
        items: [{
          docId: 'doc-1', filename: 'stale-transformer.pdf', page: 3,
          quote: 'Stale evidence.', bbox: null, provenanceStatus: 'full',
        }],
      });
    });

    expect(screen.queryByText(/stale-transformer\.pdf/)).not.toBeInTheDocument();

    act(() => {
      graphNodeEvidenceCallbacks[1].onSuccess?.({
        title: 'BERT',
        items: [{
          docId: 'doc-2', filename: 'bert.pdf', page: 5,
          quote: 'BERT evidence.', bbox: null, provenanceStatus: 'full',
        }],
      });
    });

    expect(screen.getByTestId('evidence-drawer')).toHaveTextContent('bert.pdf');
    expect(screen.getByTestId('evidence-drawer')).toHaveTextContent('BERT evidence.');
  });

  it('renders graph maintenance controls and a collapsed document summary by default', () => {
    render(
      <ChakraProvider theme={theme}>
        <GraphDemo />
      </ChakraProvider>
    );

    expect(screen.getByTestId('graph-demo-scroll-region')).toBeInTheDocument();
    expect(screen.getByText('完整重構')).toBeInTheDocument();
    expect(screen.getByText('補齊節點嵌入')).toBeInTheDocument();
    expect(screen.getByText('展開列表')).toBeInTheDocument();
    expect(screen.getAllByText('1 失敗').length).toBeGreaterThan(0);
    expect(screen.getAllByText('1 0 實體').length).toBeGreaterThan(0);
    expect(screen.queryByText('failed.pdf')).not.toBeInTheDocument();
    expect(screen.getByText(/目前社群為 0/)).toBeInTheDocument();
  });

  it('renders durable rebuild progress and resumes an interrupted job', () => {
    render(
      <ChakraProvider theme={theme}>
        <GraphDemo />
      </ChakraProvider>
    );

    expect(screen.getByText('完整重建進度')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '繼續重建' }));
    expect(resumeFullRebuildMutateMock).toHaveBeenCalledOnce();
  });

  it('renders graph quality issues and query debugger controls', () => {
    render(
      <ChakraProvider theme={theme}>
        <GraphDemo />
      </ChakraProvider>
    );

    expect(screen.getByText('Graph Quality')).toBeInTheDocument();
    expect(screen.getByText('Some graph edges lack full provenance.')).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Graph debug query' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Run graph debug search' })).toBeInTheDocument();
  });

  it('expands the document list inside a bounded scroll region', () => {
    render(
      <ChakraProvider theme={theme}>
        <GraphDemo />
      </ChakraProvider>
    );

    fireEvent.click(screen.getByText('展開列表'));

    expect(screen.getByTestId('graph-document-list-scroll-region')).toBeInTheDocument();
    expect(screen.getByText('failed.pdf')).toBeInTheDocument();
    expect(screen.getAllByText('重試此文件')).toHaveLength(2);
    expect(screen.getByText('移除殘留圖譜')).toBeInTheDocument();
  });

  it('requires a recoverable durable job to use its resume action', () => {
    render(
      <ChakraProvider theme={theme}>
        <GraphDemo />
      </ChakraProvider>
    );

    expect(screen.getByRole('button', { name: '完整重構' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: '繼續重建' }));
    fireEvent.click(screen.getByText('展開列表'));

    expect(rebuildFullMutateMock).not.toHaveBeenCalled();
    expect(resumeFullRebuildMutateMock).toHaveBeenCalledWith(undefined, expect.any(Object));
    expect(screen.getAllByText('重試此文件')[0]).toBeDisabled();
    expect(screen.getByText('移除殘留圖譜')).toBeDisabled();
  });

  it('blocks high-precision retry while a durable rebuild is recoverable', () => {
    render(
      <ChakraProvider theme={theme}>
        <GraphDemo />
      </ChakraProvider>,
    );

    fireEvent.click(screen.getByText('展開列表'));
    expect(screen.getAllByText('高精度重試')[0]).toBeDisabled();
    expect(retryMutateMock).not.toHaveBeenCalled();
  });

  it('blocks node-vector sync while a durable rebuild is recoverable', () => {
    render(
      <ChakraProvider theme={theme}>
        <GraphDemo />
      </ChakraProvider>
    );

    expect(screen.getByText('補齊節點嵌入')).toBeDisabled();
    expect(startNodeVectorSyncMutateMock).not.toHaveBeenCalled();
  });
});
