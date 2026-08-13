import { z } from 'zod';
import type { ExportCampaignResponse } from '../types/evaluation';

const jsonValueSchema: z.ZodType<unknown> = z.lazy(() => z.union([
  z.string(), z.number(), z.boolean(), z.null(), z.array(jsonValueSchema),
  z.record(z.string(), jsonValueSchema),
]));
const jsonObjectSchema = z.record(z.string(), jsonValueSchema);
const nullableString = z.string().nullable();
const nullableNumber = z.number().finite().nullable();
const nonNegativeInteger = z.number().int().nonnegative();
const positiveInteger = z.number().int().positive();

const campaignModeSchema = z.enum([
  'naive', 'naive-baseline', 'advanced', 'graph', 'agentic', 'agentic-v8', 'v8',
  'agentic-v9', 'v9', 'agentic-v9-shadow', 'router', 'graph_raw_current',
  'graph_provenance_gated', 'graph_locator_to_chunk', 'graph_locator_claim_gate',
  'always_no_graph', 'always_graph_locator', 'router_auto_graph', 'oracle_graph_router',
  'graph_local_first', 'graph_global_first', 'graph_blended', 'graph_path_pruned',
  'graph_planning_only',
]);
const lifecycleSchema = z.enum([
  'pending', 'running', 'evaluating', 'completed', 'completed_with_errors', 'failed', 'cancelled',
]);
const availabilitySchema = z.strictObject({
  status: z.enum(['complete', 'partial', 'not_instrumented', 'not_available', 'not_applicable']),
  reasons: z.array(z.string()).optional(),
});
const sectionSchema = <T extends z.ZodType>(data: T) => z.strictObject({
  availability: availabilitySchema,
  data: data.nullable(),
});

const exportOptionsSchema = z.strictObject({
  include_run_observability: z.boolean().optional(),
  include_raw_trace_payloads: z.boolean().optional(),
  include_prompt_previews: z.boolean().optional(),
  include_full_prompts: z.boolean().optional(),
  include_answers: z.boolean().optional(),
  include_retrieved_excerpts: z.boolean().optional(),
  format: z.literal('json').optional(),
});

const tokenBreakdownSchema = z.strictObject({
  input_tokens: nullableNumber.optional(), output_text_tokens: nullableNumber.optional(),
  reasoning_tokens: nullableNumber.optional(), other_tokens: nullableNumber.optional(),
  total_tokens: nullableNumber.optional(), by_phase: z.record(z.string(), nonNegativeInteger).optional(),
  observed_call_count: nonNegativeInteger.optional(), measured_call_count: nonNegativeInteger.optional(),
  missing_usage_call_count: nonNegativeInteger.optional(), unbalanced_call_count: nonNegativeInteger.optional(),
  unclassified_phase_call_count: nonNegativeInteger.optional(),
  missing_usage_by_phase: z.record(z.string(), nonNegativeInteger).optional(),
  missing_usage_by_purpose: z.record(z.string(), nonNegativeInteger).optional(),
  missing_usage_by_provider: z.record(z.string(), nonNegativeInteger).optional(),
  accounting_status: z.enum(['complete', 'partial', 'incomplete_legacy']),
  phase_attribution_status: z.enum(['complete', 'partial', 'not_available']),
  phase_attribution_reasons: z.array(z.string()).optional(),
});

const resultSchema = z.strictObject({
  run_id: z.string(), campaign_id: z.string(), question_id: z.string(), question: z.string(),
  mode: campaignModeSchema, run_number: positiveInteger, repeat_number: positiveInteger,
  condition_id: nullableString, execution_profile: nullableString, context_policy_version: nullableString,
  agentic_execution_version: z.enum(['v8', 'v9']), execution_identity: nullableString,
  response_status: nullableString, status: z.enum(['completed', 'failed']), answer: nullableString,
  ground_truth: nullableString, ground_truth_short: nullableString, contexts: z.array(z.string()).nullable(),
  source_doc_ids: z.array(z.string()), latency_ms: nullableNumber.optional(),
  total_latency_ms: nullableNumber.optional(), total_tokens: z.number().int().nonnegative().nullable().optional(),
  created_at: z.string(),
});

const evidenceReferenceSchema = z.strictObject({
  evidence_id: nullableString.optional(), doc_id: nullableString.optional(),
  chunk_id: nullableString.optional(), page: z.number().int().nullable().optional(),
});
const traceEventSchema = z.strictObject({
  event_id: z.string(), run_id: z.string(), campaign_id: z.string(), span_id: z.string(),
  parent_event_id: nullableString.optional(), parent_span_id: nullableString.optional(), event_type: z.string(),
  event_schema_version: z.string(), sequence: positiveInteger,
  stage_type: z.enum(['routing', 'planning', 'retrieval', 'rerank', 'graph', 'visual', 'tool', 'context_packing', 'generation', 'claim_verification', 'evaluation', 'export']),
  stage_name: z.string(), started_at: z.string(), ended_at: nullableString.optional(),
  duration_ms: nullableNumber.optional(), status: z.enum(['running', 'success', 'failed', 'skipped', 'timeout', 'partial']),
  retry_count: nonNegativeInteger, payload: jsonObjectSchema.optional(), created_at: z.string(),
});
const llmCallSchema = z.strictObject({
  llm_call_id: z.string(), run_id: z.string(), campaign_id: z.string(), span_id: nullableString.optional(),
  provider: nullableString.optional(), model_name: nullableString.optional(), phase: z.string(), purpose: z.string(),
  reservation_id: nullableString.optional(), provider_attempt: positiveInteger.nullable().optional(),
  prompt_tokens: nonNegativeInteger, completion_tokens: nonNegativeInteger, total_tokens: nonNegativeInteger,
  reasoning_tokens: nonNegativeInteger.nullable().optional(), other_tokens: nonNegativeInteger.nullable().optional(),
  estimated_cost_usd: nullableNumber.optional(), estimated_cost_twd: nullableNumber.optional(), latency_ms: nullableNumber.optional(),
  status: z.enum(['running', 'success', 'failed', 'skipped', 'timeout', 'partial']),
  prompt_hash: nullableString.optional(), response_hash: nullableString.optional(),
  prompt_capture_status: z.enum(['unknown', 'captured', 'redacted', 'not_captured_at_execution', 'capture_failed']),
  full_prompt_capture_status: z.enum(['unknown', 'captured', 'redacted', 'not_captured_at_execution', 'capture_failed']),
  prompt_preview: nullableString.optional(), full_prompt: nullableString.optional(), created_at: z.string(),
});
const retrievalEventSchema = z.strictObject({
  retrieval_event_id: z.string(), run_id: z.string(), campaign_id: z.string(), span_id: nullableString.optional(),
  query: nullableString.optional(), query_hash: nullableString.optional(), retriever_name: nullableString.optional(),
  top_k: nonNegativeInteger.nullable().optional(), result_count: nonNegativeInteger,
  latency_ms: nullableNumber.optional(), created_at: z.string(),
});
const retrievalChunkSchema = z.strictObject({
  retrieval_chunk_id: z.string(), run_id: z.string(), campaign_id: z.string(), span_id: nullableString.optional(),
  retrieval_event_id: z.string(), chunk_id: z.string(), doc_id: nullableString.optional(),
  page_start: z.number().int().nullable().optional(), page_end: z.number().int().nullable().optional(), modality: nullableString.optional(),
  rank_before_rerank: z.number().int().nullable().optional(), rank_after_rerank: z.number().int().nullable().optional(),
  dense_score: nullableNumber.optional(), bm25_score: nullableNumber.optional(), rerank_score: nullableNumber.optional(),
  used_in_context: z.boolean().nullable().optional(), used_in_answer: z.boolean().nullable().optional(),
  expected_evidence_match: z.boolean().nullable().optional(), excerpt: nullableString.optional(), content_hash: nullableString.optional(),
  provenance: z.enum(['measured', 'persisted', 'derived', 'heuristic']), availability: availabilitySchema, created_at: z.string(),
});
const contextPackSchema = z.strictObject({
  context_pack_id: z.string(), run_id: z.string(), campaign_id: z.string(), attempt_id: nullableString.optional(),
  condition_id: z.string(), schema_version: z.string(), span_id: nullableString.optional(),
  input_chunk_count: nonNegativeInteger, packed_chunk_count: nonNegativeInteger, token_count: nonNegativeInteger,
  retrieved_but_not_packed_evidence: z.array(evidenceReferenceSchema), created_at: z.string(),
});
const toolCallSchema = z.strictObject({
  tool_call_id: z.string(), run_id: z.string(), campaign_id: z.string(), span_id: nullableString.optional(),
  tool_name: z.string(), action: nullableString.optional(), latency_ms: nullableNumber.optional(),
  status: z.enum(['running', 'success', 'failed', 'skipped', 'timeout', 'partial']), created_at: z.string(),
});
const routingDecisionSchema = z.strictObject({
  routing_decision_id: z.string(), run_id: z.string(), campaign_id: z.string(), span_id: nullableString.optional(),
  selected_mode: campaignModeSchema, analysis_type: z.enum(['retrospective', 'actual']),
  decision_source: z.enum(['deterministic', 'llm_planner', 'safe_fallback']).nullable(), candidate_routes: z.array(z.string()),
  matched_rules: z.array(z.string()), fallback_reason: nullableString, confidence: nullableNumber,
  reason: nullableString, created_at: z.string(),
});
const graphEventSchema = z.strictObject({
  graph_event_id: z.string(), run_id: z.string(), campaign_id: nullableString, span_id: nullableString,
  graph_query: z.string(), graph_search_mode: z.string(), graph_evidence_mode: z.string(), graph_route: z.string(),
  router_reason: nullableString, graph_snapshot_version: nullableString, graph_schema_version: nullableString,
  graph_extraction_prompt_version: nullableString, matched_entity_ids: z.array(z.string()), community_ids: z.array(z.number().int()),
  node_count: nonNegativeInteger, edge_count: nonNegativeInteger, path_count: nonNegativeInteger,
  graph_latency_ms: nonNegativeInteger.nullable().optional(), graph_context_tokens: nonNegativeInteger,
  graph_to_chunk_success_rate: z.number().min(0).max(1).nullable().optional(), graph_noise_ratio: z.number().min(0).max(1).nullable().optional(),
  created_at: z.string(),
});
const graphEvidenceSchema = z.strictObject({
  graph_evidence_item_id: z.string(), graph_event_id: z.string(), node_ids: z.array(z.string()), edge_ids: z.array(z.string()),
  relation_path: z.array(z.string()), source_doc_ids: z.array(z.string()), source_chunk_ids: z.array(z.string()),
  pages: z.array(z.number().int()), asset_ids: z.array(z.string()), confidence: z.number().min(0).max(1),
  provenance_status: z.enum(['full', 'partial', 'missing']), used_as_locator: z.boolean(), packed_in_context: z.boolean(),
  used_in_answer: z.boolean(), supported_claim_ids: z.array(z.string()), created_at: z.string(),
});
const claimSchema = z.strictObject({
  claim_id: z.string(), run_id: z.string(), campaign_id: z.string(), attempt_id: nullableString,
  condition_id: z.string(), schema_version: z.string(), span_id: nullableString, claim_text: nullableString,
  claim_type: nullableString, support_status: z.enum(['supported', 'partially_supported', 'unsupported', 'contradicted']),
  evidence_refs: z.array(evidenceReferenceSchema), unsupported_reason: nullableString, repair_action: nullableString,
  post_repair_status: nullableString, extraction_status: z.enum(['recorded', 'empty', 'not_instrumented']), created_at: z.string(),
});
const humanRatingSchema = z.strictObject({
  human_rating_id: z.string(), run_id: z.string(), campaign_id: z.string(), span_id: nullableString,
  rater_id_hash: z.string(), rubric_version: z.string(), correctness_score: z.number().min(0).max(1),
  faithfulness_score: z.number().min(0).max(1), completeness_score: z.number().min(0).max(1),
  citation_quality_score: z.number().min(0).max(1), usefulness_score: z.number().min(0).max(1),
  comments: nullableString, is_blinded: z.boolean(), shown_mode_label: z.boolean(), created_at: z.string(),
});
const evidenceCoverageSchema = z.strictObject({
  atomic_fact_id: z.string(), fact_text: nullableString, retrieved: z.boolean(), packed: z.boolean(),
  mentioned: z.boolean(), cited: z.boolean(), expected_doc_ids: z.array(z.string()),
});

const v9RouteSchema = z.enum(['single_lookup', 'bounded_compare', 'exact_structured', 'multi_document_exact', 'multi_hop', 'graph_relational']);
const v9ScopeSchema = z.strictObject({
  requested_doc_ids: z.array(z.string()).optional(), requested_source_names: z.array(z.string()).optional(),
  resolved_doc_ids: z.array(z.string()).optional(), authorized_doc_ids: z.array(z.string()).optional(),
  source_name_to_doc_ids: z.record(z.string(), z.array(z.string())).optional(), rejected_source_names: z.array(z.string()).optional(),
});
const v9RequiredSlotSchema = z.strictObject({
  slot_id: z.string(), description: z.string(), required: z.boolean().optional(), entity_ids: z.array(z.string()).optional(),
  locator_hints: z.array(z.string()).optional(), source_name_hints: z.array(z.string()).optional(),
  authorized_source_doc_ids: z.array(z.string()).optional(),
  expected_answer_type: z.enum(['number', 'equation', 'definition', 'comparison', 'explanation', 'text']).nullable().optional(),
  depends_on_slot_ids: z.array(z.string()).optional(), visual_policy: z.enum(['never', 'preferred', 'required']).nullable().optional(),
});
const v9RouteDecisionSchema = z.strictObject({
  selected_route: v9RouteSchema, decision_source: z.enum(['deterministic', 'llm_planner', 'safe_fallback']),
  matched_rules: z.array(z.string()).optional(), candidate_routes: z.array(z.string()).optional(), route_reason: z.string(),
  planner_call_used: z.boolean().optional(), fallback_reason: nullableString.optional(), confidence: z.number().finite().nullable(),
});
const v9ComparisonPlanSchema = z.strictObject({
  subjects: z.array(z.strictObject({
    subject_id: z.string(), display_name: z.string(), aliases: z.array(z.string()).optional(), retrieval_query: z.string(),
  })),
  dimensions: z.array(z.string()).optional(), qualification: nullableString.optional(),
});
const v9ContractSchema = z.strictObject({
  contract_version: z.string().optional(), route: v9RouteSchema, intent: z.string(),
  required_slots: z.array(v9RequiredSlotSchema).optional(), entities: z.array(z.string()).optional(),
  locator_hints: z.array(z.string()).optional(), graph_policy: z.enum(['never', 'locator_fallback', 'required_locator']).nullable().optional(),
  visual_requested: z.boolean().optional(), visual_required: z.boolean().optional(), evidence_extraction_required: z.boolean().optional(),
  max_retrieval_rounds: nonNegativeInteger.optional(), max_repair_rounds: nonNegativeInteger.optional(),
  max_llm_calls: nonNegativeInteger.optional(), runtime_token_budget: nonNegativeInteger.optional(),
  resolved_source_scope: v9ScopeSchema.nullable().optional(), strategy_tier: nullableString.optional(),
  route_decision: v9RouteDecisionSchema.nullable().optional(), comparison_plan: v9ComparisonPlanSchema.nullable().optional(),
  slot_plan_status: nullableString.optional(), slot_semantics: nullableString.optional(),
  atomic_completeness: z.boolean().nullable().optional(), atomic_completeness_reason: nullableString.optional(),
});
const v9SlotResolutionSchema = z.strictObject({
  slot_id: z.string(), resolution_stage: z.string(), resolution: z.strictObject({
    slot_id: z.string(), status: z.enum(['supported', 'conflicted', 'explicitly_unavailable', 'not_found']),
    evidence_ids: z.array(z.string()).optional(), reason: nullableString.optional(), resolution_stage: nullableString.optional(),
  }),
});
const v9SourceSchema = z.strictObject({
  doc_id: z.string(), chunk_id: nullableString.optional(), parent_id: nullableString.optional(), asset_id: nullableString.optional(),
  document_name: nullableString.optional(), source_span_hash: nullableString.optional(),
});
const v9EvidenceScopeSchema = z.strictObject({
  dataset: nullableString.optional(), split: nullableString.optional(), metric: nullableString.optional(),
  model_variant: nullableString.optional(), training_protocol: nullableString.optional(), prompt_setting: nullableString.optional(),
  noise_level: nullableString.optional(), publication_year: z.number().int().nullable().optional(),
});
const v9LocatorSchema = z.strictObject({
  pdf_page_index: z.number().int().nullable().optional(), printed_page_label: nullableString.optional(), section: nullableString.optional(),
  table_id: nullableString.optional(), figure_id: nullableString.optional(),
  bbox: z.tuple([z.number(), z.number(), z.number(), z.number()]).nullable().optional(), citation_format_version: z.string().optional(),
});
const v9EvidencePacketSchema = z.strictObject({
  evidence_id: z.string(), packet: z.strictObject({
    schema_version: z.string(), evidence_id: z.string(), task_id: z.string(), round_id: z.string(), query_id: z.string(),
    slot_ids: z.array(z.string()), statement: nullableString,
    support_type: z.enum(['direct', 'calculated', 'scope_constraint', 'contradictory']),
    source: v9SourceSchema, scope: v9EvidenceScopeSchema, locator: v9LocatorSchema,
    raw_value: z.union([z.string(), z.number().finite()]).nullable().optional(),
    normalized_value: z.union([z.string(), z.number().finite()]).nullable().optional(), unit: nullableString.optional(),
    calculation_operation: nullableString.optional(), premise_evidence_ids: z.array(z.string()).optional(),
    display_precision: nonNegativeInteger.nullable().optional(), rounding_mode: nullableString.optional(),
    extractor_version: nullableString.optional(), prompt_version: nullableString.optional(),
    validation_status: z.enum(['deterministic_valid', 'quote_bound', 'derived_non_evidence', 'invalid']).optional(),
  }),
});
const v9SufficiencySchema = z.strictObject({
  evidence_complete: z.boolean(), answerable: z.boolean(), response_status: z.enum(['complete', 'qualified_partial', 'insufficient']),
  supported_slot_ids: z.array(z.string()).optional(), conflicted_slot_ids: z.array(z.string()).optional(),
  explicitly_unavailable_slot_ids: z.array(z.string()).optional(), not_found_slot_ids: z.array(z.string()).optional(),
  stop_reason: nullableString.optional(),
});
const v9ContextPackSchema = z.strictObject({
  packed_evidence_ids: z.array(z.string()).optional(), dropped_evidence_ids: z.array(z.string()).optional(),
  token_count: z.number().int().nullable().optional(), selection_policy_version: nullableString.optional(),
  candidate_count: z.number().int().nullable().optional(), selection_decisions: z.array(z.strictObject({
    evidence_id: z.string(), selected: z.boolean(), base_quality: z.number().finite(), source_bonus: z.number().finite(),
    redundancy_penalty: z.number().finite(), visual_penalty: z.number().finite(), utility: z.number().finite(), reason: z.string(),
  })).optional(),
});
const v9BudgetSchema = z.strictObject({
  reservation_id: z.string(), phase: z.string(), estimated_input_tokens: nonNegativeInteger, reserved_output_tokens: nonNegativeInteger,
  reserved_reasoning_tokens: nonNegativeInteger.optional(), provider_attempt: positiveInteger.optional(),
});
const v9RetrievalTaskSchema = z.strictObject({
  task_id: z.string(), round_id: z.string(), query_id: z.string(), query: z.string(), target_slot_ids: z.array(z.string()),
  source_scope: v9ScopeSchema, source_group_id: z.string().optional(), subject_id: nullableString.optional(),
  locator_hints: z.array(z.string()).optional(), graph_policy: z.enum(['never', 'locator_fallback', 'required_locator']).optional(),
  visual_required: z.boolean().optional(), depends_on_task_ids: z.array(z.string()).optional(),
});
const v9RepairSchema = z.strictObject({
  repair_round_index: nonNegativeInteger, tasks: z.array(v9RetrievalTaskSchema).optional(),
  resulting_evidence_ids: z.array(z.string()).optional(), stop_reason: nullableString.optional(),
});
const v9ConflictSchema = z.strictObject({
  candidate_id: z.string(), slot_id: z.string(), evidence_ids: z.array(z.string()),
  scope_match: z.enum(['same', 'different', 'unknown']), reason: z.string(), unresolved: z.boolean().optional(),
});
const v9FinalClaimSchema = z.strictObject({
  claim_id: z.string(), slot_id: nullableString.optional(), statement: nullableString,
  support_type: z.enum(['direct', 'calculated', 'comparative_inference', 'qualified']),
  evidence_ids: z.array(z.string()).optional(), premise_evidence_ids: z.array(z.string()).optional(), qualified_reason: nullableString.optional(),
});
const v9MetricsSchema = z.strictObject({
  provider_attempt_count: nonNegativeInteger.optional(), tool_operation_count: nonNegativeInteger.optional(),
  retrieval_query_count: nonNegativeInteger.optional(), final_generation_count: nonNegativeInteger.optional(),
  subtask_answer_count: nonNegativeInteger.optional(), prose_curator_call_count: nonNegativeInteger.optional(),
  arbitration_call_count: nonNegativeInteger.optional(), reserved_tokens: nonNegativeInteger.optional(), reconciled_tokens: nonNegativeInteger.optional(),
});
const v9Schema = z.strictObject({
  schema_version: z.string().optional(), contract: v9ContractSchema.nullable().optional(),
  slot_resolutions: z.array(v9SlotResolutionSchema).optional(), evidence_packets: z.array(v9EvidencePacketSchema).optional(),
  sufficiency: v9SufficiencySchema.nullable().optional(), context_pack: v9ContextPackSchema.nullable().optional(),
  budget: z.array(v9BudgetSchema).optional(), repairs: z.array(v9RepairSchema).optional(), conflicts: z.array(v9ConflictSchema).optional(),
  final_claims: z.array(v9FinalClaimSchema).optional(), metrics: v9MetricsSchema.optional(), comparison: jsonObjectSchema.nullable().optional(),
});
const runSummarySchema = z.strictObject({
  run_id: z.string(), campaign_id: z.string(), question_id: z.string(), mode: campaignModeSchema,
  repeat_number: positiveInteger, answer_preview: nullableString, latency_ms: nullableNumber.optional(),
  total_tokens: z.number().int().nonnegative().nullable().optional(),
  accounting_status: z.enum(['complete', 'partial', 'not_available']), created_at: z.string(),
});
const observabilityDataSchema = z.strictObject({
  run_id: z.string(), campaign_id: z.string(), run_summary: runSummarySchema,
  accounting_diagnostics: tokenBreakdownSchema, trace_events: z.array(traceEventSchema), llm_calls: z.array(llmCallSchema),
  retrieval_events: z.array(retrievalEventSchema), retrieval_chunks: z.array(retrievalChunkSchema),
  context_packs: z.array(contextPackSchema), tool_calls: z.array(toolCallSchema), routing_decisions: z.array(routingDecisionSchema),
  graph_events: z.array(graphEventSchema), graph_evidence_items: z.array(graphEvidenceSchema),
  graph_observability_status: z.enum(['recorded', 'fallback', 'not_instrumented']), claims: z.array(claimSchema),
  claim_extraction_status: z.enum(['recorded', 'empty', 'not_instrumented']), human_ratings: z.array(humanRatingSchema),
  evidence_coverage: z.array(evidenceCoverageSchema).nullable(),
  evidence_coverage_status: z.enum(['complete', 'partial', 'not_available', 'not_instrumented']),
  agentic_v9: v9Schema.nullable(),
});
const runSchema = z.strictObject({
  result: resultSchema, ragas_metrics: z.record(z.string(), z.number().finite()), accounting: tokenBreakdownSchema,
  latency: z.strictObject({ latency_ms: nullableNumber.optional(), total_latency_ms: nullableNumber.optional(), started_at: nullableString.optional(), completed_at: nullableString.optional() }),
  observability: z.strictObject({ included: z.boolean(), availability: availabilitySchema, data: observabilityDataSchema.nullable() }),
});

const aggregateSchema = z.strictObject({
  campaign_id: z.string(), analysis_unit: z.enum(['execution', 'question', 'category']), sample_count: nonNegativeInteger,
  independent_question_count: nonNegativeInteger, repeat_count: positiveInteger, sample_note: z.string(),
  warnings: z.array(z.string()), rows: z.array(jsonObjectSchema), summaries: jsonObjectSchema,
});
const humanQueueSchema = z.strictObject({
  campaign_id: z.string(), rows: z.array(z.strictObject({
    run_id: z.string(), campaign_id: z.string(), question_id: z.string(), question: z.string(), mode: campaignModeSchema,
    run_number: positiveInteger, repeat_number: positiveInteger, answer_preview: nullableString,
    existing_rating_count: nonNegativeInteger, already_rated_by_current_user: z.boolean(),
  })).optional(),
});
const diagnosticsSchema = z.strictObject({
  errors: z.strictObject({ campaign_id: z.string(), rows: z.array(jsonObjectSchema) }),
  stage_warnings: z.strictObject({ campaign_id: z.string(), rows: z.array(jsonObjectSchema) }),
});

export const evaluationExportV2Schema = z.strictObject({
  schema_version: z.literal('2.0'),
  export_metadata: z.strictObject({
    exported_at: z.string(), options: exportOptionsSchema,
    redaction: z.strictObject({ provider_errors: z.literal('excluded'), stack_traces: z.literal('excluded'), credentials: z.literal('redacted') }),
    availability_warnings: z.array(z.string()),
  }),
  campaign: z.strictObject({
    id: z.string(), name: nullableString, status: lifecycleSchema, benchmark_id: nullableString,
    modes: z.array(campaignModeSchema), repeat_count: positiveInteger, created_at: z.string(), updated_at: z.string(),
  }),
  sections: z.strictObject({
    overview: sectionSchema(jsonObjectSchema), question_analysis: sectionSchema(jsonObjectSchema),
    agent_behavior: sectionSchema(jsonObjectSchema), router_analysis: sectionSchema(jsonObjectSchema),
    ablation: sectionSchema(jsonObjectSchema),
    human_evaluation: sectionSchema(z.strictObject({ comparison: aggregateSchema, queue: humanQueueSchema })),
    diagnostics: sectionSchema(diagnosticsSchema),
  }),
  runs: z.array(runSchema),
});

export function parseExportCampaignResponse(value: unknown): ExportCampaignResponse {
  const parsed = evaluationExportV2Schema.safeParse(value);
  if (!parsed.success) {
    throw new Error('Invalid export response.');
  }
  return parsed.data as ExportCampaignResponse;
}
