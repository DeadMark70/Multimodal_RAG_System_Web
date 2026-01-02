/**
 * GraphRAG API 服務
 *
 * 端點：
 * - GET /graph/status - 圖譜狀態
 * - GET /graph/data - 圖譜節點/邊資料 (視覺化用)
 * - POST /graph/rebuild - 重建圖譜
 * - POST /graph/optimize - 優化圖譜
 */

import api from './api';
import type {
  GraphData,
  GraphStatusResponse,
  GraphRebuildResponse,
  GraphOptimizeResponse,
} from '../types/graph';

/**
 * 取得圖譜狀態
 */
export async function getGraphStatus(): Promise<GraphStatusResponse> {
  const response = await api.get<GraphStatusResponse>('/graph/status');
  return response.data;
}

/**
 * 取得圖譜視覺化資料 (節點與邊)
 *
 * @description 用於 react-force-graph-2d 渲染
 */
export async function getGraphData(): Promise<GraphData> {
  const response = await api.get<GraphData>('/graph/data');
  return response.data;
}

/**
 * 重建知識圖譜
 *
 * @param force - 是否強制重建 (即使圖譜為空)
 */
export async function rebuildGraph(force = false): Promise<GraphRebuildResponse> {
  const response = await api.post<GraphRebuildResponse>('/graph/rebuild', { force });
  return response.data;
}

/**
 * 優化知識圖譜 (實體融合與社群重建)
 *
 * @param regenerateCommunities - 是否重新生成社群摘要
 */
export async function optimizeGraph(
  regenerateCommunities = true
): Promise<GraphOptimizeResponse> {
  const response = await api.post<GraphOptimizeResponse>('/graph/optimize', {
    regenerate_communities: regenerateCommunities,
  });
  return response.data;
}
