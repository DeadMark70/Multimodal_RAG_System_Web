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
}

/**
 * 圖譜重置/重算回應
 *
 * @description 對應 POST /graph/rebuild
 */
export interface GraphRebuildResponse {
  status: 'started' | 'completed' | 'failed';
  message: string;
}

/**
 * 圖譜優化回應
 *
 * @description 對應 POST /graph/optimize
 */
export interface GraphOptimizeResponse {
  status: 'success' | 'failed';
  message: string;
  details?: {
    merges: number;
    communities: number;
    node_count: number;
  };
}

// ========== 圖譜搜尋模式 ==========

/**
 * GraphRAG 搜尋模式
 */
export type GraphSearchMode = 'local' | 'global' | 'hybrid' | 'auto';

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
