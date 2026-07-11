/**
 * Graph Types - 知識圖譜類型定義
 *
 * 用於 GraphRAG 視覺化元件
 *
 * @remarks
 * - 與後端 /graph/status, /graph/data API 對齊
 * - 用於 react-force-graph-2d 力導向圖
 */

// ========== 圖譜節點 ==========

/**
 * 知識圖譜節點
 *
 * @description 對應後端 NetworkX 節點結構，包含 d3-force 模擬屬性
 */
export interface GraphNode {
  /** 節點唯一識別碼 (通常是實體名稱) */
  id: string;

  /** 社群分組 (用於著色) */
  group: number;

  /** 節點大小值 (基於關聯數量或重要性) */
  val: number;

  /** 實體描述/摘要 */
  desc?: string;

  /** 實體類型 (Person, Organization, Concept 等) */
  type?: string;

  /** 來源文件 ID 列表 */
  source_docs?: string[];

  // ========== D3 Force Simulation Properties ==========
  /** 當前 X 座標 (由 d3-force 計算) */
  x?: number;
  /** 當前 Y 座標 (由 d3-force 計算) */
  y?: number;
  /** X 方向速度 */
  vx?: number;
  /** Y 方向速度 */
  vy?: number;
  /** 固定 X 座標 (拖曳後) */
  fx?: number | null;
  /** 固定 Y 座標 (拖曳後) */
  fy?: number | null;
}

// ========== 圖譜邊 (關係) ==========

/**
 * 知識圖譜邊 (關係連結)
 */
export interface GraphLink {
  /** 來源節點 ID */
  source: string;

  /** 目標節點 ID */
  target: string;

  /** 關係標籤 (例如: "works_at", "is_part_of") */
  label?: string;

  /** 關係權重 (用於邊的粗細) */
  weight?: number;
}

// ========== 圖譜資料 ==========

/**
 * 完整圖譜資料 (用於渲染)
 */
export interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

// ========== API 回應類型 ==========

/**
 * 圖譜狀態回應
 *
 * @description 對應 GET /graph/status
 */
export interface GraphStatusResponse {
  /** 是否已有知識圖譜 */
  has_graph: boolean;

  /** 節點數量 */
  node_count: number;

  /** 邊數量 */
  edge_count: number;

  /** 社群數量 */
  community_count: number;

  /** 待解析的實體數量 (需要融合) */
  pending_resolution: number;

  /** 是否需要優化 */
  needs_optimization: boolean;

  /** 最後更新時間 */
  last_updated: string | null;

  /** 各層級社群數量 */
  community_level_counts?: Record<string, number>;

  /** 最後優化時間 */
  last_optimized_at?: string | null;

  /** 可供完整重構的文件數量 */
  eligible_document_count: number;

  /** GraphRAG 成功文件數量 */
  indexed_document_count: number;

  /** GraphRAG 失敗文件數量 */
  failed_document_count: number;

  /** GraphRAG 部分成功文件數量 */
  partial_document_count: number;

  /** 成功執行但 0 entities 的文件數量 */
  empty_document_count: number;

  /** 目前執行中的圖譜工作 */
  active_job_state: string | null;
}

/**
 * 圖譜重置/重算回應
 *
 * @description 對應 POST /graph/rebuild
 */
export interface GraphRebuildResponse {
  status: 'started' | 'completed' | 'failed' | 'skipped';
  message: string;
  details?: Record<string, unknown>;
}

export type GraphRebuildJobState =
  | 'pending'
  | 'running'
  | 'interrupted'
  | 'completed_with_failures'
  | 'failed'
  | 'completed';

export type GraphRebuildPhase =
  | 'preparing'
  | 'extracting'
  | 'retry_wait'
  | 'optimizing'
  | 'building_communities'
  | 'syncing_sidecars'
  | 'validating'
  | 'publishing'
  | 'done';

export type GraphRebuildDocumentState =
  | 'pending'
  | 'running'
  | 'retry_wait'
  | 'indexed'
  | 'empty'
  | 'partial'
  | 'failed';

export interface GraphRebuildDocumentStatus {
  doc_id: string;
  file_name: string | null;
  state: GraphRebuildDocumentState;
  attempt: number;
  cumulative_attempts: number;
  chunk_count: number;
  chunks_succeeded: number;
  chunks_failed: number;
  entities_added: number;
  edges_added: number;
  last_error: string | null;
  started_at: string | null;
  completed_at: string | null;
}

export interface GraphRebuildStatus {
  job_id: string;
  state: GraphRebuildJobState;
  phase: GraphRebuildPhase;
  total: number;
  processed: number;
  succeeded: number;
  empty: number;
  failed: number;
  partial: number;
  pending: number;
  progress_percent: number;
  current_document: GraphRebuildDocumentStatus | null;
  documents: GraphRebuildDocumentStatus[];
  can_resume: boolean;
  can_retry_failed: boolean;
  live_graph_unchanged: boolean;
  last_error: string | null;
}

/**
 * 圖譜優化回應
 *
 * @description 對應 POST /graph/optimize
 */
export interface GraphOptimizeResponse {
  status: 'success' | 'failed' | 'skipped';
  message: string;
  details?: {
    merges: number;
    communities: number;
    node_count: number;
  };
}

export type GraphDocumentExtractionState =
  | 'indexed'
  | 'partial'
  | 'empty'
  | 'failed'
  | 'running'
  | 'skipped';

export type GraphExtractionProfile = 'standard' | 'high_precision';

export interface GraphDocumentStatusItem {
  doc_id: string;
  status: GraphDocumentExtractionState;
  chunk_count: number;
  chunks_succeeded: number;
  chunks_failed: number;
  entities_added: number;
  edges_added: number;
  last_error: string | null;
  last_attempted_at: string | null;
  last_succeeded_at: string | null;
  file_name: string | null;
  is_eligible: boolean;
  extraction_model?: string | null;
  extraction_thinking_level?: string | null;
  extraction_profile?: GraphExtractionProfile | null;
  extraction_prompt_version?: string | null;
  extraction_recorded_at?: string | null;
}

export interface GraphDocumentStatusListResponse {
  documents: GraphDocumentStatusItem[];
  total: number;
}

export type NodeVectorSyncState = 'idle' | 'running' | 'completed' | 'failed';

export interface NodeVectorSyncStatusResponse {
  state: NodeVectorSyncState;
  processed: number;
  total: number;
  changed: number;
  reused: number;
  removed: number;
  index_state: string | null;
  autosync_duration_ms: number | null;
  last_error: string | null;
  started_at: string | null;
  updated_at: string | null;
  finished_at: string | null;
}

// ========== 圖譜搜尋模式 ==========

/**
 * GraphRAG 搜尋模式
 */
export type GraphSearchMode = 'local' | 'global' | 'hybrid' | 'auto' | 'generic';

export interface GraphQualityIssue {
  code: string;
  severity: 'info' | 'warning' | 'critical';
  message: string;
  recommended_action: string;
}

export interface GraphQualityResponse {
  score: number;
  num_nodes: number;
  num_edges: number;
  edge_with_provenance_ratio: number;
  generic_relation_ratio: number;
  duplicate_method_node_ratio: number;
  orphan_node_ratio: number;
  graph_to_chunk_success_rate?: number | null;
  table_coverage_ratio?: number | null;
  figure_coverage_ratio?: number | null;
  formula_coverage_ratio?: number | null;
  claim_scope_missing_count: number;
  issues: GraphQualityIssue[];
}

export interface GraphRuntimeQualityResponse {
  campaign_id: string | null;
  community_summary_used_as_evidence_count: number;
  unsupported_graph_claim_rate: number | null;
  graph_context_noise_ratio: number | null;
  unresolved_anchor_count: number;
  graph_to_chunk_success_rate: number | null;
  issues: GraphQualityIssue[];
}

export interface GraphDebugSearchRequest {
  query: string;
  search_mode?: GraphSearchMode;
}

export interface GraphDebugEvidenceItem {
  item_id: string;
  source: string;
  summary: string;
  provenance_status: 'full' | 'partial' | 'missing';
  resolution_status: 'resolved' | 'fuzzy_resolved' | 'unresolved' | 'stale';
  verification_status: 'quote_match' | 'quote_mismatch' | 'hash_mismatch' | 'not_checked';
  usable_as_context: boolean;
  use_reason: string;
  source_chunk_ids: string[];
  asset_ids: string[];
}

export interface GraphDebugSearchResponse {
  query: string;
  route: string;
  entity_links: Array<Record<string, unknown>>;
  hints: Array<Record<string, unknown>>;
  evidence_items: GraphDebugEvidenceItem[];
  final_context_items: GraphDebugEvidenceItem[];
}

// ========== React Force Graph 專用類型 ==========

/**
 * 力導向圖相機位置
 */
export interface GraphCameraPosition {
  x: number;
  y: number;
  k: number; // zoom level
}

/**
 * 節點點擊事件資料
 */
export interface NodeClickEvent {
  node: GraphNode;
  event: MouseEvent;
}
