export interface Citation {
  doc_id: string;
  filename: string | null;
  page: number | null;
  snippet: string;
  score: number;
}

export interface EvaluationMetrics {
  faithfulness: 'grounded' | 'hallucinated' | 'uncertain';
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
}

/**
 * 子任務執行結果
 */
export interface SubTaskResult {
  id: number;
  question: string;
  answer: string;
  sources: string[];
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
  iteration: number;
}

