export interface TestCase {
  id: string;
  question: string;
  ground_truth: string;
  ground_truth_short?: string | null;
  key_points: string[];
  ragas_focus: string[];
  category?: string | null;
  difficulty?: string | null;
  source_docs: string[];
  requires_multi_doc_reasoning: boolean;
  test_objective?: string | null;
  question_version?: string | null;
  required_modalities?: string[];
  atomic_facts?: Array<Record<string, unknown>>;
  expected_evidence?: Array<Record<string, unknown>>;
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

export type ThinkingControlType = 'none' | 'budget' | 'level';
export type ThinkingLevel = 'minimal' | 'low' | 'medium' | 'high';

export interface ThinkingCapability {
  supported: boolean;
  control_type: ThinkingControlType;
  levels: ThinkingLevel[];
  budget_min?: number | null;
  budget_max?: number | null;
  supports_disable: boolean;
  supports_dynamic: boolean;
  default_level?: ThinkingLevel | null;
  default_budget?: number | null;
  guidance?: string | null;
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
  thinking_budget?: number | null;
  thinking_level?: ThinkingLevel | null;
  thinking_include_thoughts?: boolean;
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
  thinking: ThinkingCapability;
}

export type CampaignMode = 'naive' | 'advanced' | 'graph' | 'agentic' | 'router';
export type CampaignEvaluationPhase = 'execution' | 'evaluation';
export type CampaignMetricName = string;
export type ReferenceSource = 'ground_truth_short' | 'ground_truth_fallback_long';
export type TokenUsage = Record<string, unknown> & {
  total_tokens?: number;
  input_tokens?: number;
  output_tokens?: number;
  reasoning_tokens?: number;
};

export interface AblationCondition {
  condition_id: string;
  label: string;
  mode: CampaignMode;
  ablation_flags?: Record<string, unknown>;
  budget?: Record<string, unknown> | null;
}

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
  ablation_conditions?: AblationCondition[];
  model_config: ModelConfig;
  model_config_id?: string;
  repeat_count: number;
  batch_size: number;
  rpm_limit: number;
  ragas_batch_size: number;
  ragas_parallel_batches: number;
  ragas_rpm_limit: number;
}

export interface CampaignCreateRequest extends CampaignConfigInput {
  name?: string;
}

export interface CampaignCreateResponse {
  campaign_id: string;
  status: CampaignLifecycleStatus;
}

export interface CampaignEvaluateRequest {
  question_ids?: string[];
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
  ground_truth_short?: string | null;
  key_points: string[];
  ragas_focus: string[];
  mode: CampaignMode;
  execution_profile?: string | null;
  context_policy_version?: string | null;
  run_number: number;
  repeat_number?: number;
  answer: string;
  contexts: string[];
  source_doc_ids: string[];
  expected_sources: string[];
  latency_ms: number;
  token_usage: TokenUsage;
  category?: string | null;
  difficulty?: string | null;
  status: CampaignResultStatus;
  error_message?: string | null;
  question_version?: string | null;
  request_id?: string | null;
  started_at?: string | null;
  completed_at?: string | null;
  total_latency_ms?: number | null;
  total_tokens?: number | null;
  question_snapshot?: Record<string, unknown>;
  model_config_snapshot?: Record<string, unknown>;
  system_version_snapshot?: Record<string, unknown>;
  derived_metrics?: Record<string, unknown>;
  final_answer_hash?: string | null;
  has_trace: boolean;
  created_at: string;
}

export interface CampaignResultsResponse {
  campaign: CampaignStatus;
  results: CampaignResult[];
}

export interface CampaignOverviewResponse {
  campaign_id: string;
  analysis_unit: 'execution' | 'question' | 'category';
  sample_count: number;
  independent_question_count: number;
  repeat_count: number;
  sample_note: string;
  mode_counts: Record<string, number>;
  total_tokens: number;
  total_cost_usd?: number | null;
  total_cost_twd?: number | null;
  cost_status: 'complete' | 'partial' | 'unknown';
  priced_call_count: number;
  unpriced_call_count: number;
  avg_latency_ms?: number | null;
}

export interface AnalyticsAggregateResponse {
  campaign_id: string;
  analysis_unit: 'execution' | 'question' | 'category';
  sample_count: number;
  independent_question_count: number;
  repeat_count: number;
  sample_note: string;
  warnings: string[];
  rows: Array<Record<string, unknown>>;
  summaries: Record<string, unknown>;
}

export type ModeComparisonResponse = AnalyticsAggregateResponse;

export type QuestionComparisonResponse = AnalyticsAggregateResponse;

export type CostLatencyResponse = AnalyticsAggregateResponse;

export interface RouterAnalysisResponse extends AnalyticsAggregateResponse {
  analysis_type: 'retrospective' | 'actual';
}

export type AblationResponse = AnalyticsAggregateResponse;

export type HumanVsAutoResponse = AnalyticsAggregateResponse;

export type RepeatStabilitySummary = AnalyticsAggregateResponse;

export interface EvaluationRunListItem {
  run_id: string;
  campaign_id: string;
  question_id: string;
  question: string;
  mode: CampaignMode;
  run_number: number;
  repeat_number?: number;
  status: CampaignResultStatus;
  total_tokens: number;
  total_latency_ms?: number | null;
  created_at: string;
}

export interface EvaluationRunListResponse {
  campaign_id: string;
  runs: EvaluationRunListItem[];
}

export interface RunTraceResponse {
  run_id: string;
  campaign_id: string;
  trace_events: Array<Record<string, unknown>>;
  routing_decisions: Array<Record<string, unknown>>;
}

export interface RunRetrievalResponse {
  run_id: string;
  campaign_id: string;
  retrieval_events: Array<Record<string, unknown>>;
  retrieval_chunks: Array<Record<string, unknown>>;
}

export interface RunContextResponse {
  run_id: string;
  campaign_id: string;
  context_packs: Array<Record<string, unknown>>;
}

export interface RunLlmCallsResponse {
  run_id: string;
  campaign_id: string;
  llm_calls: Array<Record<string, unknown>>;
}

export interface RunClaimsResponse {
  run_id: string;
  campaign_id: string;
  claims: Array<Record<string, unknown>>;
}

export interface RunMetricsResponse {
  run_id: string;
  campaign_id: string;
  derived_metrics: Record<string, unknown>;
  token_usage: Record<string, unknown>;
  total_tokens: number;
  latency_ms: number;
  total_latency_ms?: number | null;
}

export interface RunDiffResponse {
  run_id: string;
  baseline_run_id: string;
  campaign_id: string;
  baseline_campaign_id: string;
  token_delta: number;
  latency_delta_ms: number;
  comparable: boolean;
  comparison_scope: 'same_run' | 'same_campaign_question' | 'cross_campaign';
  answer_changed: boolean;
  answer_change_status: 'changed' | 'unchanged' | 'unknown';
  derived_metric_delta: Record<string, number>;
}

export interface RunDetailResponse {
  run_id: string;
  campaign_id: string;
  trace_events: Array<Record<string, unknown>>;
  llm_calls: Array<Record<string, unknown>>;
  retrieval_events: Array<Record<string, unknown>>;
  retrieval_chunks: Array<Record<string, unknown>>;
  context_packs: Array<Record<string, unknown>>;
  tool_calls: Array<Record<string, unknown>>;
  routing_decisions: Array<Record<string, unknown>>;
  claims: Array<Record<string, unknown>>;
  human_ratings: Array<Record<string, unknown>>;
}

export interface ExportCampaignRequest {
  include_raw_trace_payloads?: boolean;
  include_prompt_previews?: boolean;
  include_full_prompts?: boolean;
  include_answers?: boolean;
  include_retrieved_excerpts?: boolean;
  format?: 'json';
}

export interface ExportCampaignResponse extends Record<string, unknown> {
  campaign?: Record<string, unknown>;
  redaction?: Record<string, unknown>;
  runs?: Array<Record<string, unknown>>;
  metrics?: Record<string, unknown>;
  trace_events?: Array<Record<string, unknown>>;
  llm_calls?: Array<Record<string, unknown>>;
  retrieval_summary?: Array<Record<string, unknown>>;
  claim_summary?: Array<Record<string, unknown>>;
}

export interface HumanRatingRequest {
  rubric_version: string;
  correctness_score: number;
  faithfulness_score: number;
  completeness_score: number;
  citation_quality_score: number;
  usefulness_score: number;
  comments?: string | null;
  is_blinded?: boolean;
  shown_mode_label?: boolean;
}

export interface HumanRatingResponse extends Record<string, unknown> {
  human_rating_id?: string;
  run_id: string;
}

export interface HumanEvalQueueItem extends Record<string, unknown> {
  run_id: string;
  campaign_id: string;
  question_id: string;
  question: string;
  mode: CampaignMode;
  run_number: number;
  repeat_number?: number;
  answer_preview: string;
  existing_rating_count: number;
  already_rated_by_current_user: boolean;
}

export interface HumanEvalQueueResponse {
  campaign_id: string;
  rows: HumanEvalQueueItem[];
}

export interface SanitizedErrorRow extends Record<string, unknown> {
  run_id: string;
  campaign_id: string;
  stage_name: string;
  code?: string | null;
  message: string;
  source: 'run' | 'trace' | 'llm_call';
  created_at: string;
}

export interface CampaignErrorsResponse {
  campaign_id: string;
  rows: SanitizedErrorRow[];
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
  ragas_focus: string[];
  reference_source?: ReferenceSource | null;
  context_policy_version?: string | null;
  total_tokens: number;
  metric_values: Record<string, number>;
  invalid_metrics?: Record<string, boolean>;
  invalid_reasons?: Record<string, string>;
  faithfulness: number;
  answer_correctness: number;
}

export interface GroupMetricsSummary {
  group_key: string;
  sample_count: number;
  metric_summaries: Record<string, MetricAggregate>;
  total_tokens: MetricAggregate;
}

export interface ModeMetricsSummary {
  mode: CampaignMode;
  sample_count: number;
  metric_summaries: Record<string, MetricAggregate>;
  faithfulness: MetricAggregate;
  answer_correctness: MetricAggregate;
  total_tokens: MetricAggregate;
  delta_answer_correctness: number;
  delta_faithfulness: number;
  delta_total_tokens: number;
  ecr?: number | null;
  ecr_note?: string | null;
  ecr_faithfulness?: number | null;
  ecr_faithfulness_note?: string | null;
  ecr_direction_correctness?: 'positive' | 'neutral' | 'negative';
  ecr_direction_faithfulness?: 'positive' | 'neutral' | 'negative';
}

export interface DeltaModeSummary {
  mode: CampaignMode;
  sample_count: number;
  answer_correctness_mean: number;
  faithfulness_mean: number;
  total_tokens_mean: number;
  delta_answer_correctness?: number | null;
  delta_faithfulness?: number | null;
  delta_total_tokens?: number | null;
  ecr?: number | null;
  ecr_note?: string | null;
  ecr_faithfulness?: number | null;
  ecr_faithfulness_note?: string | null;
  ecr_direction_correctness?: 'positive' | 'neutral' | 'negative';
  ecr_direction_faithfulness?: 'positive' | 'neutral' | 'negative';
}

export interface DeltaGroupSummary {
  group_key: string;
  by_mode: Partial<Record<CampaignMode, DeltaModeSummary>>;
}

export interface EvaluationWarnings {
  total_metric_rows: number;
  invalid_metric_rows: number;
  invalid_ratio: number;
  invalid_by_metric: Record<string, number>;
}

export interface CampaignMetricsResponse {
  campaign: CampaignStatus;
  evaluator_model: string;
  available_metrics: CampaignMetricName[];
  summary_by_mode: Partial<Record<CampaignMode, ModeMetricsSummary>>;
  summary_by_category: Record<string, GroupMetricsSummary>;
  summary_by_focus: Record<string, GroupMetricsSummary>;
  delta_by_category: Record<string, DeltaGroupSummary>;
  delta_by_difficulty: Record<string, DeltaGroupSummary>;
  delta_by_question: Record<string, DeltaGroupSummary>;
  evaluation_warnings?: EvaluationWarnings;
  rows: CampaignMetricRow[];
}

export type AgentTracePhase = 'planning' | 'execution' | 'drilldown' | 'evaluation' | 'synthesis';
export type AgentTraceStatus = 'completed' | 'partial' | 'failed';

export interface AgentTraceToolCall {
  index: number;
  action: string;
  status: AgentTraceStatus;
  payload: Record<string, unknown>;
  result_preview?: string | null;
}

export interface AgentTraceStep {
  step_id: string;
  phase: AgentTracePhase;
  step_type: string;
  title: string;
  status: AgentTraceStatus;
  started_at?: string | null;
  completed_at?: string | null;
  input_preview?: string | null;
  output_preview?: string | null;
  raw_text?: string | null;
  tool_calls: AgentTraceToolCall[];
  token_usage: TokenUsage;
  metadata: Record<string, unknown>;
}

export interface AgentTraceSummary {
  trace_id: string;
  campaign_result_id: string;
  question_id: string;
  question: string;
  mode: CampaignMode;
  execution_profile?: string | null;
  question_intent?: string | null;
  run_number: number;
  trace_status: AgentTraceStatus;
  summary: string;
  step_count: number;
  tool_call_count: number;
  visual_verification_attempted?: boolean;
  visual_tool_call_count?: number;
  visual_force_fallback_used?: boolean;
  total_tokens: number;
  created_at: string;
}

export interface AgentTraceDetail extends AgentTraceSummary {
  campaign_id: string;
  required_coverage?: string[];
  coverage_gaps?: string[];
  subtask_coverage_status?: Record<string, boolean>;
  steps: AgentTraceStep[];
}

export interface CampaignGranularStreamEventData {
  event_schema_version: string;
  sequence: number;
  campaign_id: string;
  run_id?: string | null;
  span_id?: string | null;
  parent_span_id?: string | null;
  stage_type?: string | null;
  stage_name?: string | null;
  status: string;
  created_at: string;
  payload: Record<string, unknown>;
}

export type CampaignStreamEvent =
  | { type: 'campaign_snapshot'; data: CampaignStatus }
  | { type: 'campaign_progress'; data: CampaignProgressEvent }
  | { type: 'campaign_completed'; data: CampaignStatus }
  | { type: 'campaign_failed'; data: CampaignStatus }
  | { type: 'campaign_cancelled'; data: CampaignStatus }
  | { type: 'run_started'; data: CampaignGranularStreamEventData }
  | { type: 'routing_completed'; data: CampaignGranularStreamEventData }
  | { type: 'retrieval_completed'; data: CampaignGranularStreamEventData }
  | { type: 'generation_completed'; data: CampaignGranularStreamEventData }
  | { type: 'metric_completed'; data: CampaignGranularStreamEventData }
  | { type: 'run_completed'; data: CampaignGranularStreamEventData }
  | { type: 'run_failed'; data: CampaignGranularStreamEventData };


