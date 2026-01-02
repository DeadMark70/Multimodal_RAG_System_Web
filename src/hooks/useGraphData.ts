/**
 * useGraphData Hooks
 *
 * 使用 React Query 管理知識圖譜資料
 * - Queries: 取得圖譜資料和狀態
 * - Mutations: 優化和重建圖譜
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getGraphData,
  getGraphStatus,
  optimizeGraph,
  rebuildGraph,
} from '../services/graphApi';
import type {
  GraphData,
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
    onSuccess: () => {
      // 成功後重新取得圖譜資料
      queryClient.invalidateQueries({ queryKey: ['graph'] });
    },
  });
}

/**
 * 重建圖譜 (重新抽取所有實體)
 *
 * @param force - 是否強制重建
 */
export function useRebuildGraph() {
  const queryClient = useQueryClient();

  return useMutation<GraphRebuildResponse, Error, boolean | undefined>({
    mutationFn: (force = true) => rebuildGraph(force),
    onSuccess: () => {
      // 成功後重新取得圖譜資料
      queryClient.invalidateQueries({ queryKey: ['graph'] });
    },
  });
}
