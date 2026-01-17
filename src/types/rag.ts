export interface Citation {
  doc_id: string;
  filename: string | null;
  page: number | null;
  snippet: string;
  score: number;
}

/**
 * 學術評估指標 (1-10 分制)
 * @version 3.0.0
 * 
 * 注意：1-10 分制欄位為可選，以支援向後相容舊版 API
 */
export interface EvaluationMetrics {
  // ========== 1-10 分制評估欄位 (🆕 v3.0) ==========
  /** 精確度 (1-10) - 資料準確性，權重 50% */
  accuracy?: number;
  /** 完整性 (1-10) - 回答是否涵蓋所有面向，權重 30% */
  completeness?: number;
  /** 清晰度 (1-10) - 邏輯表達與結構，權重 20% */
  clarity?: number;
  /** 加權總分 (由 accuracy*0.5 + completeness*0.3 + clarity*0.2 計算) */
  weighted_score?: number;
  /** 是否通過學術門檻 (weighted_score >= 7.0) */
  is_passing?: boolean;
  /** 改進建議 (當 is_passing 為 false 時提供) */
  suggestion?: string;

  // ========== 核心欄位 (必填) ==========
  /** 答案可信度 */
  faithfulness: 'grounded' | 'hallucinated' | 'uncertain';
  /** 信心分數 (0.0-1.0) */
  confidence_score: number;
}

export interface ChatMessage {
  id: string; // Front-end only ID for rendering
  role: 'user' | 'assistant';
  content: string;
  sources?: Citation[];
  metrics?: EvaluationMetrics;
  timestamp?: number;
}

export interface AskRequest {
  question: string;
  doc_ids?: string[] | null;
  history?: { role: 'user' | 'assistant'; content: string }[] | null;
  enable_hyde?: boolean;
  enable_multi_query?: boolean;
  enable_reranking?: boolean;
  enable_evaluation?: boolean;

  // ========== GraphRAG 參數 (🆕 v2.0) ==========
  /** 啟用知識圖譜增強檢索 */
  enable_graph_rag?: boolean;
  /** 圖譜搜尋模式 */
  graph_search_mode?: 'local' | 'global' | 'hybrid' | 'auto';
  /** 啟用圖譜輔助規劃 (Deep Research) */
  enable_graph_planning?: boolean;
}

export interface AskResponse {
  question: string;
  answer: string;
  sources: Citation[];
  metrics: EvaluationMetrics | null;
}

// ========== 文件管理型別 ==========

/**
 * 文件處理狀態
 */
export type ProcessingStatus = 
  | 'uploading'
  | 'ocr'
  | 'translating'
  | 'generating_pdf'
  | 'completed'
  | 'indexing'
  | 'indexed'
  | 'failed';

/**
 * 文件項目
 */
export interface DocumentItem {
  id: string;
  file_name: string;
  created_at: string;
  status: string | null;
  processing_step: ProcessingStatus | null;
}

// ========== 儀表板統計型別 ==========

/**
 * 文件統計
 */
export interface DocumentStat {
  doc_id: string;
  filename: string | null;
  query_count: number;
}

/**
 * 儀表板統計資料
 */
export interface DashboardStats {
  total_queries: number;
  accuracy_rate: number;
  grounded_count: number;
  hallucinated_count: number;
  uncertain_count: number;
  avg_confidence: number;
  queries_last_7_days: number[];
  top_documents: DocumentStat[];
}

// ========== 實驗結果型別 ==========

/**
 * 實驗結果 (用於匯出)
 */
export interface ExperimentResult {
  id: string;
  question: string;
  rag_answer: string;
  rag_faithfulness: 'grounded' | 'hallucinated' | 'uncertain' | null;
  rag_confidence: number | null;
  vanilla_answer: string;
  vanilla_faithfulness: 'grounded' | 'hallucinated' | 'uncertain' | null;
  vanilla_confidence: number | null;
  selected_docs: string[];
  timestamp: number;
}

// ========== Deep Research 型別 (🆕 v2.1) ==========

/**
 * 可編輯的研究子任務
 */
export interface EditableSubTask {
  id: number;
  question: string;
  task_type: 'rag' | 'graph_analysis';
  enabled: boolean;
}

/**
 * 研究計畫生成回應
 */
export interface ResearchPlanResponse {
  status: 'waiting_confirmation';
  original_question: string;
  sub_tasks: EditableSubTask[];
  estimated_complexity: 'simple' | 'medium' | 'complex';
  doc_ids: string[] | null;
}

/**
 * 執行計畫請求
 */
export interface ExecutePlanRequest {
  original_question: string;
  sub_tasks: EditableSubTask[];
  doc_ids?: string[];
  max_iterations?: number;
  enable_reranking?: boolean;
  enable_drilldown?: boolean;
  /** 🆕 v3.0 - 啟用進階圖片查證 (重新檢視圖片以驗證結論) */
  enable_deep_image_analysis?: boolean;
}


/**
 * 子任務執行結果
 */
export interface SubTaskResult {
  id: number;
  question: string;
  answer: string;
  sources: string[];
  contexts?: string[]; // 🆕 Phase 13: 原始文本片段
  is_drilldown: boolean;
  iteration: number;
}

/**
 * 執行計畫完整回應
 */
export interface ExecutePlanResponse {
  question: string;
  summary: string;
  detailed_answer: string;
  sub_tasks: SubTaskResult[];
  all_sources: string[];
  confidence: number;
  total_iterations: number;
  /** 🆕 Phase 6 - 完整評估指標 (若後端提供) */
  metrics?: EvaluationMetrics;
}

/**
 * SSE 事件類型
 */
export type SSEEventType = 
  | 'plan_confirmed'
  | 'task_start'
  | 'task_done'
  | 'drilldown_start'
  | 'drilldown_task_start'
  | 'drilldown_task_done'
  | 'synthesis_start'
  | 'complete'
  | 'error';

/**
 * SSE 事件資料
 */
export interface SSEEvent {
  type: SSEEventType;
  data: unknown;
}

/**
 * 任務進度狀態
 */
export interface TaskProgress {
  id: number;
  question: string;
  status: 'pending' | 'running' | 'done' | 'error';
  answer?: string;
  contexts?: string[]; // 🆕 Phase 13: 原始文本片段
  iteration: number;
}

