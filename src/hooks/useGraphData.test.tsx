import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  useGraphDocuments,
  useNodeVectorSyncStatus,
  usePurgeGraphDocument,
  useRebuildFullGraph,
  useRetryGraphDocument,
  useStartNodeVectorSync,
} from './useGraphData';

const {
  getGraphDocumentsMock,
  getNodeVectorSyncStatusMock,
  purgeGraphDocumentMock,
  rebuildFullGraphMock,
  retryGraphDocumentMock,
  startNodeVectorSyncMock,
} = vi.hoisted(() => ({
  getGraphDocumentsMock: vi.fn(),
  getNodeVectorSyncStatusMock: vi.fn(),
  purgeGraphDocumentMock: vi.fn(),
  rebuildFullGraphMock: vi.fn(),
  retryGraphDocumentMock: vi.fn(),
  startNodeVectorSyncMock: vi.fn(),
}));

vi.mock('../services/graphApi', () => ({
  getGraphData: vi.fn(),
  getGraphStatus: vi.fn(),
  getGraphDocuments: getGraphDocumentsMock,
  getNodeVectorSyncStatus: getNodeVectorSyncStatusMock,
  optimizeGraph: vi.fn(),
  purgeGraphDocument: purgeGraphDocumentMock,
  rebuildGraph: vi.fn(),
  rebuildFullGraph: rebuildFullGraphMock,
  retryGraphDocument: retryGraphDocumentMock,
  startNodeVectorSync: startNodeVectorSyncMock,
}));

function createWrapper(queryClient: QueryClient) {
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
}

describe('useGraphData hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('queries graph documents', async () => {
    const queryClient = new QueryClient();
    getGraphDocumentsMock.mockResolvedValue({
      documents: [
        {
          doc_id: 'doc-1',
          status: 'failed',
          chunk_count: 2,
          chunks_succeeded: 1,
          chunks_failed: 1,
          entities_added: 3,
          edges_added: 2,
          last_error: 'boom',
          last_attempted_at: null,
          last_succeeded_at: null,
          file_name: 'demo.pdf',
          is_eligible: true,
        },
      ],
      total: 1,
    });

    const { result } = renderHook(() => useGraphDocuments(), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.data?.total).toBe(1));
    expect(getGraphDocumentsMock).toHaveBeenCalledOnce();
  });

  it('starts full rebuild mutation', async () => {
    const queryClient = new QueryClient();
    rebuildFullGraphMock.mockResolvedValue({
      status: 'started',
      message: '完整圖譜重構已開始',
    });

    const { result } = renderHook(() => useRebuildFullGraph(), {
      wrapper: createWrapper(queryClient),
    });

    await act(async () => {
      await result.current.mutateAsync();
    });

    expect(rebuildFullGraphMock).toHaveBeenCalledOnce();
  });

  it('retries a single document mutation', async () => {
    const queryClient = new QueryClient();
    retryGraphDocumentMock.mockResolvedValue({
      status: 'started',
      message: '單一文件 GraphRAG 重試已開始',
    });

    const { result } = renderHook(() => useRetryGraphDocument(), {
      wrapper: createWrapper(queryClient),
    });

    await act(async () => {
      await result.current.mutateAsync('doc-1');
    });

    expect(retryGraphDocumentMock).toHaveBeenCalledWith('doc-1');
  });

  it('purges a single orphan document mutation', async () => {
    const queryClient = new QueryClient();
    purgeGraphDocumentMock.mockResolvedValue({
      status: 'started',
      message: '文件圖譜殘留移除已開始',
    });

    const { result } = renderHook(() => usePurgeGraphDocument(), {
      wrapper: createWrapper(queryClient),
    });

    await act(async () => {
      await result.current.mutateAsync('doc-orphan');
    });

    expect(purgeGraphDocumentMock).toHaveBeenCalledWith('doc-orphan');
  });

  it('queries node-vector sync status', async () => {
    const queryClient = new QueryClient();
    getNodeVectorSyncStatusMock.mockResolvedValue({
      state: 'completed',
      processed: 4,
      total: 10,
      changed: 6,
      reused: 4,
      removed: 0,
      index_state: 'running',
      autosync_duration_ms: null,
      last_error: null,
      started_at: null,
      updated_at: null,
      finished_at: null,
    });

    const { result } = renderHook(() => useNodeVectorSyncStatus(), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.data?.state).toBe('completed'));
    expect(getNodeVectorSyncStatusMock).toHaveBeenCalledOnce();
  });

  it('starts node-vector sync mutation', async () => {
    const queryClient = new QueryClient();
    startNodeVectorSyncMock.mockResolvedValue({
      status: 'started',
      message: '節點嵌入同步已啟動',
    });

    const { result } = renderHook(() => useStartNodeVectorSync(), {
      wrapper: createWrapper(queryClient),
    });

    await act(async () => {
      await result.current.mutateAsync();
    });

    expect(startNodeVectorSyncMock).toHaveBeenCalledOnce();
  });
});
