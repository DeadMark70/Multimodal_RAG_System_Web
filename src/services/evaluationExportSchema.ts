import { z } from "zod";
import type { ExportCampaignResponse } from "../types/evaluation";

const jsonValueSchema: z.ZodType<unknown> = z.lazy(() => z.union([z.string(), z.number(), z.boolean(), z.null(), z.array(jsonValueSchema), z.record(z.string(), jsonValueSchema)]));
const jsonObjectSchema = z.record(z.string(), jsonValueSchema);
const emptyObjectSchema = z.strictObject({});
const nullableString = z.string().nullable();
const nullableNumber = z.number().finite().nullable();
const nonNegativeInteger = z.number().int().nonnegative();
const positiveInteger = z.number().int().positive();

const campaignModeSchema = z.enum([
  "naive",
  "naive-baseline",
  "advanced",
  "graph",
  "agentic",
  "agentic-v8",
  "v8",
  "agentic-v9",
  "v9",
  "agentic-v9-shadow",
  "router",
  "graph_raw_current",
  "graph_provenance_gated",
  "graph_locator_to_chunk",
  "graph_locator_claim_gate",
  "always_no_graph",
  "always_graph_locator",
  "router_auto_graph",
  "oracle_graph_router",
  "graph_local_first",
  "graph_global_first",
  "graph_blended",
  "graph_path_pruned",
  "graph_planning_only",
]);
const lifecycleSchema = z.enum(["pending", "running", "evaluating", "completed", "completed_with_errors", "failed", "cancelled"]);
const availabilitySchema = z.strictObject({
  status: z.enum(["complete", "partial", "not_instrumented", "not_available", "not_applicable"]),
  reasons: z.array(z.string()),
});
const sectionSchema = <T extends z.ZodType>(data: T) =>
  z.strictObject({
    availability: availabilitySchema,
    data: data.nullable(),
  });

const exportOptionsSchema = z.strictObject({
  include_run_observability: z.boolean(),
  include_raw_trace_payloads: z.boolean(),
  include_prompt_previews: z.boolean(),
  include_full_prompts: z.boolean(),
  include_answers: z.boolean(),
  include_retrieved_excerpts: z.boolean(),
  format: z.literal("json"),
});

const tokenBreakdownSchema = z.strictObject({
  input_tokens: nullableNumber,
  output_text_tokens: nullableNumber,
  reasoning_tokens: nullableNumber,
  other_tokens: nullableNumber,
  total_tokens: nullableNumber,
  by_phase: z.record(z.string(), nonNegativeInteger),
  observed_call_count: nonNegativeInteger,
  measured_call_count: nonNegativeInteger,
  missing_usage_call_count: nonNegativeInteger,
  unbalanced_call_count: nonNegativeInteger,
  unclassified_phase_call_count: nonNegativeInteger,
  missing_usage_by_phase: z.record(z.string(), nonNegativeInteger),
  missing_usage_by_purpose: z.record(z.string(), nonNegativeInteger),
  missing_usage_by_provider: z.record(z.string(), nonNegativeInteger),
  accounting_status: z.enum(["complete", "partial", "incomplete_legacy"]),
  phase_attribution_status: z.enum(["complete", "partial", "not_available"]),
  phase_attribution_reasons: z.array(z.string()),
});

const resultSchema = z.strictObject({
  run_id: z.string(),
  campaign_id: z.string(),
  question_id: z.string(),
  question: z.string(),
  mode: campaignModeSchema,
  run_number: positiveInteger,
  repeat_number: positiveInteger,
  condition_id: nullableString,
  execution_profile: nullableString,
  context_policy_version: nullableString,
  agentic_execution_version: z.enum(["v8", "v9"]),
  execution_identity: nullableString,
  response_status: nullableString,
  status: z.enum(["completed", "failed"]),
  answer: nullableString,
  ground_truth: nullableString,
  ground_truth_short: nullableString,
  contexts: z.array(z.string()).nullable(),
  source_doc_ids: z.array(z.string()),
  latency_ms: nullableNumber,
  total_latency_ms: nullableNumber,
  total_tokens: z.number().int().nonnegative().nullable(),
  created_at: z.string(),
});

const evidenceReferenceSchema = z.strictObject({
  evidence_id: nullableString,
  doc_id: nullableString,
  chunk_id: nullableString,
  page: z.number().int().nullable(),
});
const traceEventSchema = z.strictObject({
  event_id: z.string(),
  run_id: z.string(),
  campaign_id: z.string(),
  span_id: z.string(),
  parent_event_id: nullableString,
  parent_span_id: nullableString,
  event_type: z.string(),
  event_schema_version: z.string(),
  sequence: positiveInteger,
  stage_type: z.enum(["routing", "planning", "retrieval", "rerank", "graph", "visual", "tool", "context_packing", "generation", "claim_verification", "evaluation", "export"]),
  stage_name: z.string(),
  started_at: z.string(),
  ended_at: nullableString,
  duration_ms: nullableNumber,
  status: z.enum(["running", "success", "failed", "skipped", "timeout", "partial"]),
  retry_count: nonNegativeInteger,
  payload: jsonObjectSchema,
  error: emptyObjectSchema,
  created_at: z.string(),
});
const llmCallSchema = z.strictObject({
  llm_call_id: z.string(),
  run_id: z.string(),
  campaign_id: z.string(),
  span_id: nullableString,
  provider: nullableString,
  model_name: nullableString,
  phase: z.string(),
  purpose: z.string(),
  reservation_id: nullableString,
  provider_attempt: positiveInteger.nullable(),
  prompt_tokens: nonNegativeInteger,
  completion_tokens: nonNegativeInteger,
  total_tokens: nonNegativeInteger,
  reasoning_tokens: nonNegativeInteger.nullable(),
  other_tokens: nonNegativeInteger.nullable(),
  estimated_cost_usd: nullableNumber,
  estimated_cost_twd: nullableNumber,
  latency_ms: nullableNumber,
  status: z.enum(["running", "success", "failed", "skipped", "timeout", "partial"]),
  prompt_hash: nullableString,
  response_hash: nullableString,
  prompt_capture_status: z.enum(["unknown", "captured", "redacted", "not_captured_at_execution", "capture_failed"]),
  full_prompt_capture_status: z.enum(["unknown", "captured", "redacted", "not_captured_at_execution", "capture_failed"]),
  prompt_preview: nullableString,
  full_prompt: nullableString,
  error: emptyObjectSchema,
  payload: emptyObjectSchema,
  created_at: z.string(),
});
const retrievalEventSchema = z.strictObject({
  retrieval_event_id: z.string(),
  run_id: z.string(),
  campaign_id: z.string(),
  span_id: nullableString,
  query: nullableString,
  query_hash: nullableString,
  retriever_name: nullableString,
  top_k: nonNegativeInteger.nullable(),
  result_count: nonNegativeInteger,
  latency_ms: nullableNumber,
  payload: emptyObjectSchema,
  created_at: z.string(),
});
const retrievalChunkSchema = z.strictObject({
  retrieval_chunk_id: z.string(),
  run_id: z.string(),
  campaign_id: z.string(),
  span_id: nullableString,
  retrieval_event_id: z.string(),
  chunk_id: z.string(),
  doc_id: nullableString,
  page_start: z.number().int().nullable(),
  page_end: z.number().int().nullable(),
  modality: nullableString,
  rank_before_rerank: z.number().int().nullable(),
  rank_after_rerank: z.number().int().nullable(),
  dense_score: nullableNumber,
  bm25_score: nullableNumber,
  rerank_score: nullableNumber,
  used_in_context: z.boolean().nullable(),
  used_in_answer: z.boolean().nullable(),
  expected_evidence_match: z.boolean().nullable(),
  excerpt: nullableString,
  content_hash: nullableString,
  provenance: z.enum(["measured", "persisted", "derived", "heuristic"]),
  availability: availabilitySchema,
  payload: emptyObjectSchema,
  created_at: z.string(),
});
const contextPackSchema = z.strictObject({
  context_pack_id: z.string(),
  run_id: z.string(),
  campaign_id: z.string(),
  attempt_id: nullableString,
  condition_id: z.string(),
  schema_version: z.string(),
  span_id: nullableString,
  input_chunk_count: nonNegativeInteger,
  packed_chunk_count: nonNegativeInteger,
  token_count: nonNegativeInteger,
  retrieved_but_not_packed_evidence: z.array(evidenceReferenceSchema),
  payload: emptyObjectSchema,
  created_at: z.string(),
});
const toolCallSchema = z.strictObject({
  tool_call_id: z.string(),
  run_id: z.string(),
  campaign_id: z.string(),
  span_id: nullableString,
  tool_name: z.string(),
  action: nullableString,
  latency_ms: nullableNumber,
  status: z.enum(["running", "success", "failed", "skipped", "timeout", "partial"]),
  payload: emptyObjectSchema,
  created_at: z.string(),
});
const routingDecisionSchema = z.strictObject({
  routing_decision_id: z.string(),
  run_id: z.string(),
  campaign_id: z.string(),
  span_id: nullableString,
  selected_mode: campaignModeSchema,
  analysis_type: z.enum(["retrospective", "actual"]),
  decision_source: z.enum(["deterministic", "llm_planner", "safe_fallback"]).nullable(),
  candidate_routes: z.array(z.string()),
  matched_rules: z.array(z.string()),
  fallback_reason: nullableString,
  confidence: nullableNumber,
  reason: nullableString,
  payload: emptyObjectSchema,
  created_at: z.string(),
});
const graphEventSchema = z.strictObject({
  graph_event_id: z.string(),
  run_id: z.string(),
  campaign_id: nullableString,
  span_id: nullableString,
  graph_query: z.string(),
  graph_search_mode: z.string(),
  graph_evidence_mode: z.string(),
  graph_route: z.string(),
  router_reason: nullableString,
  graph_feature_flags: emptyObjectSchema,
  graph_snapshot_version: nullableString,
  graph_schema_version: nullableString,
  graph_extraction_prompt_version: nullableString,
  matched_entity_ids: z.array(z.string()),
  community_ids: z.array(z.number().int()),
  node_count: nonNegativeInteger,
  edge_count: nonNegativeInteger,
  path_count: nonNegativeInteger,
  graph_latency_ms: nonNegativeInteger.nullable(),
  graph_context_tokens: nonNegativeInteger,
  graph_to_chunk_success_rate: z.number().min(0).max(1).nullable(),
  graph_noise_ratio: z.number().min(0).max(1).nullable(),
  created_at: z.string(),
});
const graphEvidenceSchema = z.strictObject({
  graph_evidence_item_id: z.string(),
  graph_event_id: z.string(),
  node_ids: z.array(z.string()),
  edge_ids: z.array(z.string()),
  relation_path: z.array(z.string()),
  source_doc_ids: z.array(z.string()),
  source_chunk_ids: z.array(z.string()),
  pages: z.array(z.number().int()),
  asset_ids: z.array(z.string()),
  confidence: z.number().min(0).max(1),
  provenance_status: z.enum(["full", "partial", "missing"]),
  used_as_locator: z.boolean(),
  packed_in_context: z.boolean(),
  used_in_answer: z.boolean(),
  supported_claim_ids: z.array(z.string()),
  created_at: z.string(),
});
const claimSchema = z.strictObject({
  claim_id: z.string(),
  run_id: z.string(),
  campaign_id: z.string(),
  attempt_id: nullableString,
  condition_id: z.string(),
  schema_version: z.string(),
  span_id: nullableString,
  claim_text: nullableString,
  claim_type: nullableString,
  support_status: z.enum(["supported", "partially_supported", "unsupported", "contradicted"]),
  evidence: z.array(evidenceReferenceSchema),
  evidence_refs: z.array(evidenceReferenceSchema),
  unsupported_reason: nullableString,
  repair_action: nullableString,
  post_repair_status: nullableString,
  extraction_status: z.enum(["recorded", "empty", "not_instrumented"]),
  payload: emptyObjectSchema,
  created_at: z.string(),
});
const humanRatingSchema = z.strictObject({
  human_rating_id: z.string(),
  run_id: z.string(),
  campaign_id: z.string(),
  span_id: nullableString,
  rater_id_hash: z.string(),
  rubric_version: z.string(),
  correctness_score: z.number().min(0).max(1),
  faithfulness_score: z.number().min(0).max(1),
  completeness_score: z.number().min(0).max(1),
  citation_quality_score: z.number().min(0).max(1),
  usefulness_score: z.number().min(0).max(1),
  comments: nullableString,
  is_blinded: z.boolean(),
  shown_mode_label: z.boolean(),
  payload: emptyObjectSchema,
  created_at: z.string(),
});
const evidenceCoverageSchema = z.strictObject({
  atomic_fact_id: z.string(),
  fact_text: nullableString,
  retrieved: z.boolean(),
  packed: z.boolean(),
  mentioned: z.boolean(),
  cited: z.boolean(),
  expected_doc_ids: z.array(z.string()),
});

const v9RouteSchema = z.enum(["single_lookup", "bounded_compare", "exact_structured", "multi_document_exact", "multi_hop", "graph_relational"]);
const v9ScopeSchema = z.strictObject({
  requested_doc_ids: z.array(z.string()),
  requested_source_names: z.array(z.string()),
  resolved_doc_ids: z.array(z.string()),
  authorized_doc_ids: z.array(z.string()),
  source_name_to_doc_ids: z.record(z.string(), z.array(z.string())),
  rejected_source_names: z.array(z.string()),
});
const v9RequiredSlotSchema = z.strictObject({
  slot_id: z.string(),
  description: z.string(),
  required: z.boolean(),
  entity_ids: z.array(z.string()),
  locator_hints: z.array(z.string()),
  source_name_hints: z.array(z.string()),
  authorized_source_doc_ids: z.array(z.string()),
  expected_answer_type: z.enum(["number", "equation", "definition", "comparison", "explanation", "text"]).nullable(),
  depends_on_slot_ids: z.array(z.string()),
  visual_policy: z.enum(["never", "preferred", "required"]).nullable(),
});
const v9RouteDecisionSchema = z.strictObject({
  selected_route: v9RouteSchema,
  decision_source: z.enum(["deterministic", "llm_planner", "safe_fallback"]),
  matched_rules: z.array(z.string()),
  candidate_routes: z.array(z.string()),
  route_reason: z.string(),
  planner_call_used: z.boolean(),
  fallback_reason: nullableString,
  confidence: z.number().finite().nullable(),
});
const v9SynthesisObligationSchema = z.strictObject({
  obligation_id: z.string(),
  kind: z.enum(["comparison", "selection", "causal", "aggregation", "qualification"]),
  description: z.string(),
  depends_on_slot_ids: z.array(z.string()).min(1).max(8),
});
const v9ResponseConstraintSchema = z.strictObject({
  constraint_id: z.string(),
  kind: z.enum(["conditional_scope", "output_format", "prohibition", "allowed_labels"]),
  description: z.string(),
});
const v9ComparisonPlanSchema = z.strictObject({
  subjects: z.array(
    z.strictObject({
      subject_id: z.string(),
      display_name: z.string(),
      aliases: z.array(z.string()),
      retrieval_query: z.string(),
      evidence_slot_ids: z.array(z.string()).max(8).optional(),
    }),
  ),
  dimensions: z.array(z.string()),
  qualification: nullableString,
});
const v9ContractSchema = z.strictObject({
  contract_version: z.string(),
  route: v9RouteSchema,
  intent: z.string(),
  required_slots: z.array(v9RequiredSlotSchema),
  synthesis_obligations: z.array(v9SynthesisObligationSchema).max(8).optional(),
  response_constraints: z.array(v9ResponseConstraintSchema).max(8).optional(),
  entities: z.array(z.string()),
  locator_hints: z.array(z.string()),
  graph_policy: z.enum(["never", "locator_fallback", "required_locator"]).nullable(),
  visual_requested: z.boolean(),
  visual_required: z.boolean(),
  evidence_extraction_required: z.boolean(),
  max_retrieval_rounds: nonNegativeInteger,
  max_repair_rounds: nonNegativeInteger,
  max_llm_calls: nonNegativeInteger,
  runtime_token_budget: nonNegativeInteger,
  resolved_source_scope: v9ScopeSchema.nullable(),
  strategy_tier: nullableString,
  route_decision: v9RouteDecisionSchema.nullable(),
  comparison_plan: v9ComparisonPlanSchema.nullable().optional(),
  slot_plan_status: z.enum(["complete", "degraded"]).nullable(),
  slot_plan_source: z.enum(["deterministic", "llm_planner", "safe_fallback"]).optional(),
  slot_plan_confidence: z.enum(["high", "medium", "low"]).optional(),
  slot_plan_fallback_reason: nullableString.optional(),
  truncated_requirement_count: nonNegativeInteger.optional(),
  slot_semantics: nullableString,
  atomic_completeness: z.boolean().nullable(),
  atomic_completeness_reason: nullableString,
});
const v9SlotResolutionSchema = z.strictObject({
  slot_id: z.string(),
  resolution_stage: z.string(),
  resolution: z.strictObject({
    slot_id: z.string(),
    status: z.enum(["supported", "conflicted", "explicitly_unavailable", "not_found"]),
    evidence_ids: z.array(z.string()),
    reason: nullableString,
    resolution_stage: nullableString,
  }),
});
const v9SourceSchema = z.strictObject({
  doc_id: z.string(),
  chunk_id: nullableString,
  parent_id: nullableString,
  asset_id: nullableString,
  document_name: nullableString,
  source_span_hash: nullableString,
});
const v9EvidenceScopeSchema = z.strictObject({
  dataset: nullableString,
  split: nullableString,
  metric: nullableString,
  model_variant: nullableString,
  training_protocol: nullableString,
  prompt_setting: nullableString,
  noise_level: nullableString,
  publication_year: z.number().int().nullable(),
});
const v9LocatorSchema = z.strictObject({
  pdf_page_index: z.number().int().nullable(),
  printed_page_label: nullableString,
  section: nullableString,
  table_id: nullableString,
  figure_id: nullableString,
  bbox: z.tuple([z.number(), z.number(), z.number(), z.number()]).nullable(),
  citation_format_version: z.string(),
});
const v9EvidencePacketSchema = z.strictObject({
  evidence_id: z.string(),
  packet: z.strictObject({
    schema_version: z.string(),
    evidence_id: z.string(),
    task_id: z.string(),
    round_id: z.string(),
    query_id: z.string(),
    slot_ids: z.array(z.string()),
    statement: nullableString,
    support_type: z.enum(["direct", "calculated", "scope_constraint", "contradictory"]),
    source: v9SourceSchema,
    scope: v9EvidenceScopeSchema,
    locator: v9LocatorSchema,
    raw_value: z.union([z.string(), z.number().finite()]).nullable(),
    normalized_value: z.union([z.string(), z.number().finite()]).nullable(),
    unit: nullableString,
    calculation_operation: nullableString,
    premise_evidence_ids: z.array(z.string()),
    display_precision: nonNegativeInteger.nullable(),
    rounding_mode: nullableString,
    extractor_version: nullableString,
    prompt_version: nullableString,
    validation_status: z.enum(["deterministic_valid", "quote_bound", "derived_non_evidence", "invalid"]),
  }),
});
const v9SufficiencySchema = z.strictObject({
  evidence_complete: z.boolean(),
  answerable: z.boolean(),
  response_status: z.enum(["complete", "qualified_partial", "insufficient"]),
  supported_slot_ids: z.array(z.string()),
  conflicted_slot_ids: z.array(z.string()),
  explicitly_unavailable_slot_ids: z.array(z.string()),
  not_found_slot_ids: z.array(z.string()),
  stop_reason: nullableString,
});
const v9ContextPackSchema = z.strictObject({
  packed_evidence_ids: z.array(z.string()),
  dropped_evidence_ids: z.array(z.string()),
  token_count: z.number().int().nullable(),
  selection_policy_version: nullableString,
  candidate_count: z.number().int().nullable(),
  selection_decisions: z.array(
    z.strictObject({
      evidence_id: z.string(),
      selected: z.boolean(),
      base_quality: z.number().finite(),
      source_bonus: z.number().finite(),
      redundancy_penalty: z.number().finite(),
      visual_penalty: z.number().finite(),
      utility: z.number().finite(),
      reason: z.string(),
    }),
  ),
});
const v9BudgetSchema = z.strictObject({
  reservation_id: z.string(),
  phase: z.string(),
  estimated_input_tokens: nonNegativeInteger,
  reserved_output_tokens: nonNegativeInteger,
  reserved_reasoning_tokens: nonNegativeInteger,
  provider_attempt: positiveInteger,
});
const v9RetrievalTaskSchema = z.strictObject({
  task_id: z.string(),
  round_id: z.string(),
  query_id: z.string(),
  query: z.string(),
  target_slot_ids: z.array(z.string()),
  source_scope: v9ScopeSchema,
  source_group_id: z.string(),
  subject_id: nullableString.optional(),
  locator_hints: z.array(z.string()),
  graph_policy: z.enum(["never", "locator_fallback", "required_locator"]),
  visual_required: z.boolean(),
  depends_on_task_ids: z.array(z.string()),
});
const v9RepairSchema = z.strictObject({
  repair_round_index: nonNegativeInteger,
  tasks: z.array(v9RetrievalTaskSchema),
  resulting_evidence_ids: z.array(z.string()),
  stop_reason: nullableString,
});
const v9ConflictSchema = z.strictObject({
  candidate_id: z.string(),
  slot_id: z.string(),
  evidence_ids: z.array(z.string()),
  scope_match: z.enum(["same", "different", "unknown"]),
  reason: z.string(),
  unresolved: z.boolean(),
});
const v9FinalClaimSchema = z.strictObject({
  claim_id: z.string(),
  slot_id: nullableString,
  statement: nullableString,
  support_type: z.enum(["direct", "calculated", "comparative_inference", "qualified"]),
  evidence_ids: z.array(z.string()),
  premise_evidence_ids: z.array(z.string()),
  qualified_reason: nullableString,
});
const v9MetricsSchema = z.strictObject({
  provider_attempt_count: nonNegativeInteger,
  tool_operation_count: nonNegativeInteger,
  retrieval_query_count: nonNegativeInteger,
  final_generation_count: nonNegativeInteger.max(1),
  subtask_answer_count: z.literal(0),
  prose_curator_call_count: nonNegativeInteger.max(3),
  arbitration_call_count: nonNegativeInteger.max(1),
  atomic_planner_call_count: nonNegativeInteger.max(1),
  comparison_planner_call_count: z.literal(0),
  slot_binding_method: z.enum(["task_target_inherited", "not_instrumented"]),
  semantic_qualification: z.enum(["not_enabled", "not_instrumented"]),
  reserved_tokens: nonNegativeInteger,
  reconciled_tokens: nonNegativeInteger,
});
const v9ComparisonSchema = z.strictObject({
  planner_status: z.enum(["not_requested", "planned", "fallback", "unknown"]),
  planner_latency_ms: z.number().finite().nonnegative(),
  planner_fallback_reason: z.enum(["timeout", "provider_error", "invalid_response", "schema_violation", "invalid_subjects", "not_comparison", "unknown"]).nullable(),
  fallback_stage: z.enum(["response_decode", "transport_schema", "subject_validation", "trusted_plan_validation", "numeric_guard", "unknown"]).nullable(),
  validation_issues: z.array(z.strictObject({ path: z.string(), type: z.string() })),
  is_comparison: z.boolean(),
  subjects: z.array(
    z.strictObject({
      subject_id: z.string(),
      display_name: z.string(),
      aliases: z.array(z.string()),
      evidence_slot_ids: z.array(z.string()),
    }),
  ),
  dimensions: z.array(z.string()),
  task_diagnostics: z.array(
    z.strictObject({
      task_id: z.string(),
      subject_id: z.string(),
      query_hash: z.string(),
      query_preview: z.string(),
      status: z.enum(["executed", "fallback", "not_instrumented"]),
      fallback_reason: z.enum(["reranker_unavailable", "reranker_error", "reranker_empty_result", "unknown"]).nullable(),
      candidate_count: nonNegativeInteger,
      pre_subject_limit_count: nonNegativeInteger,
      selected_count: nonNegativeInteger,
      selected: z.array(z.strictObject({ doc_id: nullableString, chunk_id: nullableString })),
    }),
  ),
  coverage_before_repair: z.array(z.string()),
  missing_before_repair: z.array(z.string()),
  repair_executed: z.boolean(),
  coverage_after_repair: z.array(z.string()),
  missing_after_repair: z.array(z.string()),
  final_status: z.enum(["complete", "qualified_partial", "insufficient", "unknown"]),
  final_evidence_subjects: z.array(z.string()),
  final_evidence_count: nonNegativeInteger,
  final_evidence: z.array(
    z.strictObject({
      evidence_id: z.string(),
      doc_id: z.string(),
      chunk_id: nullableString,
      subject_ids: z.array(z.string()),
    }),
  ),
});
const v9Schema = z.strictObject({
  schema_version: z.string(),
  contract: v9ContractSchema.nullable(),
  slot_resolutions: z.array(v9SlotResolutionSchema),
  evidence_packets: z.array(v9EvidencePacketSchema),
  sufficiency: v9SufficiencySchema.nullable(),
  context_pack: v9ContextPackSchema.nullable(),
  budget: z.array(v9BudgetSchema),
  repairs: z.array(v9RepairSchema),
  conflicts: z.array(v9ConflictSchema),
  final_claims: z.array(v9FinalClaimSchema),
  metrics: v9MetricsSchema,
  comparison: v9ComparisonSchema.nullable(),
});
const runSummarySchema = z.strictObject({
  run_id: z.string(),
  campaign_id: z.string(),
  question_id: z.string(),
  mode: campaignModeSchema,
  repeat_number: positiveInteger,
  answer_preview: nullableString,
  latency_ms: nullableNumber,
  total_tokens: z.number().int().nonnegative().nullable(),
  accounting_status: z.enum(["complete", "partial", "not_available"]),
  created_at: z.string(),
});
const observabilityDataSchema = z.strictObject({
  run_id: z.string(),
  campaign_id: z.string(),
  run_summary: runSummarySchema,
  accounting_diagnostics: tokenBreakdownSchema,
  trace_events: z.array(traceEventSchema),
  llm_calls: z.array(llmCallSchema),
  retrieval_events: z.array(retrievalEventSchema),
  retrieval_chunks: z.array(retrievalChunkSchema),
  context_packs: z.array(contextPackSchema),
  tool_calls: z.array(toolCallSchema),
  routing_decisions: z.array(routingDecisionSchema),
  graph_events: z.array(graphEventSchema),
  graph_evidence_items: z.array(graphEvidenceSchema),
  graph_observability_status: z.enum(["recorded", "fallback", "not_instrumented"]),
  claims: z.array(claimSchema),
  claim_extraction_status: z.enum(["recorded", "empty", "not_instrumented"]),
  human_ratings: z.array(humanRatingSchema),
  evidence_coverage: z.array(evidenceCoverageSchema).nullable(),
  evidence_coverage_status: z.enum(["complete", "partial", "not_available", "not_instrumented"]),
  agentic_v9: v9Schema.nullable(),
});
const observabilityEnvelopeSchema = z
  .strictObject({
    included: z.boolean(),
    availability: availabilitySchema,
    data: observabilityDataSchema.nullable(),
  })
  .superRefine((value, context) => {
    if (value.included !== (value.data !== null)) {
      context.addIssue({
        code: "custom",
        message: "observability inclusion does not match data availability",
        path: ["data"],
      });
    }
  });

const runSchema = z.strictObject({
  result: resultSchema,
  ragas_metrics: z.record(z.string(), z.number().finite()),
  accounting: tokenBreakdownSchema,
  latency: z.strictObject({
    latency_ms: nullableNumber,
    total_latency_ms: nullableNumber,
    started_at: nullableString,
    completed_at: nullableString,
  }),
  observability: observabilityEnvelopeSchema,
});

const analyticsBase = {
  campaign_id: z.string(),
  analysis_unit: z.enum(["execution", "question", "category"]),
  sample_count: nonNegativeInteger,
  independent_question_count: nonNegativeInteger,
  repeat_count: nonNegativeInteger,
  sample_note: z.string(),
  warnings: z.array(z.string()),
};
const ratio = z.number().finite().min(0).max(1);
const metricObservationSchema = z.strictObject({
  value: nullableNumber,
  status: z.enum(["complete", "evaluating", "partial", "failed", "not_requested"]),
  valid_samples: nonNegativeInteger,
  missing_samples: nonNegativeInteger,
  failed_samples: nonNegativeInteger,
  evaluator_model: nullableString,
  metric_version: nullableString,
});
const latencySummarySchema = z.strictObject({
  mean_ms: nullableNumber,
  p50_ms: nullableNumber,
  p95_ms: nullableNumber,
  sample_count: nonNegativeInteger,
  method: z.literal("nearest_rank"),
  low_sample_size: z.boolean(),
});
const costSummarySchema = z.strictObject({
  benchmark_usd: nullableNumber,
  operational_usd: nullableNumber,
  pricing_status: z.enum(["complete", "partial", "unknown"]),
  priced_call_count: nonNegativeInteger,
  unpriced_call_count: nonNegativeInteger,
});
const researchModeSchema = z.strictObject({
  mode: z.string(),
  sample_count: nonNegativeInteger,
  comparable: z.boolean(),
  not_comparable_reasons: z.array(z.string()),
  quality: z.record(z.string(), metricObservationSchema),
  latency: latencySummarySchema,
  tokens: tokenBreakdownSchema,
  execution_cost: costSummarySchema,
});
const researchSummarySchema = z.strictObject({
  campaign_id: z.string(),
  research_schema_version: z.literal("2"),
  completed_run_count: nonNegativeInteger,
  total_run_count: nonNegativeInteger,
  failed_run_count: nonNegativeInteger,
  quality_status: z.enum(["complete", "evaluating", "partial", "failed", "not_requested"]),
  token_accounting_status: z.enum(["complete", "partial", "incomplete_legacy"]),
  pricing_status: z.enum(["complete", "partial", "unknown"]),
  phase_attribution_status: z.enum(["complete", "partial", "not_available"]),
  sample_count: nonNegativeInteger,
  quality: z.record(z.string(), metricObservationSchema),
  latency: latencySummarySchema,
  tokens: tokenBreakdownSchema,
  execution_cost: costSummarySchema,
  modes: z.array(researchModeSchema),
  evaluation_overhead: z.strictObject({
    tokens: tokenBreakdownSchema,
    cost_usd: nullableNumber,
    pricing_status: z.enum(["complete", "partial", "unknown"]),
    evaluator_models: z.array(z.string()),
    metric_names: z.array(z.string()),
    batch_count: nonNegativeInteger,
    retry_count: nonNegativeInteger.nullable(),
  }),
  warnings: z.array(
    z.strictObject({
      code: z.string(),
      message: z.string(),
      mode: nullableString,
    }),
  ),
});
const releaseMetricSchema = z.strictObject({
  value: nullableNumber,
  reason: nullableString,
});
const releaseMetricsSchema = z.strictObject({
  benchmark_id: z.string(),
  benchmark_kind: z.string(),
  comparable: z.boolean(),
  availability: z.enum(["available", "not_applicable"]),
  not_applicable_reason: nullableString,
  gate_reasons: z.array(z.string()),
  manifest: z.union([
    z.strictObject({
      benchmark_id: z.string(),
      kind: z.enum(["smoke", "formal", "insufficient"]),
      arm_order_seed: z.number().int(),
      ordered_blocks: z.array(
        z.strictObject({
          question_id: z.string(),
          repeat_number: positiveInteger,
          mode: z.string(),
          condition_id: z.string(),
          execution_profile: z.string(),
          agentic_execution_version: z.string(),
          shadow_evaluation_policy: nullableString,
          golden_question_fingerprint: nullableString,
        }),
      ),
      evaluator_blinding: z.strictObject({
        enabled: z.boolean(),
        shown_mode_label: z.boolean(),
        method: z.string(),
      }),
      environment_fingerprint: nullableString,
      evaluator_fingerprint: nullableString,
      non_blocking_ablations: z.array(z.string()),
    }),
    emptyObjectSchema,
  ]),
  arms: z.array(
    z.strictObject({
      mode: z.string(),
      condition_id: z.string(),
      execution_profile: z.string(),
      agentic_execution_version: z.string(),
      shadow_evaluation_policy: nullableString,
      response_status_counts: z.record(z.string(), nonNegativeInteger),
      run_count: nonNegativeInteger,
      complete_run_count: nonNegativeInteger,
      accounting_complete_run_count: nonNegativeInteger,
    }),
  ),
  required_slot_coverage: releaseMetricSchema,
  important_unsupported_claim_rate: releaseMetricSchema,
  provenance_failure_rate: releaseMetricSchema,
  pack_efficiency: releaseMetricSchema,
  graph_locator_success: releaseMetricSchema,
  graph_locator_fallback: releaseMetricSchema,
  final_generation_count: releaseMetricSchema,
  latency_p95_ms: releaseMetricSchema,
  token_ratio: releaseMetricSchema,
  paired_quality_delta: releaseMetricSchema,
  paired_quality_ci_lower: releaseMetricSchema,
  paired_quality_ci_upper: releaseMetricSchema,
  category_quality_deltas: z.record(z.string(), releaseMetricSchema),
  per_question_quality_deltas: z.record(z.string(), releaseMetricSchema),
  statistics: z.union([
    z.strictObject({
      method: z.string(),
      availability: z.literal("release_gate_blocked").nullable(),
      seed: z.number().int().nullable(),
      resamples: nonNegativeInteger.nullable(),
      cluster_count: nonNegativeInteger.nullable(),
      repeat_aggregation: nullableString,
      token_ratio_method: nullableString,
      final_generation_count_aggregation: nullableString,
    }),
    emptyObjectSchema,
  ]),
});
const overviewSchema = z.strictObject({
  research_summary: researchSummarySchema,
  release_metrics: sectionSchema(releaseMetricsSchema),
});

const questionModeSchema = z.strictObject({
  mode: campaignModeSchema,
  sample_count: nonNegativeInteger,
  answer_correctness: ratio.nullable(),
  faithfulness: ratio.nullable(),
  answer_relevancy: ratio.nullable(),
  mean_latency_ms: z.number().finite().nonnegative().nullable(),
  mean_tokens: z.number().finite().nonnegative().nullable(),
  quality_status: z.enum(["complete", "partial", "not_available", "not_instrumented"]),
  accounting_status: z.enum(["complete", "partial", "not_available"]),
});
const questionRowSchema = z.strictObject({
  question_id: z.string(),
  category: nullableString,
  difficulty: nullableString,
  required_modalities: z.array(z.string()).nullable(),
  by_mode: z.array(questionModeSchema),
  delta_correctness: nullableNumber,
  delta_faithfulness: nullableNumber,
  delta_latency_ms: nullableNumber,
  delta_tokens: nullableNumber,
  ecr_correctness: nullableNumber,
  best_quality_mode: campaignModeSchema.nullable(),
  evidence_coverage: ratio.nullable(),
  unsupported_claim_ratio: ratio.nullable(),
  comparability_reason: nullableString,
});
const questionAnalysisSchema = z.strictObject({
  ...analyticsBase,
  rows: z.array(questionRowSchema),
  summaries: z.record(z.string(), questionRowSchema),
});

const legacyBehaviorSchema = z.strictObject({
  subtasks: nonNegativeInteger.nullable(),
  tool_calls: nonNegativeInteger.nullable(),
  visual_calls: nonNegativeInteger.nullable(),
  graph_calls: nonNegativeInteger.nullable(),
  drilldown_depth: nonNegativeInteger.nullable(),
});
const v9BehaviorSchema = z.strictObject({
  route: nullableString,
  contract_version: nullableString,
  slot_plan_status: nullableString,
  slot_semantics: nullableString,
  atomic_completeness: z.boolean().nullable(),
  atomic_completeness_reason: nullableString,
  graph_policy: nullableString,
  visual_requested: z.boolean().nullable(),
  visual_required: z.boolean().nullable(),
  evidence_extraction_required: z.boolean().nullable(),
  retrieval_query_count: nonNegativeInteger.nullable(),
  provider_attempt_count: nonNegativeInteger.nullable(),
  final_generation_count: nonNegativeInteger.nullable(),
  evidence_packet_count: nonNegativeInteger.nullable(),
  packed_evidence_count: nonNegativeInteger.nullable(),
  slot_resolution_count: nonNegativeInteger.nullable(),
  required_slot_count: nonNegativeInteger.nullable(),
  supported_slot_count: nonNegativeInteger.nullable(),
  repair_count: nonNegativeInteger.nullable(),
  final_claim_count: nonNegativeInteger.nullable(),
  reserved_tokens: nonNegativeInteger.nullable(),
  reconciled_tokens: nonNegativeInteger.nullable(),
  graph_execution: z.enum(["not_requested", "not_triggered", "executed", "failed", "required_but_not_satisfied", "attempted_without_evidence", "not_instrumented"]),
  visual_execution: z.enum(["not_requested", "not_triggered", "executed", "failed", "required_but_not_satisfied", "attempted_without_evidence", "not_instrumented"]),
});
const behaviorRowSchema = z.strictObject({
  run_id: z.string(),
  campaign_id: z.string(),
  question_id: z.string(),
  mode: campaignModeSchema,
  repeat_number: positiveInteger,
  behavior_schema: z.enum(["v8", "v9", "not_applicable"]),
  trace_status: z.enum(["completed", "partial", "failed", "not_applicable", "not_instrumented"]),
  failure_reason: nullableString,
  accounting_status: z.enum(["complete", "partial", "not_available"]),
  subtasks: nonNegativeInteger.nullable(),
  tool_calls: nonNegativeInteger.nullable(),
  visual_calls: nonNegativeInteger.nullable(),
  graph_calls: nonNegativeInteger.nullable(),
  drilldown_depth: nonNegativeInteger.nullable(),
  correctness: ratio.nullable(),
  faithfulness: ratio.nullable(),
  unsupported_claim_ratio: ratio.nullable(),
  supported_claim_ratio: ratio.nullable(),
  total_tokens: nonNegativeInteger.nullable(),
  legacy: legacyBehaviorSchema.nullable(),
  v9: v9BehaviorSchema.nullable(),
});
const agentBehaviorSchema = z.strictObject({
  ...analyticsBase,
  behavior_schema_version: z.literal("2"),
  rows: z.array(behaviorRowSchema),
  summaries: z.record(z.string(), behaviorRowSchema),
});

const routerRowSchema = z.strictObject({
  routing_decision_id: z.string(),
  run_id: z.string(),
  campaign_id: z.string(),
  question_id: z.string(),
  repeat_number: positiveInteger,
  span_id: nullableString,
  selected_mode: campaignModeSchema,
  analysis_type: z.literal("retrospective"),
  decision_source: z.enum(["deterministic", "llm_planner", "safe_fallback"]).nullable(),
  candidate_routes: z.array(z.string()),
  matched_rules: z.array(z.string()),
  fallback_reason: nullableString,
  confidence: nullableNumber,
  reason: nullableString,
  created_at: z.string(),
});
const routerAnalysisSchema = z.strictObject({
  ...analyticsBase,
  analysis_type: z.literal("retrospective"),
  rows: z.array(routerRowSchema),
  summaries: z.strictObject({ decision_count: nonNegativeInteger }),
});

const conditionMetricSchema = z.strictObject({
  mean: nullableNumber,
  valid_count: nonNegativeInteger,
  missing_count: nonNegativeInteger,
});
const ablationScalar = z.union([z.boolean(), z.number().finite(), z.string(), z.null()]);
const ablationNested = z.record(z.string(), ablationScalar);
const conditionAggregateSchema = z.strictObject({
  condition_id: z.string(),
  label: z.string(),
  ablation_flags: z.record(z.string(), z.union([ablationScalar, ablationNested, z.record(z.string(), ablationNested)])),
  execution_count: nonNegativeInteger,
  completed_count: nonNegativeInteger,
  failed_count: nonNegativeInteger,
  quality: z.record(z.string(), conditionMetricSchema),
  mean_tokens: z.number().finite().nonnegative().nullable(),
  mean_latency_ms: z.number().finite().nonnegative().nullable(),
});
const conditionComparisonSchema = z.strictObject({
  conditions: z.record(z.string(), conditionAggregateSchema),
  paired: z
    .strictObject({
      baseline_condition_id: z.string(),
      guided_condition_id: z.string(),
      completed_pair_count: nonNegativeInteger,
      metric_pair_counts: z.record(z.string(), nonNegativeInteger),
      delta: z.record(z.string(), conditionMetricSchema),
      excluded_pairs: z.record(z.string(), nonNegativeInteger),
    })
    .nullable(),
  availability: z.strictObject({
    ragas_rows_found: z.boolean(),
    valid_metric_row_count: nonNegativeInteger,
    warning: nullableString,
  }),
});
const ablationSchema = z.strictObject({
  ...analyticsBase,
  rows: z.array(z.strictObject({})),
  summaries: z.strictObject({
    condition_counts: z.record(z.string(), nonNegativeInteger),
    condition_labels: z.record(z.string(), z.string()),
    conditions_by_ablation_family: z.record(z.string(), z.record(z.string(), nonNegativeInteger)),
    graph_metrics_by_ablation_family: z.record(z.string(), z.record(z.string(), nullableNumber)),
    condition_comparison: conditionComparisonSchema.nullable().optional(),
  }),
});

const humanComparisonSchema = z.strictObject({
  ...analyticsBase,
  rows: z.array(
    z.strictObject({
      run_id: z.string(),
      question_id: z.string(),
      mode: campaignModeSchema,
      rating_count: nonNegativeInteger,
      human_correctness_mean: ratio,
      human_faithfulness_mean: ratio,
      ragas_answer_correctness: ratio.nullable(),
      ragas_faithfulness: ratio.nullable(),
    }),
  ),
  summaries: z.strictObject({
    human_rating_count: nonNegativeInteger,
    paired_sample_count: nonNegativeInteger,
    human_correctness_mean: ratio.nullable(),
    human_faithfulness_mean: ratio.nullable(),
    ragas_human_pearson_r: z.number().finite().min(-1).max(1).nullable(),
    ragas_human_spearman_r: z.number().finite().min(-1).max(1).nullable(),
    inter_rater_agreement: ratio.nullable(),
  }),
});
const humanQueueSchema = z.strictObject({
  campaign_id: z.string(),
  rows: z.array(
    z.strictObject({
      run_id: z.string(),
      campaign_id: z.string(),
      question_id: z.string(),
      question: z.string(),
      mode: campaignModeSchema,
      run_number: positiveInteger,
      repeat_number: positiveInteger,
      answer_preview: nullableString,
      existing_rating_count: nonNegativeInteger,
      already_rated_by_current_user: z.boolean(),
    }),
  ),
});
const diagnosticsSchema = z.strictObject({
  errors: z.strictObject({
    campaign_id: z.string(),
    rows: z.array(
      z.strictObject({
        run_id: z.string(),
        campaign_id: z.string(),
        stage_name: z.string(),
        code: nullableString,
        message: z.string(),
        source: z.enum(["run", "trace", "llm_call"]),
        created_at: z.string(),
      }),
    ),
  }),
  stage_warnings: z.strictObject({
    campaign_id: z.string(),
    rows: z.array(
      z.strictObject({
        run_id: z.string(),
        campaign_id: z.string(),
        question_id: z.string(),
        mode: campaignModeSchema,
        stage_name: z.string(),
        status: z.enum(["partial", "required_but_not_satisfied"]),
        failure_reason: z.string(),
        created_at: z.string(),
      }),
    ),
  }),
});

export const evaluationExportV2Schema = z.strictObject({
  schema_version: z.literal("2.0"),
  export_metadata: z.strictObject({
    exported_at: z.string(),
    options: exportOptionsSchema,
    redaction: z.strictObject({
      provider_errors: z.literal("excluded"),
      stack_traces: z.literal("excluded"),
      credentials: z.literal("redacted"),
    }),
    availability_warnings: z.array(z.string()),
  }),
  campaign: z.strictObject({
    id: z.string(),
    name: nullableString,
    status: lifecycleSchema,
    benchmark_id: nullableString,
    modes: z.array(campaignModeSchema),
    repeat_count: positiveInteger,
    created_at: z.string(),
    updated_at: z.string(),
  }),
  sections: z.strictObject({
    overview: sectionSchema(overviewSchema),
    question_analysis: sectionSchema(questionAnalysisSchema),
    agent_behavior: sectionSchema(agentBehaviorSchema),
    router_analysis: sectionSchema(routerAnalysisSchema),
    ablation: sectionSchema(ablationSchema),
    human_evaluation: sectionSchema(
      z.strictObject({
        comparison: humanComparisonSchema,
        queue: humanQueueSchema,
      }),
    ),
    diagnostics: sectionSchema(diagnosticsSchema),
  }),
  runs: z.array(runSchema),
});

export function parseExportCampaignResponse(value: unknown): ExportCampaignResponse {
  const parsed = evaluationExportV2Schema.safeParse(value);
  if (!parsed.success) {
    const diagnostics = parsed.error.issues
      .slice(0, 3)
      .map((issue) => `${issue.path.map(String).join(".") || "<root>"} (${issue.code})`)
      .join(", ");
    throw new Error(`Invalid export response.${diagnostics ? ` ${diagnostics}` : ""}`);
  }
  return parsed.data as ExportCampaignResponse;
}
