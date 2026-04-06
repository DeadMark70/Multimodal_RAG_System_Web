import { ChakraProvider } from '@chakra-ui/react';
import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import theme from '../theme';
import GraphDemo from './GraphDemo';

const {
  rebuildMutateMock,
  rebuildFullMutateMock,
  optimizeMutateMock,
  purgeMutateMock,
  retryMutateMock,
} = vi.hoisted(() => ({
  rebuildMutateMock: vi.fn(),
  rebuildFullMutateMock: vi.fn(),
  optimizeMutateMock: vi.fn(),
  purgeMutateMock: vi.fn(),
  retryMutateMock: vi.fn(),
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
  KnowledgeGraph: () => <div>KnowledgeGraph</div>,
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
}));

describe('GraphDemo', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders graph maintenance controls and a collapsed document summary by default', () => {
    render(
      <ChakraProvider theme={theme}>
        <GraphDemo />
      </ChakraProvider>
    );

    expect(screen.getByTestId('graph-demo-scroll-region')).toBeInTheDocument();
    expect(screen.getByText('完整重構')).toBeInTheDocument();
    expect(screen.getByText('展開列表')).toBeInTheDocument();
    expect(screen.getAllByText('1 失敗').length).toBeGreaterThan(0);
    expect(screen.getAllByText('1 0 實體').length).toBeGreaterThan(0);
    expect(screen.queryByText('failed.pdf')).not.toBeInTheDocument();
    expect(screen.getByText(/目前社群為 0/)).toBeInTheDocument();
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

  it('triggers full rebuild, retry, and purge actions', () => {
    render(
      <ChakraProvider theme={theme}>
        <GraphDemo />
      </ChakraProvider>
    );

    fireEvent.click(screen.getByText('完整重構'));
    fireEvent.click(screen.getByText('展開列表'));
    fireEvent.click(screen.getAllByText('重試此文件')[0]);
    fireEvent.click(screen.getByText('移除殘留圖譜'));

    expect(rebuildFullMutateMock).toHaveBeenCalledOnce();
    expect(retryMutateMock).toHaveBeenCalledWith('doc-1', expect.any(Object));
    expect(purgeMutateMock).toHaveBeenCalledWith('doc-orphan', expect.any(Object));
  });
});
