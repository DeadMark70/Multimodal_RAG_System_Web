/**
 * GraphRAG API 服務
 *
 * 端點：
 * - GET /graph/status - 圖譜狀態
 * - GET /graph/documents - 每份文件的 GraphRAG 狀態
 * - GET /graph/data - 圖譜節點/邊資料 (視覺化用)
 * - POST /graph/rebuild - 重置並重算圖譜狀態
 * - POST /graph/rebuild-full - 從所有 OCR 文件完整重構圖譜
 * - POST /graph/documents/{doc_id}/retry - 重試單一文件 GraphRAG
 * - DELETE /graph/documents/{doc_id} - 移除單一文件 GraphRAG 殘留
 * - POST /graph/optimize - 優化圖譜
 * - POST /graph/node-vector/sync - 手動同步節點嵌入索引
 * - GET /graph/node-vector/sync/status - 手動同步狀態
 */

import api from './api';
import type {
  GraphData,
  GraphDocumentStatusListResponse,
  NodeVectorSyncStatusResponse,
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
 * 取得每份文件的 GraphRAG 狀態
 */
export async function getGraphDocuments(): Promise<GraphDocumentStatusListResponse> {
  const response = await api.get<GraphDocumentStatusListResponse>('/graph/documents');
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
 * 重置並重算知識圖譜狀態
 *
 * @param force - 是否強制執行 (即使圖譜為空)
 */
export async function rebuildGraph(force = false): Promise<GraphRebuildResponse> {
  const response = await api.post<GraphRebuildResponse>('/graph/rebuild', { force });
  return response.data;
}

/**
 * 從所有 OCR 文件完整重構圖譜
 */
export async function rebuildFullGraph(): Promise<GraphRebuildResponse> {
  const response = await api.post<GraphRebuildResponse>('/graph/rebuild-full');
  return response.data;
}

/**
 * 重試單一文件的 GraphRAG 抽取
 */
export async function retryGraphDocument(docId: string): Promise<GraphRebuildResponse> {
  const response = await api.post<GraphRebuildResponse>(`/graph/documents/${docId}/retry`);
  return response.data;
}

/**
 * 移除單一文件殘留的 GraphRAG 內容
 */
export async function purgeGraphDocument(docId: string): Promise<GraphRebuildResponse> {
  const response = await api.delete<GraphRebuildResponse>(`/graph/documents/${docId}`);
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

/**
 * 啟動 node-vector 手動同步（背景工作）
 */
export async function startNodeVectorSync(): Promise<GraphRebuildResponse> {
  const response = await api.post<GraphRebuildResponse>('/graph/node-vector/sync');
  return response.data;
}

/**
 * 查詢 node-vector 手動同步狀態
 */
export async function getNodeVectorSyncStatus(): Promise<NodeVectorSyncStatusResponse> {
  const response = await api.get<NodeVectorSyncStatusResponse>('/graph/node-vector/sync/status');
  return response.data;
}
