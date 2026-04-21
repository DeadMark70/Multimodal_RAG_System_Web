/**
 * useGraphData Hooks
 *
 * 使用 React Query 管理知識圖譜資料
 * - Queries: 取得圖譜資料和狀態
 * - Mutations: 優化和重置/重算圖譜
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getGraphData,
  getGraphDocuments,
  getNodeVectorSyncStatus,
  getGraphStatus,
  optimizeGraph,
  purgeGraphDocument,
  rebuildGraph,
  rebuildFullGraph,
  retryGraphDocument,
  startNodeVectorSync,
} from '../services/graphApi';
import type {
  GraphData,
  GraphDocumentStatusListResponse,
  NodeVectorSyncStatusResponse,
  GraphStatusResponse,
  GraphOptimizeResponse,
  GraphRebuildResponse,
} from '../types/graph';

// ========== Queries ==========

/**
 * 取得圖譜視覺化資料
 */
export function useGraphData() {
  return useQuery<GraphData, Error>({
    queryKey: ['graph', 'data'],
    queryFn: getGraphData,
    staleTime: 5 * 60 * 1000, // 5 分鐘
    retry: 1,
  });
}

/**
 * 取得圖譜狀態
 */
export function useGraphStatus() {
  return useQuery<GraphStatusResponse, Error>({
    queryKey: ['graph', 'status'],
    queryFn: getGraphStatus,
    staleTime: 30 * 1000, // 30 秒
    retry: 1,
  });
}

/**
 * 取得每份文件的 GraphRAG 狀態
 */
export function useGraphDocuments() {
  return useQuery<GraphDocumentStatusListResponse, Error>({
    queryKey: ['graph', 'documents'],
    queryFn: getGraphDocuments,
    staleTime: 30 * 1000,
    retry: 1,
  });
}

/**
 * 取得 node-vector 手動同步狀態（執行中時輪詢）
 */
export function useNodeVectorSyncStatus() {
  return useQuery<NodeVectorSyncStatusResponse, Error>({
    queryKey: ['graph', 'node-vector-sync', 'status'],
    queryFn: getNodeVectorSyncStatus,
    staleTime: 1000,
    retry: 1,
    refetchInterval: (query) => (query.state.data?.state === 'running' ? 1000 : false),
  });
}

// ========== Mutations ==========

/**
 * 優化圖譜 (社群偵測 + 實體融合)
 *
 * @param regenerateCommunities - 是否重新生成社群摘要
 */
export function useOptimizeGraph() {
  const queryClient = useQueryClient();

  return useMutation<GraphOptimizeResponse, Error, boolean | undefined>({
    mutationFn: (regenerateCommunities = true) =>
      optimizeGraph(regenerateCommunities),
    onSuccess: async () => {
      // 成功後重新取得圖譜資料
      await queryClient.invalidateQueries({ queryKey: ['graph'] });
    },
  });
}

/**
 * 重置並重算圖譜（不重新抽取文件實體）
 *
 * @param force - 是否強制執行
 */
export function useRebuildGraph() {
  const queryClient = useQueryClient();

  return useMutation<GraphRebuildResponse, Error, boolean | undefined>({
    mutationFn: (force = true) => rebuildGraph(force),
    onSuccess: async () => {
      // 成功後重新取得圖譜資料
      await queryClient.invalidateQueries({ queryKey: ['graph'] });
    },
  });
}

/**
 * 從所有 OCR 文件完整重構圖譜
 */
export function useRebuildFullGraph() {
  const queryClient = useQueryClient();

  return useMutation<GraphRebuildResponse, Error, void>({
    mutationFn: () => rebuildFullGraph(),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['graph'] });
    },
  });
}

/**
 * 重試單一文件的 GraphRAG 抽取
 */
export function useRetryGraphDocument() {
  const queryClient = useQueryClient();

  return useMutation<GraphRebuildResponse, Error, string>({
    mutationFn: (docId) => retryGraphDocument(docId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['graph'] });
    },
  });
}

/**
 * 清除單一文件殘留的 GraphRAG 資料
 */
export function usePurgeGraphDocument() {
  const queryClient = useQueryClient();

  return useMutation<GraphRebuildResponse, Error, string>({
    mutationFn: (docId) => purgeGraphDocument(docId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['graph'] });
    },
  });
}

/**
 * 啟動 node-vector 手動同步
 */
export function useStartNodeVectorSync() {
  const queryClient = useQueryClient();

  return useMutation<GraphRebuildResponse, Error, void>({
    mutationFn: () => startNodeVectorSync(),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['graph'] });
      await queryClient.invalidateQueries({
        queryKey: ['graph', 'node-vector-sync', 'status'],
      });
    },
  });
}
