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

export type CampaignMode =
  | 'naive'
  | 'naive-baseline'
  | 'advanced'
  | 'graph'
  | 'agentic'
  | 'agentic-v8'
  | 'v8'
  | 'agentic-v9'
  | 'v9'
  | 'agentic-v9-shadow'
  | 'router'
  | 'graph_raw_current'
  | 'graph_provenance_gated'
  | 'graph_locator_to_chunk'
  | 'graph_locator_claim_gate'
  | 'always_no_graph'
  | 'always_graph_locator'
  | 'router_auto_graph'
  | 'oracle_graph_router'
  | 'graph_local_first'
  | 'graph_global_first'
  | 'graph_blended'
  | 'graph_path_pruned'
  | 'graph_planning_only';
export type CampaignEvaluationPhase = 'execution' | 'evaluation';
export type AgenticExecutionVersion = 'v8' | 'v9';
export type ShadowEvaluationPolicy = 'operational' | 'research';
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
  | 'completed_with_errors'
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
  /** Stored execution identity; omitted by historical v8 campaign payloads. */
  agentic_execution_version?: AgenticExecutionVersion;
  /** Only meaningful for an explicit v9 shadow condition. */
  shadow_evaluation_policy?: ShadowEvaluationPolicy | null;
  /** Shared immutable benchmark identity for cross-campaign release comparisons. */
  benchmark_id?: string | null;
  /** Execution-time-authoritative observability policy; exports cannot recover uncaptured prompts. */
  prompt_capture_policy?: PromptCapturePolicy;
}

export interface PromptCapturePolicy {
  hash?: boolean;
  preview?: boolean;
  full_prompt?: boolean;
  preview_max_chars?: number;
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
  condition_id?: string | null;
  agentic_execution_version?: AgenticExecutionVersion;
  execution_identity?: string | null;
  shadow_evaluation_policy?: ShadowEvaluationPolicy | null;
  response_status?: string | null;
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

export type ResearchQualityStatus = 'complete' | 'evaluating' | 'partial' | 'failed' | 'not_requested';
export type TokenAccountingStatus = 'complete' | 'partial' | 'incomplete_legacy';
export type ResearchPricingStatus = 'complete' | 'partial' | 'unknown';
export type PhaseAttributionStatus = 'complete' | 'partial' | 'not_available';

export interface ResearchMetricObservation {
  value: number | null;
  status: ResearchQualityStatus;
  valid_samples: number;
  missing_samples: number;
  failed_samples: number;
  evaluator_model: string | null;
  metric_version: string | null;
}

export interface ResearchLatencySummary {
  mean_ms: number | null;
  p50_ms: number | null;
  p95_ms: number | null;
  sample_count: number;
  method: 'nearest_rank';
  low_sample_size: boolean;
}

export interface ResearchTokenBreakdown {
  input_tokens: number | null;
  output_text_tokens: number | null;
  reasoning_tokens: number | null;
  other_tokens: number | null;
  total_tokens: number | null;
  by_phase: Record<string, number>;
  observed_call_count?: number;
  measured_call_count?: number;
  missing_usage_call_count?: number;
  unbalanced_call_count?: number;
  unclassified_phase_call_count?: number;
  missing_usage_by_phase?: Record<string, number>;
  missing_usage_by_purpose?: Record<string, number>;
  missing_usage_by_provider?: Record<string, number>;
  accounting_status: TokenAccountingStatus;
  phase_attribution_status: PhaseAttributionStatus;
  phase_attribution_reasons?: string[];
}

/** Fully serialized selected-run diagnostics; backend defaults are always present. */
export interface EvaluationAccountingDiagnostics extends ResearchTokenBreakdown {
  observed_call_count: number;
  measured_call_count: number;
  missing_usage_call_count: number;
  unbalanced_call_count: number;
  unclassified_phase_call_count: number;
  missing_usage_by_phase: Record<string, number>;
  missing_usage_by_purpose: Record<string, number>;
  missing_usage_by_provider: Record<string, number>;
  phase_attribution_reasons: string[];
}

export interface ResearchCostSummary {
  benchmark_usd: number | null;
  operational_usd: number | null;
  pricing_status: ResearchPricingStatus;
  priced_call_count: number;
  unpriced_call_count: number;
}

export interface ModeResearchSummary {
  mode: string;
  sample_count: number;
  comparable: boolean;
  not_comparable_reasons: string[];
  quality: Record<string, ResearchMetricObservation>;
  latency: ResearchLatencySummary;
  tokens: ResearchTokenBreakdown;
  execution_cost: ResearchCostSummary;
}

export interface EvaluationOverheadSummary {
  tokens: ResearchTokenBreakdown;
  cost_usd: number | null;
  pricing_status: ResearchPricingStatus;
  evaluator_models: string[];
  metric_names: string[];
  batch_count: number;
  retry_count: number | null;
}

export interface ResearchWarning {
  code: string;
  message: string;
  mode: string | null;
}

export interface CampaignResearchSummaryResponse {
  campaign_id: string;
  research_schema_version: '2';
  completed_run_count: number;
  total_run_count: number;
  failed_run_count: number;
  quality_status: ResearchQualityStatus;
  token_accounting_status: TokenAccountingStatus;
  pricing_status: ResearchPricingStatus;
  phase_attribution_status: PhaseAttributionStatus;
  sample_count: number;
  quality: Record<string, ResearchMetricObservation>;
  latency: ResearchLatencySummary;
  tokens: ResearchTokenBreakdown;
  execution_cost: ResearchCostSummary;
  modes: ModeResearchSummary[];
  evaluation_overhead: EvaluationOverheadSummary;
  warnings: ResearchWarning[];
}

export interface AnalyticsAggregateResponse<T = Record<string, unknown>> {
  campaign_id: string;
  analysis_unit: 'execution' | 'question' | 'category';
  sample_count: number;
  independent_question_count: number;
  repeat_count: number;
  sample_note: string;
  warnings: string[];
  rows: T[];
  summaries: Record<string, unknown>;
}

export type ModeComparisonResponse = AnalyticsAggregateResponse;

export type QuestionMetricStatus = 'complete' | 'partial' | 'not_available' | 'not_instrumented';
export type QuestionAccountingStatus = 'complete' | 'partial' | 'not_available';

export interface QuestionModeComparison {
  mode: CampaignMode;
  sample_count: number;
  answer_correctness: number | null;
  faithfulness: number | null;
  answer_relevancy: number | null;
  mean_latency_ms: number | null;
  mean_tokens: number | null;
  quality_status: QuestionMetricStatus;
  accounting_status: QuestionAccountingStatus;
}

export interface QuestionComparisonRow {
  question_id: string;
  category: string | null;
  difficulty: string | null;
  required_modalities: string[] | null;
  by_mode: QuestionModeComparison[];
  delta_correctness: number | null;
  delta_faithfulness: number | null;
  delta_latency_ms: number | null;
  delta_tokens: number | null;
  ecr_correctness: number | null;
  best_quality_mode: CampaignMode | null;
  evidence_coverage: number | null;
  unsupported_claim_ratio: number | null;
  comparability_reason: string | null;
}

export interface ResearchQuestionComparisonResponse extends AnalyticsAggregateResponse<QuestionComparisonRow> {
  rows: QuestionComparisonRow[];
}

export interface AgentBehaviorRow {
  run_id: string;
  campaign_id: string;
  question_id: string;
  mode: CampaignMode;
  repeat_number: number;
  behavior_schema?: 'v8' | 'v9' | 'not_applicable';
  trace_status: string;
  failure_reason?: string | null;
  accounting_status: 'complete' | 'partial' | 'not_available';
  subtasks: number | null;
  tool_calls: number | null;
  visual_calls: number | null;
  graph_calls: number | null;
  drilldown_depth: number | null;
  correctness: number | null;
  faithfulness: number | null;
  unsupported_claim_ratio: number | null;
  supported_claim_ratio: number | null;
  total_tokens: number | null;
  legacy?: LegacyAgentBehaviorMetrics | null;
  v9?: V9AgentBehaviorMetrics | null;
}

export interface LegacyAgentBehaviorMetrics {
  subtasks: number | null;
  tool_calls: number | null;
  visual_calls: number | null;
  graph_calls: number | null;
  drilldown_depth: number | null;
}

export type BehaviorExecutionState = 'not_requested' | 'not_triggered' | 'executed' | 'failed' | 'required_but_not_satisfied' | 'not_instrumented';

export interface V9AgentBehaviorMetrics {
  route: string | null;
  contract_version?: string | null;
  slot_plan_status?: string | null;
  slot_semantics?: string | null;
  /** Experimental/unknown remains nullable; the UI must never infer it from generic slots. */
  atomic_completeness?: boolean | null;
  atomic_completeness_reason?: string | null;
  graph_policy: string | null;
  visual_requested?: boolean | null;
  visual_required: boolean | null;
  evidence_extraction_required: boolean | null;
  retrieval_query_count: number | null;
  provider_attempt_count: number | null;
  final_generation_count: number | null;
  evidence_packet_count: number | null;
  packed_evidence_count: number | null;
  slot_resolution_count: number | null;
  required_slot_count: number | null;
  supported_slot_count: number | null;
  repair_count: number | null;
  final_claim_count: number | null;
  reserved_tokens: number | null;
  reconciled_tokens: number | null;
  candidate_packet_count?: number | null;
  qualified_packet_count?: number | null;
  qualification_round_count?: number | null;
  qualification_provider_call_count?: number | null;
  qualification_failure_code?: string | null;
  graph_execution: BehaviorExecutionState;
  visual_execution: BehaviorExecutionState;
}

export interface AgentBehaviorResponse extends AnalyticsAggregateResponse<AgentBehaviorRow> {
  behavior_schema_version?: '2';
  rows: AgentBehaviorRow[];
}

export type QuestionComparisonResponse = AnalyticsAggregateResponse;

export type CostLatencyResponse = AnalyticsAggregateResponse;

export interface RouterAnalysisRow {
  routing_decision_id: string;
  run_id: string;
  campaign_id: string;
  question_id: string;
  repeat_number: number;
  span_id?: string | null;
  selected_mode: CampaignMode;
  analysis_type: 'retrospective';
  decision_source: 'deterministic' | 'llm_planner' | 'safe_fallback' | null;
  candidate_routes: string[];
  matched_rules: string[];
  fallback_reason: string | null;
  confidence: number | null;
  reason: string | null;
  created_at: string;
}

export interface RouterAnalysisResponse extends AnalyticsAggregateResponse<RouterAnalysisRow> {
  analysis_type: 'retrospective';
}

export type ConditionMetricName = 'answer_correctness' | 'faithfulness' | 'answer_relevancy';

export interface ConditionMetricSummary {
  mean: number | null;
  valid_count: number;
  missing_count: number;
}

export interface ConditionAggregate {
  condition_id: string;
  label: string;
  ablation_flags: Record<string, unknown>;
  execution_count: number;
  completed_count: number;
  failed_count: number;
  quality: Record<ConditionMetricName, ConditionMetricSummary>;
  mean_tokens: number | null;
  mean_latency_ms: number | null;
}

export interface ConditionPairedComparison {
  baseline_condition_id: string;
  guided_condition_id: string;
  completed_pair_count: number;
  metric_pair_counts: Record<ConditionMetricName, number>;
  delta: Record<ConditionMetricName, ConditionMetricSummary>;
  excluded_pairs: Record<string, number>;
}

export interface ConditionMetricAvailability {
  ragas_rows_found: boolean;
  valid_metric_row_count: number;
  warning: string | null;
}

export interface ConditionComparisonSummary {
  conditions: Record<string, ConditionAggregate>;
  paired: ConditionPairedComparison | null;
  availability: ConditionMetricAvailability;
}

export interface AblationResponse extends AnalyticsAggregateResponse {
  summaries: Record<string, unknown> & {
    condition_comparison?: ConditionComparisonSummary | null;
  };
}

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
  condition_id?: string | null;
  execution_profile?: string | null;
  agentic_execution_version?: AgenticExecutionVersion;
  response_status?: string | null;
  status: CampaignResultStatus;
  total_tokens: number | null;
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

/** Backend-derived release metric. A missing measurement must stay distinguishable from zero. */
export interface ReleaseMetric {
  value: number | null;
  reason: string | null;
}

export interface ReleaseArmSummary {
  mode: string;
  condition_id: string;
  execution_profile: string;
  agentic_execution_version: string | null;
  shadow_evaluation_policy: string | null;
  response_status_counts: Record<string, number>;
  run_count: number;
  complete_run_count: number;
  accounting_complete_run_count: number;
}

/**
 * Authoritative release decision payload. The browser formats these values but
 * never derives gates, deltas, confidence intervals, or token ratios itself.
 */
export interface ReleaseMetricsReport {
  benchmark_id: string;
  benchmark_kind: string;
  comparable: boolean;
  availability: 'available' | 'not_applicable';
  not_applicable_reason: string | null;
  gate_reasons: string[];
  manifest: Record<string, unknown>;
  arms: ReleaseArmSummary[];
  required_slot_coverage: ReleaseMetric;
  important_unsupported_claim_rate: ReleaseMetric;
  provenance_failure_rate: ReleaseMetric;
  pack_efficiency: ReleaseMetric;
  graph_locator_success: ReleaseMetric;
  graph_locator_fallback: ReleaseMetric;
  final_generation_count: ReleaseMetric;
  latency_p95_ms: ReleaseMetric;
  token_ratio: ReleaseMetric;
  paired_quality_delta: ReleaseMetric;
  paired_quality_ci_lower: ReleaseMetric;
  paired_quality_ci_upper: ReleaseMetric;
  category_quality_deltas: Record<string, ReleaseMetric>;
  per_question_quality_deltas: Record<string, ReleaseMetric>;
  statistics: Record<string, unknown>;
}

export type V9Route =
  | 'single_lookup'
  | 'bounded_compare'
  | 'exact_structured'
  | 'multi_document_exact'
  | 'multi_hop'
  | 'graph_relational';
export type V9GraphPolicy = 'never' | 'locator_fallback' | 'required_locator';
export type V9EvidenceSupportType = 'direct' | 'calculated' | 'scope_constraint' | 'contradictory';
export type V9ClaimSupportType = 'direct' | 'calculated' | 'comparative_inference' | 'qualified';
export type V9SlotResolutionStatus =
  | 'supported'
  | 'conflicted'
  | 'explicitly_unavailable'
  | 'not_found';
export type V9ResponseStatus = 'complete' | 'qualified_partial' | 'insufficient';
export type V9SynthesisObligationKind =
  | 'comparison'
  | 'selection'
  | 'causal'
  | 'aggregation'
  | 'qualification';
export type V9ResponseConstraintKind =
  | 'conditional_scope'
  | 'output_format'
  | 'prohibition'
  | 'allowed_labels';
export type V9SlotPlanSource = 'deterministic' | 'llm_planner' | 'safe_fallback';
export type V9SlotPlanConfidence = 'high' | 'medium' | 'low';

export interface V9SynthesisObligation {
  obligation_id: string;
  kind: V9SynthesisObligationKind;
  description: string;
  depends_on_slot_ids: string[];
}

export interface V9ResponseConstraint {
  constraint_id: string;
  kind: V9ResponseConstraintKind;
  description: string;
}

export interface V9RequiredSlot {
  slot_id: string;
  description: string;
  required?: boolean;
  entity_ids?: string[];
  locator_hints?: string[];
  /** Additive v2 fields; absent historical values must remain N/A. */
  source_name_hints?: string[];
  authorized_source_doc_ids?: string[];
  expected_answer_type?: string | null;
  depends_on_slot_ids?: string[];
  visual_policy?: string | null;
}

export interface V9ResolvedSourceScope {
  requested_doc_ids?: string[];
  requested_source_names?: string[];
  resolved_doc_ids?: string[];
  authorized_doc_ids?: string[];
  source_name_to_doc_ids?: Record<string, string[]>;
  rejected_source_names?: string[];
}

export interface V9QueryContract {
  contract_version?: string;
  route: V9Route;
  intent: string;
  required_slots?: V9RequiredSlot[];
  /** Additive v2 fields; absent historical values must remain N/A. */
  synthesis_obligations?: V9SynthesisObligation[];
  response_constraints?: V9ResponseConstraint[];
  entities?: string[];
  locator_hints?: string[];
  graph_policy?: V9GraphPolicy | null;
  visual_requested?: boolean;
  visual_required?: boolean;
  evidence_extraction_required?: boolean;
  max_retrieval_rounds?: number;
  max_repair_rounds?: number;
  max_llm_calls?: number;
  runtime_token_budget?: number;
  resolved_source_scope?: V9ResolvedSourceScope | null;
  strategy_tier?: string | null;
  route_decision?: V9RouteDecision | null;
  comparison_plan?: V9ComparisonPlan | null;
  slot_plan_status?: 'complete' | 'degraded' | null;
  slot_plan_source?: V9SlotPlanSource | null;
  slot_plan_confidence?: V9SlotPlanConfidence | null;
  slot_plan_fallback_reason?: string | null;
  truncated_requirement_count?: number | null;
  slot_semantics?: string | null;
  atomic_completeness?: boolean | null;
  atomic_completeness_reason?: string | null;
}

export interface V9RouteDecision {
  selected_route: V9Route;
  decision_source: 'deterministic' | 'llm_planner' | 'safe_fallback';
  matched_rules?: string[];
  candidate_routes?: V9Route[];
  route_reason: string;
  planner_call_used?: boolean;
  fallback_reason?: string | null;
  confidence?: number | null;
}

export interface V9PromptCaptureAvailability {
  hash?: string | null;
  preview?: string | null;
  full_prompt?: string | null;
}

export interface V9EvidenceSource {
  doc_id: string;
  chunk_id?: string | null;
  parent_id?: string | null;
  asset_id?: string | null;
  document_name?: string | null;
  source_span_hash?: string | null;
}

export interface V9EvidenceScope {
  dataset?: string | null;
  split?: string | null;
  metric?: string | null;
  model_variant?: string | null;
  training_protocol?: string | null;
  prompt_setting?: string | null;
  noise_level?: string | null;
  publication_year?: number | null;
}

export interface V9SourceLocator {
  pdf_page_index?: number | null;
  printed_page_label?: string | null;
  section?: string | null;
  table_id?: string | null;
  figure_id?: string | null;
  bbox?: [number, number, number, number] | null;
  citation_format_version?: string;
}

export interface V9EvidencePacketPayload {
  schema_version: string;
  evidence_id: string;
  task_id: string;
  round_id: string;
  query_id: string;
  slot_ids: string[];
  statement: string;
  support_type: V9EvidenceSupportType;
  source: V9EvidenceSource;
  scope: V9EvidenceScope;
  locator: V9SourceLocator;
  raw_value?: string | null;
  normalized_value?: string | null;
  unit?: string | null;
  calculation_operation?: string | null;
  premise_evidence_ids?: string[];
  display_precision?: number | null;
  rounding_mode?: string | null;
  extractor_version?: string | null;
  prompt_version?: string | null;
  validation_status?: 'deterministic_valid' | 'quote_bound' | 'derived_non_evidence' | 'invalid';
}

export interface V9EvidencePacket {
  evidence_id: string;
  packet: V9EvidencePacketPayload;
}

export interface V9SlotResolutionValue {
  slot_id: string;
  status: V9SlotResolutionStatus;
  evidence_ids?: string[];
  reason?: string | null;
  resolution_stage?: string | null;
}

export interface V9SlotResolution {
  slot_id: string;
  resolution_stage: string;
  resolution: V9SlotResolutionValue;
}

export interface V9SufficiencyReport {
  evidence_complete: boolean;
  answerable: boolean;
  response_status: V9ResponseStatus;
  supported_slot_ids?: string[];
  conflicted_slot_ids?: string[];
  explicitly_unavailable_slot_ids?: string[];
  not_found_slot_ids?: string[];
  stop_reason?: string | null;
}

export interface V9BudgetReservation {
  reservation_id: string;
  phase: string;
  estimated_input_tokens: number;
  reserved_output_tokens: number;
  reserved_reasoning_tokens?: number;
  provider_attempt?: number;
}

export interface V9RetrievalTask {
  task_id: string;
  round_id: string;
  query_id: string;
  query: string;
  target_slot_ids: string[];
  source_scope: V9ResolvedSourceScope;
  source_group_id?: string;
  subject_id?: string | null;
  locator_hints?: string[];
  graph_policy?: V9GraphPolicy;
  visual_required?: boolean;
  depends_on_task_ids?: string[];
}

export interface V9RepairPlan {
  repair_round_index: number;
  tasks?: V9RetrievalTask[];
  resulting_evidence_ids?: string[];
  stop_reason?: string | null;
}

export interface V9ConflictCandidate {
  candidate_id: string;
  slot_id: string;
  evidence_ids: string[];
  scope_match: 'same' | 'different' | 'unknown';
  reason: string;
  unresolved?: boolean;
}

export interface V9FinalClaim {
  claim_id: string;
  /** Optional for historical payloads; only this persisted relation may bind a claim to a slot. */
  slot_id?: string | null;
  statement: string;
  support_type: V9ClaimSupportType;
  evidence_ids?: string[];
  premise_evidence_ids?: string[];
  qualified_reason?: string | null;
}

export interface V9ContextPack {
  packed_evidence_ids?: string[];
  dropped_evidence_ids?: string[];
  token_count?: number | null;
  selection_policy_version?: string | null;
  candidate_count?: number | null;
  selection_decisions?: V9ContextSelectionDecision[];
}

export interface V9ContextSelectionDecision {
  evidence_id: string;
  selected: boolean;
  base_quality: number;
  source_bonus: number;
  redundancy_penalty: number;
  visual_penalty: number;
  utility: number;
  reason: string;
}

export interface V9ExecutionMetrics {
  provider_attempt_count?: number;
  tool_operation_count?: number;
  retrieval_query_count?: number;
  final_generation_count?: number;
  subtask_answer_count?: number;
  prose_curator_call_count?: number;
  arbitration_call_count?: number;
  atomic_planner_call_count?: number;
  comparison_planner_call_count?: 0;
  slot_binding_method?: 'task_target_inherited' | 'not_instrumented';
  semantic_qualification?:
    | 'not_attempted'
    | 'deterministic'
    | 'provider_qualified'
    | 'no_match'
    | 'provider_failed'
    | 'invalid_response'
    | 'not_enabled'
    | 'not_instrumented';
  reserved_tokens?: number;
  reconciled_tokens?: number;
  candidate_packet_count?: number;
  qualified_packet_count?: number;
  qualification_round_count?: number;
  qualification_provider_call_count?: number;
  qualification_failure_code?: string | null;
}

export interface AtomicPlannerDiagnostics {
  outcome: 'deterministic' | 'planned' | 'degraded';
  failure_stage:
    | 'budget_rejected'
    | 'provider_invocation'
    | 'provider_empty_response'
    | 'response_decode'
    | 'schema_validation'
    | 'semantic_validation'
    | null;
  failure_code: string | null;
  provider_response_received: boolean;
  retrieval_query_strategy: 'atomic_slots' | 'safe_fallback_original_question';
  compiled_retrieval_task_count: number;
}

/** Token-only, versioned observability; no untyped v9 payload is accepted here. */
export interface V9ExecutionObservability {
  schema_version?: string;
  contract?: V9QueryContract | null;
  slot_resolutions?: V9SlotResolution[];
  evidence_packets?: V9EvidencePacket[];
  sufficiency?: V9SufficiencyReport | null;
  context_pack?: V9ContextPack | null;
  budget?: V9BudgetReservation[];
  repairs?: V9RepairPlan[];
  conflicts?: V9ConflictCandidate[];
  final_claims?: V9FinalClaim[];
  metrics?: V9ExecutionMetrics;
  planner_diagnostics?: AtomicPlannerDiagnostics | null;
  prompt_capture?: V9PromptCaptureAvailability | null;
}

export interface CampaignPreflightIssue {
  status?: 'configuration_incompatible';
  stage: 'pre_route' | 'post_contract';
  reason: string;
}

export interface CampaignPreflightQuestion {
  question_id: string;
  expected_route?: string | null;
  status: 'feasible' | 'configuration_incompatible';
  issues?: CampaignPreflightIssue[];
}

/** Authenticated identity is inferred server-side and deliberately not part of this payload. */
export interface CampaignPreflightRequest {
  test_case_ids: string[];
  model_config: ModelConfig;
  runtime_token_budget: number;
  max_llm_calls: number;
}

export interface CampaignPreflightResponse {
  questions?: CampaignPreflightQuestion[];
}

export interface EvaluationRunSummary {
  run_id: string;
  campaign_id: string;
  question_id: string;
  mode: CampaignMode;
  repeat_number?: number;
  answer_preview?: string | null;
  latency_ms?: number | null;
  total_tokens?: number | null;
  accounting_status?: 'complete' | 'partial' | 'not_available';
  created_at: string;
}

export interface V9ComparisonSubject {
  subject_id: string;
  display_name: string;
  aliases?: string[];
  retrieval_query: string;
  /** Present on active v2 subjects; absent historical subjects remain readable. */
  evidence_slot_ids?: string[];
}

export interface V9ComparisonPlan {
  subjects: V9ComparisonSubject[];
  dimensions?: string[];
  qualification?: string | null;
}

export interface EvaluationTraceEvent {
  event_id: string;
  run_id: string;
  campaign_id: string;
  span_id: string;
  parent_event_id?: string | null;
  parent_span_id?: string | null;
  event_type: string;
  event_schema_version?: string;
  sequence: number;
  stage_type: 'routing' | 'planning' | 'retrieval' | 'rerank' | 'graph' | 'visual' | 'tool'
    | 'context_packing' | 'generation' | 'claim_verification' | 'evaluation' | 'export';
  stage_name: string;
  started_at: string;
  ended_at?: string | null;
  duration_ms?: number | null;
  status: 'running' | 'success' | 'failed' | 'skipped' | 'timeout' | 'partial';
  retry_count?: number;
  payload?: Record<string, unknown>;
  error?: Record<string, unknown>;
  created_at: string;
}

export interface EvaluationLlmCall {
  llm_call_id: string;
  run_id: string;
  campaign_id: string;
  span_id?: string | null;
  provider?: string | null;
  model_name?: string | null;
  phase?: 'unknown' | 'contract_planning' | 'comparison_plan' | 'graph_route' | 'evidence_extract'
    | 'retrieval_judge' | 'visual_extract' | 'final_answer';
  purpose?: string;
  reservation_id?: string | null;
  provider_attempt?: number | null;
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
  reasoning_tokens?: number | null;
  other_tokens?: number | null;
  estimated_cost_usd?: number | null;
  estimated_cost_twd?: number | null;
  prompt_hash?: string | null;
  prompt_preview?: string | null;
  prompt_capture_status?: 'unknown' | 'captured' | 'redacted' | 'not_captured_at_execution' | 'capture_failed';
  full_prompt_capture_status?: 'unknown' | 'captured' | 'redacted' | 'not_captured_at_execution' | 'capture_failed';
  response_hash?: string | null;
  latency_ms?: number | null;
  status?: 'running' | 'success' | 'failed' | 'skipped' | 'timeout' | 'partial';
  error?: Record<string, unknown>;
  payload?: Record<string, unknown>;
  created_at: string;
}

export interface EvaluationRetrievalEvent {
  retrieval_event_id: string;
  run_id: string;
  campaign_id: string;
  span_id?: string | null;
  query?: string | null;
  query_hash?: string | null;
  retriever_name?: string | null;
  top_k?: number | null;
  result_count?: number;
  latency_ms?: number | null;
  payload?: Record<string, unknown>;
  created_at: string;
}

export type ObservationAvailabilityStatus =
  | 'complete'
  | 'partial'
  | 'not_instrumented'
  | 'not_available'
  | 'not_applicable';

export type ObservationProvenance = 'measured' | 'persisted' | 'derived' | 'heuristic';

export interface ObservationAvailability {
  status: ObservationAvailabilityStatus;
  reasons: string[];
}

export interface EvaluationRetrievalChunk {
  retrieval_chunk_id: string;
  run_id: string;
  campaign_id: string;
  span_id?: string | null;
  retrieval_event_id: string;
  chunk_id: string;
  doc_id?: string | null;
  page_start?: number | null;
  page_end?: number | null;
  modality?: string | null;
  excerpt?: string | null;
  rank_before_rerank?: number | null;
  rank_after_rerank?: number | null;
  dense_score?: number | null;
  bm25_score?: number | null;
  rerank_score?: number | null;
  used_in_context?: boolean | null;
  used_in_answer?: boolean | null;
  expected_evidence_match?: boolean | null;
  content_hash?: string | null;
  /** Safe server projection; raw payload is intentionally empty for this endpoint. */
  provenance: ObservationProvenance;
  availability: ObservationAvailability;
  payload?: Record<string, unknown>;
  created_at: string;
}

export interface EvaluationContextPackEvidenceReference {
  evidence_id?: string | null;
  doc_id?: string | null;
  chunk_id?: string | null;
  page?: number | null;
}

export interface EvaluationContextPack {
  context_pack_id: string;
  run_id: string;
  campaign_id: string;
  attempt_id?: string | null;
  condition_id?: string;
  schema_version?: string;
  span_id?: string | null;
  input_chunk_count?: number;
  packed_chunk_count?: number;
  token_count?: number;
  retrieved_but_not_packed_evidence?: EvaluationContextPackEvidenceReference[];
  payload?: Record<string, unknown>;
  created_at: string;
}

export interface EvaluationToolCall {
  tool_call_id: string;
  run_id: string;
  campaign_id: string;
  span_id?: string | null;
  tool_name: string;
  action?: string | null;
  latency_ms?: number | null;
  status?: 'running' | 'success' | 'failed' | 'skipped' | 'timeout' | 'partial';
  payload?: Record<string, unknown>;
  created_at: string;
}

export interface EvaluationRoutingDecision {
  routing_decision_id: string;
  run_id: string;
  campaign_id: string;
  span_id?: string | null;
  selected_mode: CampaignMode;
  analysis_type?: 'retrospective' | 'actual';
  decision_source?: 'deterministic' | 'llm_planner' | 'safe_fallback' | null;
  candidate_routes?: string[];
  matched_rules?: string[];
  fallback_reason?: string | null;
  confidence?: number | null;
  reason?: string | null;
  payload?: Record<string, unknown>;
  created_at: string;
}

export interface EvaluationGraphEvent {
  graph_event_id: string;
  run_id: string;
  campaign_id?: string | null;
  span_id?: string | null;
  graph_query: string;
  graph_search_mode: string;
  graph_evidence_mode?: string;
  graph_route: string;
  router_reason?: string | null;
  graph_feature_flags?: Record<string, unknown>;
  graph_snapshot_version?: string | null;
  graph_schema_version?: string | null;
  graph_extraction_prompt_version?: string | null;
  matched_entity_ids?: string[];
  community_ids?: number[];
  node_count?: number;
  edge_count?: number;
  path_count?: number;
  graph_latency_ms?: number | null;
  graph_context_tokens?: number;
  graph_to_chunk_success_rate?: number | null;
  graph_noise_ratio?: number | null;
  created_at?: string;
}

export interface EvaluationGraphEvidenceItem {
  graph_evidence_item_id: string;
  graph_event_id: string;
  node_ids?: string[];
  edge_ids?: string[];
  relation_path?: string[];
  source_doc_ids?: string[];
  source_chunk_ids?: string[];
  pages?: number[];
  asset_ids?: string[];
  confidence?: number;
  provenance_status?: 'full' | 'partial' | 'missing';
  used_as_locator?: boolean;
  packed_in_context?: boolean;
  used_in_answer?: boolean;
  supported_claim_ids?: string[];
  created_at?: string;
}

export interface EvaluationClaim {
  claim_id: string;
  run_id: string;
  campaign_id: string;
  attempt_id?: string | null;
  condition_id?: string;
  schema_version?: string;
  span_id?: string | null;
  claim_text: string;
  claim_type?: string | null;
  support_status?: 'supported' | 'partially_supported' | 'unsupported' | 'contradicted';
  evidence?: Record<string, unknown>[];
  unsupported_reason?: string | null;
  /** Safe server projection; raw evidence is intentionally omitted for this endpoint. */
  evidence_refs?: EvaluationClaimEvidenceReference[];
  repair_action?: string | null;
  post_repair_status?: string | null;
  extraction_status: 'recorded' | 'empty' | 'not_instrumented';
  payload?: Record<string, unknown>;
  created_at?: string;
}

export interface EvaluationClaimEvidenceReference {
  evidence_id?: string | null;
  doc_id?: string | null;
  chunk_id?: string | null;
  page?: number | null;
}

export interface EvaluationHumanRating {
  human_rating_id: string;
  run_id: string;
  campaign_id: string;
  span_id?: string | null;
  rater_id_hash: string;
  rubric_version: string;
  correctness_score: number;
  faithfulness_score: number;
  completeness_score: number;
  citation_quality_score: number;
  usefulness_score: number;
  comments?: string | null;
  is_blinded?: boolean;
  shown_mode_label?: boolean;
  payload?: Record<string, unknown>;
  created_at: string;
}

export interface EvaluationEvidenceCoverage {
  atomic_fact_id?: string | null;
  fact_text?: string | null;
  retrieved?: boolean | null;
  packed?: boolean | null;
  mentioned?: boolean | null;
  cited?: boolean | null;
  status?: string | null;
  payload?: Record<string, unknown> | null;
  error?: Record<string, unknown> | null;
}

export interface EvaluationRunObservabilityDetail {
  run_id: string;
  campaign_id: string;
  run_summary: EvaluationRunSummary | null;
  trace_events: EvaluationTraceEvent[];
  llm_calls: EvaluationLlmCall[];
  retrieval_events: EvaluationRetrievalEvent[];
  retrieval_chunks: EvaluationRetrievalChunk[];
  context_packs: EvaluationContextPack[];
  tool_calls: EvaluationToolCall[];
  routing_decisions: EvaluationRoutingDecision[];
  graph_events: EvaluationGraphEvent[];
  graph_evidence_items: EvaluationGraphEvidenceItem[];
  graph_observability_status: 'recorded' | 'fallback' | 'not_instrumented';
  claims: EvaluationClaim[];
  claim_extraction_status?: 'recorded' | 'empty' | 'not_instrumented';
  human_ratings: EvaluationHumanRating[];
  evidence_coverage: EvaluationEvidenceCoverage[] | null;
  evidence_coverage_status: 'complete' | 'partial' | 'not_available' | 'not_instrumented';
  accounting_diagnostics: EvaluationAccountingDiagnostics;
  /** Historical v8 executions explicitly return null instead of a fabricated v9 envelope. */
  agentic_v9: V9ExecutionObservability | null;
}

export interface ExportCampaignRequest {
  include_run_observability: boolean;
  include_raw_trace_payloads: boolean;
  include_prompt_previews: boolean;
  include_full_prompts: boolean;
  include_answers: boolean;
  include_retrieved_excerpts: boolean;
  format: 'json';
}

export type ExportAvailabilityStatus =
  | 'complete'
  | 'partial'
  | 'not_instrumented'
  | 'not_available'
  | 'not_applicable';

export interface ExportAvailabilityV2 {
  status: ExportAvailabilityStatus;
  reasons: string[];
}

export interface ExportSectionV2<T> {
  availability: ExportAvailabilityV2;
  data: T | null;
}

export interface ExportCampaignIdentityV2 {
  id: string;
  name: string | null;
  status: CampaignLifecycleStatus;
  benchmark_id: string | null;
  modes: CampaignMode[];
  repeat_count: number;
  created_at: string;
  updated_at: string;
}

export interface ExportResultV2 {
  run_id: string;
  campaign_id: string;
  question_id: string;
  question: string;
  mode: CampaignMode;
  run_number: number;
  repeat_number: number;
  condition_id: string | null;
  execution_profile: string | null;
  context_policy_version: string | null;
  agentic_execution_version: AgenticExecutionVersion;
  execution_identity: string | null;
  response_status: string | null;
  status: CampaignResultStatus;
  answer: string | null;
  ground_truth: string | null;
  ground_truth_short: string | null;
  contexts: string[] | null;
  source_doc_ids: string[];
  latency_ms: number | null;
  total_latency_ms: number | null;
  total_tokens: number | null;
  created_at: string;
}

export interface ExportTokenBreakdownV2 {
  input_tokens: number | null;
  output_text_tokens: number | null;
  reasoning_tokens: number | null;
  other_tokens: number | null;
  total_tokens: number | null;
  by_phase: Record<string, number>;
  observed_call_count: number;
  measured_call_count: number;
  missing_usage_call_count: number;
  unbalanced_call_count: number;
  unclassified_phase_call_count: number;
  missing_usage_by_phase: Record<string, number>;
  missing_usage_by_purpose: Record<string, number>;
  missing_usage_by_provider: Record<string, number>;
  accounting_status: TokenAccountingStatus;
  phase_attribution_status: PhaseAttributionStatus;
  phase_attribution_reasons: string[];
}

export interface ExportRunLatencyV2 {
  latency_ms: number | null;
  total_latency_ms: number | null;
  started_at: string | null;
  completed_at: string | null;
}

export interface ExportEvidenceReferenceV2 {
  evidence_id: string | null;
  doc_id: string | null;
  chunk_id: string | null;
  page: number | null;
}

export interface ExportTraceEventV2 {
  event_id: string; run_id: string; campaign_id: string; span_id: string;
  parent_event_id: string | null; parent_span_id: string | null; event_type: string;
  event_schema_version: string; sequence: number; stage_type: string; stage_name: string;
  started_at: string; ended_at: string | null; duration_ms: number | null;
  status: string; retry_count: number; payload: Record<string, unknown>;
  error: Record<string, never>; created_at: string;
}

export interface ExportLlmCallV2 {
  llm_call_id: string; run_id: string; campaign_id: string; span_id: string | null;
  provider: string | null; model_name: string | null; phase: string; purpose: string;
  reservation_id: string | null; provider_attempt: number | null; prompt_tokens: number;
  completion_tokens: number; total_tokens: number; reasoning_tokens: number | null;
  other_tokens: number | null; estimated_cost_usd: number | null;
  estimated_cost_twd: number | null; latency_ms: number | null; status: string;
  prompt_hash: string | null; response_hash: string | null; prompt_capture_status: string;
  full_prompt_capture_status: string; prompt_preview: string | null; full_prompt: string | null;
  error: Record<string, never>; payload: Record<string, never>; created_at: string;
}

export interface ExportRetrievalEventV2 {
  retrieval_event_id: string; run_id: string; campaign_id: string; span_id: string | null;
  query: string | null; query_hash: string | null; retriever_name: string | null;
  top_k: number | null; result_count: number; latency_ms: number | null;
  payload: Record<string, never>; created_at: string;
}

export interface ExportRetrievalChunkV2 {
  retrieval_chunk_id: string; run_id: string; campaign_id: string; span_id: string | null;
  retrieval_event_id: string; chunk_id: string; doc_id: string | null; page_start: number | null;
  page_end: number | null; modality: string | null; rank_before_rerank: number | null;
  rank_after_rerank: number | null; dense_score: number | null; bm25_score: number | null;
  rerank_score: number | null; used_in_context: boolean | null; used_in_answer: boolean | null;
  expected_evidence_match: boolean | null; excerpt: string | null; content_hash: string | null;
  provenance: 'measured' | 'persisted' | 'derived' | 'heuristic';
  availability: ExportAvailabilityV2; payload: Record<string, never>; created_at: string;
}

export interface ExportContextPackV2 {
  context_pack_id: string; run_id: string; campaign_id: string; attempt_id: string | null;
  condition_id: string; schema_version: string; span_id: string | null; input_chunk_count: number;
  packed_chunk_count: number; token_count: number;
  retrieved_but_not_packed_evidence: ExportEvidenceReferenceV2[];
  payload: Record<string, never>; created_at: string;
}

export interface ExportToolCallV2 {
  tool_call_id: string; run_id: string; campaign_id: string; span_id: string | null;
  tool_name: string; action: string | null; latency_ms: number | null; status: string;
  payload: Record<string, never>; created_at: string;
}

export interface ExportRoutingDecisionV2 {
  routing_decision_id: string; run_id: string; campaign_id: string; span_id: string | null;
  selected_mode: CampaignMode; analysis_type: 'retrospective' | 'actual';
  decision_source: 'deterministic' | 'llm_planner' | 'safe_fallback' | null;
  candidate_routes: string[]; matched_rules: string[]; fallback_reason: string | null;
  confidence: number | null; reason: string | null; payload: Record<string, never>; created_at: string;
}

export interface ExportGraphEventV2 {
  graph_event_id: string; run_id: string; campaign_id: string | null; span_id: string | null;
  graph_query: string; graph_search_mode: string; graph_evidence_mode: string; graph_route: string;
  router_reason: string | null; graph_feature_flags: Record<string, never>;
  graph_snapshot_version: string | null; graph_schema_version: string | null;
  graph_extraction_prompt_version: string | null; matched_entity_ids: string[]; community_ids: number[];
  node_count: number; edge_count: number; path_count: number; graph_latency_ms: number | null;
  graph_context_tokens: number; graph_to_chunk_success_rate: number | null;
  graph_noise_ratio: number | null; created_at: string;
}

export interface ExportGraphEvidenceItemV2 {
  graph_evidence_item_id: string; graph_event_id: string; node_ids: string[]; edge_ids: string[];
  relation_path: string[]; source_doc_ids: string[]; source_chunk_ids: string[]; pages: number[];
  asset_ids: string[]; confidence: number; provenance_status: 'full' | 'partial' | 'missing';
  used_as_locator: boolean; packed_in_context: boolean; used_in_answer: boolean;
  supported_claim_ids: string[]; created_at: string;
}

export interface ExportClaimV2 {
  claim_id: string; run_id: string; campaign_id: string; attempt_id: string | null;
  condition_id: string; schema_version: string; span_id: string | null; claim_text: string | null;
  claim_type: string | null; support_status: 'supported' | 'partially_supported' | 'unsupported' | 'contradicted';
  evidence: ExportEvidenceReferenceV2[]; evidence_refs: ExportEvidenceReferenceV2[]; unsupported_reason: string | null;
  repair_action: string | null; post_repair_status: string | null;
  extraction_status: 'recorded' | 'empty' | 'not_instrumented';
  payload: Record<string, never>; created_at: string;
}

export interface ExportHumanRatingV2 {
  human_rating_id: string; run_id: string; campaign_id: string; span_id: string | null;
  rater_id_hash: string; rubric_version: string; correctness_score: number; faithfulness_score: number;
  completeness_score: number; citation_quality_score: number; usefulness_score: number;
  comments: string | null; is_blinded: boolean; shown_mode_label: boolean;
  payload: Record<string, never>; created_at: string;
}

export interface ExportEvidenceCoverageV2 {
  atomic_fact_id: string; fact_text: string | null; retrieved: boolean; packed: boolean;
  mentioned: boolean; cited: boolean; expected_doc_ids: string[];
}

export interface ExportV9EvidencePacketDataV2 {
  schema_version: string; evidence_id: string; task_id: string; round_id: string; query_id: string;
  slot_ids: string[]; statement: string | null; support_type: V9EvidenceSupportType;
  source: V9EvidenceSource; scope: V9EvidenceScope; locator: V9SourceLocator;
  raw_value: string | number | null; normalized_value: string | number | null; unit: string | null;
  calculation_operation: string | null; premise_evidence_ids: string[]; display_precision: number | null;
  rounding_mode: string | null; extractor_version: string | null; prompt_version: string | null;
  validation_status: 'deterministic_valid' | 'quote_bound' | 'derived_non_evidence' | 'invalid';
}

export interface ExportV9EvidencePacketV2 { evidence_id: string; packet: ExportV9EvidencePacketDataV2; }

export interface ExportV9FinalClaimV2 {
  claim_id: string; slot_id: string | null; statement: string | null; support_type: V9ClaimSupportType;
  evidence_ids: string[]; premise_evidence_ids: string[]; qualified_reason: string | null;
}

export interface ExportV9ComparisonV2 {
  planner_status: 'not_requested' | 'planned' | 'fallback' | 'unknown';
  planner_latency_ms: number;
  planner_fallback_reason: 'timeout' | 'provider_error' | 'invalid_response' | 'schema_violation' | 'invalid_subjects' | 'not_comparison' | 'unknown' | null;
  fallback_stage: 'response_decode' | 'transport_schema' | 'subject_validation' | 'trusted_plan_validation' | 'numeric_guard' | 'unknown' | null;
  validation_issues: Array<{ path: string; type: string }>;
  is_comparison: boolean;
  subjects: Array<{
    subject_id: string;
    display_name: string;
    aliases: string[];
    evidence_slot_ids: string[];
  }>;
  dimensions: string[];
  task_diagnostics: Array<{
    task_id: string; subject_id: string; query_hash: string; query_preview: string;
    status: 'executed' | 'fallback' | 'not_instrumented';
    fallback_reason: 'reranker_unavailable' | 'reranker_error' | 'reranker_empty_result' | 'unknown' | null;
    candidate_count: number; pre_subject_limit_count: number; selected_count: number;
    selected: Array<{ doc_id: string | null; chunk_id: string | null }>;
  }>;
  coverage_before_repair: string[]; missing_before_repair: string[]; repair_executed: boolean;
  coverage_after_repair: string[]; missing_after_repair: string[];
  final_status: 'complete' | 'qualified_partial' | 'insufficient' | 'unknown';
  final_evidence_subjects: string[]; final_evidence_count: number;
  final_evidence: Array<{ evidence_id: string; doc_id: string; chunk_id: string | null; subject_ids: string[] }>;
}

export interface ExportV9ExecutionObservabilityV2 {
  schema_version: string;
  contract: V9QueryContract | null;
  slot_resolutions: V9SlotResolution[];
  evidence_packets: ExportV9EvidencePacketV2[];
  sufficiency: V9SufficiencyReport | null;
  context_pack: V9ContextPack | null;
  budget: V9BudgetReservation[];
  repairs: V9RepairPlan[];
  conflicts: V9ConflictCandidate[];
  final_claims: ExportV9FinalClaimV2[];
  metrics: V9ExecutionMetrics;
  planner_diagnostics: AtomicPlannerDiagnostics | null;
  comparison: ExportV9ComparisonV2 | null;
}

export interface ExportRunSummaryV2 {
  run_id: string; campaign_id: string; question_id: string; mode: CampaignMode; repeat_number: number;
  answer_preview: string | null; latency_ms: number | null; total_tokens: number | null;
  accounting_status: 'complete' | 'partial' | 'not_available'; created_at: string;
}

export interface ExportRunObservabilityDataV2 {
  run_id: string; campaign_id: string; run_summary: ExportRunSummaryV2;
  accounting_diagnostics: ExportTokenBreakdownV2; trace_events: ExportTraceEventV2[];
  llm_calls: ExportLlmCallV2[]; retrieval_events: ExportRetrievalEventV2[];
  retrieval_chunks: ExportRetrievalChunkV2[]; context_packs: ExportContextPackV2[];
  tool_calls: ExportToolCallV2[]; routing_decisions: ExportRoutingDecisionV2[];
  graph_events: ExportGraphEventV2[]; graph_evidence_items: ExportGraphEvidenceItemV2[];
  graph_observability_status: 'recorded' | 'fallback' | 'not_instrumented'; claims: ExportClaimV2[];
  claim_extraction_status: 'recorded' | 'empty' | 'not_instrumented'; human_ratings: ExportHumanRatingV2[];
  evidence_coverage: ExportEvidenceCoverageV2[] | null;
  evidence_coverage_status: 'complete' | 'partial' | 'not_available' | 'not_instrumented';
  agentic_v9: ExportV9ExecutionObservabilityV2 | null;
}

export interface ExportRunObservabilityV2 {
  included: boolean; availability: ExportAvailabilityV2; data: ExportRunObservabilityDataV2 | null;
}

export interface ExportRunV2 {
  result: ExportResultV2;
  ragas_metrics: Record<string, number>;
  accounting: ExportTokenBreakdownV2;
  latency: ExportRunLatencyV2;
  observability: ExportRunObservabilityV2;
}

export interface ExportHumanEvalQueueItemV2 {
  run_id: string; campaign_id: string; question_id: string; question: string; mode: CampaignMode;
  run_number: number; repeat_number: number; answer_preview: string | null;
  existing_rating_count: number; already_rated_by_current_user: boolean;
}

export interface ExportHumanEvalQueueV2 { campaign_id: string; rows: ExportHumanEvalQueueItemV2[]; }
export interface ExportHumanEvaluationDataV2 { comparison: HumanVsAutoResponse; queue: ExportHumanEvalQueueV2; }
export interface ExportDiagnosticsDataV2 { errors: CampaignErrorsResponse; stage_warnings: CampaignStageWarningsResponse; }
export interface ExportOverviewDataV2 {
  research_summary: CampaignResearchSummaryResponse;
  release_metrics: ExportSectionV2<ReleaseMetricsReport>;
}

export interface ExportSectionsV2 {
  overview: ExportSectionV2<ExportOverviewDataV2>;
  question_analysis: ExportSectionV2<ResearchQuestionComparisonResponse>;
  agent_behavior: ExportSectionV2<AgentBehaviorResponse>;
  router_analysis: ExportSectionV2<RouterAnalysisResponse>;
  ablation: ExportSectionV2<AblationResponse>;
  human_evaluation: ExportSectionV2<ExportHumanEvaluationDataV2>;
  diagnostics: ExportSectionV2<ExportDiagnosticsDataV2>;
}

export interface ExportRedactionMetadataV2 {
  provider_errors: 'excluded'; stack_traces: 'excluded'; credentials: 'redacted';
}

export interface ExportMetadataV2 {
  exported_at: string;
  options: ExportCampaignRequest;
  redaction: ExportRedactionMetadataV2;
  availability_warnings: string[];
}

export interface ExportCampaignResponse {
  schema_version: '2.0';
  export_metadata: ExportMetadataV2;
  campaign: ExportCampaignIdentityV2;
  sections: ExportSectionsV2;
  runs: ExportRunV2[];
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

export interface StageWarningRow extends Record<string, unknown> {
  run_id: string;
  campaign_id: string;
  question_id: string;
  mode: CampaignMode;
  stage_name: string;
  status: 'partial' | 'required_but_not_satisfied';
  failure_reason: string;
  created_at: string;
}

export interface CampaignStageWarningsResponse {
  campaign_id: string;
  rows: StageWarningRow[];
}

export interface CampaignAnalyticsDashboardResponse {
  campaign_id: string;
  overview: CampaignOverviewResponse;
  runs: EvaluationRunListResponse;
  mode_comparison: ModeComparisonResponse;
  question_comparison: QuestionComparisonResponse;
  cost_latency: CostLatencyResponse;
  router_analysis: RouterAnalysisResponse;
  ablation: AblationResponse;
  human_vs_auto: HumanVsAutoResponse;
  human_queue: HumanEvalQueueResponse;
  errors: CampaignErrorsResponse;
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
  | { type: 'campaign_completed_with_errors'; data: CampaignStatus }
  | { type: 'campaign_failed'; data: CampaignStatus }
  | { type: 'campaign_cancelled'; data: CampaignStatus }
  | { type: 'run_started'; data: CampaignGranularStreamEventData }
  | { type: 'routing_completed'; data: CampaignGranularStreamEventData }
  | { type: 'retrieval_completed'; data: CampaignGranularStreamEventData }
  | { type: 'generation_completed'; data: CampaignGranularStreamEventData }
  | { type: 'metric_completed'; data: CampaignGranularStreamEventData }
  | { type: 'run_completed'; data: CampaignGranularStreamEventData }
  | { type: 'run_failed'; data: CampaignGranularStreamEventData };

export type EvaluationJobType = 'initial' | 'rerun';
export type EvaluationWorkType = 'dataset_execution' | 'ragas_metric';
export type EvaluationJobItemStatus =
  | 'pending'
  | 'running'
  | 'retry_wait'
  | 'succeeded'
  | 'failed'
  | 'interrupted'
  | 'cancelled';
export type EvaluationAttemptStatus =
  | 'running'
  | 'succeeded'
  | 'failed'
  | 'interrupted'
  | 'cancelled';
export type EvaluationRerunScope = 'failed_only' | 'selected' | 'all';
export type EvaluationRerunStages = 'execution' | 'ragas' | 'execution_and_ragas';
export type EvaluationJobStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'completed_with_errors'
  | 'failed'
  | 'cancelled';

export interface EvaluationRerunRequest {
  scope: EvaluationRerunScope;
  stages: EvaluationRerunStages;
  question_ids: string[];
  metric_names: string[];
}

export interface EvaluationJobItemCounts {
  valid: number;
  failed: number;
  retrying: number;
  interrupted: number;
  missing: number;
  cancelled?: number;
}

export interface EvaluationJobItemSummary {
  job_item_id: string;
  job_id: string;
  work_item_id: string;
  work_type: EvaluationWorkType;
  status: EvaluationJobItemStatus;
  question_id?: string | null;
  metric_name?: string | null;
  retry_after?: string | null;
  max_attempts?: number;
  active_attempt_id?: string | null;
  created_at?: string;
  updated_at?: string;
  latest_attempt?: EvaluationAttempt | null;
  latest_attempts?: EvaluationAttempt[];
}

export interface EvaluationJob {
  job_id: string;
  /** Compatibility with early clients that used database-style ids. */
  id?: string;
  job_type: EvaluationJobType;
  user_id?: string | null;
  campaign_id?: string | null;
  selection: Record<string, unknown>;
  config_snapshot: Record<string, unknown>;
  rerun_request?: EvaluationRerunRequest | null;
  status: EvaluationJobStatus;
  total_items: number;
  succeeded_items: number;
  completed_items: number;
  failed_items: number;
  cancelled_items: number;
  created_at: string;
  /** Optional aggregate fields exposed by newer job-summary responses. */
  counts?: Partial<EvaluationJobItemCounts>;
  valid_items?: number;
  retrying_items?: number;
  interrupted_items?: number;
  missing_items?: number;
  retry_wait_items?: number;
  items?: EvaluationJobItemSummary[];
  latest_safe_error_message?: string | null;
  error_message?: string | null;
}

export interface EvaluationAttempt {
  attempt_id: string;
  job_id: string;
  job_item_id: string;
  work_item_id: string;
  attempt_number: number;
  status: EvaluationAttemptStatus;
  started_at: string;
  last_heartbeat_at?: string | null;
  finished_at?: string | null;
  error_type?: string | null;
  safe_error_message?: string | null;
}


