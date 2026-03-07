export interface TestCase {
  id: string;
  question: string;
  ground_truth: string;
  category?: string | null;
  difficulty?: string | null;
  source_docs: string[];
  requires_multi_doc_reasoning: boolean;
  test_objective?: string | null;
}

export interface GoldenDatasetImportRequest {
  metadata?: Record<string, unknown>;
  questions: TestCase[];
}

export interface ImportResult {
  imported: number;
  total: number;
}

export interface DeleteResult {
  deleted_id: string;
  total: number;
}

export interface ModelConfig {
  id: string;
  name: string;
  model_name: string;
  temperature: number;
  top_p: number;
  top_k: number;
  max_input_tokens: number;
  max_output_tokens: number;
  thinking_mode: boolean;
  thinking_budget: number;
  created_at?: string;
  updated_at?: string;
}

export type ModelConfigInput = Omit<ModelConfig, 'id' | 'created_at' | 'updated_at'> & {
  id?: string;
};

export interface AvailableModel {
  name: string;
  display_name?: string | null;
  description?: string | null;
  input_token_limit?: number | null;
  output_token_limit?: number | null;
  supported_actions: string[];
}

export type CampaignMode = 'naive' | 'advanced' | 'graph' | 'agentic';
export type CampaignEvaluationPhase = 'execution' | 'evaluation';

export type CampaignLifecycleStatus =
  | 'pending'
  | 'running'
  | 'evaluating'
  | 'completed'
  | 'failed'
  | 'cancelled';

export type CampaignResultStatus = 'completed' | 'failed';

export interface CampaignConfigInput {
  test_case_ids: string[];
  modes: CampaignMode[];
  model_config: ModelConfig;
  model_config_id?: string;
  repeat_count: number;
  batch_size: number;
  rpm_limit: number;
}

export interface CampaignCreateRequest extends CampaignConfigInput {
  name?: string;
}

export interface CampaignCreateResponse {
  campaign_id: string;
  status: CampaignLifecycleStatus;
}

export interface CampaignStatus {
  id: string;
  name?: string | null;
  status: CampaignLifecycleStatus;
  phase: CampaignEvaluationPhase;
  config: CampaignConfigInput;
  completed_units: number;
  total_units: number;
  evaluation_completed_units: number;
  evaluation_total_units: number;
  current_question_id?: string | null;
  current_mode?: CampaignMode | null;
  error_message?: string | null;
  cancel_requested: boolean;
  created_at: string;
  started_at?: string | null;
  completed_at?: string | null;
  updated_at: string;
}

export interface CampaignResult {
  id: string;
  campaign_id: string;
  question_id: string;
  question: string;
  ground_truth: string;
  mode: CampaignMode;
  run_number: number;
  answer: string;
  contexts: string[];
  source_doc_ids: string[];
  expected_sources: string[];
  latency_ms: number;
  token_usage: Record<string, number>;
  category?: string | null;
  difficulty?: string | null;
  status: CampaignResultStatus;
  error_message?: string | null;
  created_at: string;
}

export interface CampaignResultsResponse {
  campaign: CampaignStatus;
  results: CampaignResult[];
}

export interface CampaignProgressEvent {
  campaign_id: string;
  status: CampaignLifecycleStatus;
  phase: CampaignEvaluationPhase;
  completed_units: number;
  total_units: number;
  evaluation_completed_units: number;
  evaluation_total_units: number;
  current_question_id?: string | null;
  current_mode?: CampaignMode | null;
  latest_result_id?: string | null;
}

export interface MetricAggregate {
  mean: number;
  max: number;
  stddev: number;
}

export interface CampaignMetricRow {
  campaign_result_id: string;
  question_id: string;
  question: string;
  mode: CampaignMode;
  run_number: number;
  category?: string | null;
  difficulty?: string | null;
  total_tokens: number;
  faithfulness: number;
  answer_correctness: number;
}

export interface ModeMetricsSummary {
  mode: CampaignMode;
  sample_count: number;
  faithfulness: MetricAggregate;
  answer_correctness: MetricAggregate;
  total_tokens: MetricAggregate;
  delta_answer_correctness: number;
  delta_total_tokens: number;
  ecr?: number | null;
  ecr_note?: string | null;
}

export interface CampaignMetricsResponse {
  campaign: CampaignStatus;
  evaluator_model: string;
  summary_by_mode: Partial<Record<CampaignMode, ModeMetricsSummary>>;
  rows: CampaignMetricRow[];
}

export type CampaignStreamEvent =
  | { type: 'campaign_snapshot'; data: CampaignStatus }
  | { type: 'campaign_progress'; data: CampaignProgressEvent }
  | { type: 'campaign_completed'; data: CampaignStatus }
  | { type: 'campaign_failed'; data: CampaignStatus }
  | { type: 'campaign_cancelled'; data: CampaignStatus };
