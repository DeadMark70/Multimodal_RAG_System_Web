import { describe, expect, it } from 'vitest';
import { AGENTIC_V9_API_CONTRACT } from '../test/fixtures/agenticV9ApiContract';
import type {
  CampaignMode,
  CampaignProgressEvent,
  CampaignPreflightRequest,
  EvaluationRunListItem,
  EvaluationRunObservabilityDetail,
  ExportCampaignRequest,
  ExportCampaignResponse,
  ExportClaimV2,
  ExportGraphEventV2,
  ExportLlmCallV2,
  ExportRunV2,
  ExportTraceEventV2,
  RouterAnalysisResponse,
  RouterAnalysisRow,
  V9ExecutionObservability,
} from './evaluation';

type Equal<Actual, Expected> =
  (<Value>() => Value extends Actual ? 1 : 2) extends
  (<Value>() => Value extends Expected ? 1 : 2)
    ? (<Value>() => Value extends Expected ? 1 : 2) extends
      (<Value>() => Value extends Actual ? 1 : 2)
      ? true
      : false
    : false;
type Expect<Condition extends true> = Condition;

type ExpectedRouterAnalysisRow = {
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
};

type RouterAnalysisRowMatchesBackend = Expect<
  Equal<RouterAnalysisRow, ExpectedRouterAnalysisRow>
>;
type RouterAnalysisResponseRowsMatchBackend = Expect<
  Equal<RouterAnalysisResponse['rows'][number], ExpectedRouterAnalysisRow>
>;
type CampaignProgressHasNoLatestResultId = Expect<
  'latest_result_id' extends keyof CampaignProgressEvent ? false : true
>;
type ExportResponseTopLevelMatchesV2 = Expect<
  Equal<keyof ExportCampaignResponse, 'schema_version' | 'export_metadata' | 'campaign' | 'sections' | 'runs'>
>;
type ExportRunOwnsItsResult = Expect<
  Equal<keyof ExportRunV2, 'result' | 'ragas_metrics' | 'accounting' | 'latency' | 'observability'>
>;
type ExportHasNoLegacySummary = Expect<'summary' extends keyof ExportCampaignResponse ? false : true>;
type ExportTraceHasSafeError = Expect<'error' extends keyof ExportTraceEventV2 ? true : false>;
type ExportLlmHasSafePayload = Expect<'payload' extends keyof ExportLlmCallV2 ? true : false>;
type ExportGraphHasSafeFlags = Expect<'graph_feature_flags' extends keyof ExportGraphEventV2 ? true : false>;
type ExportClaimHasSafeEvidence = Expect<'evidence' extends keyof ExportClaimV2 ? true : false>;

const activeContractTypeChecks: [
  RouterAnalysisRowMatchesBackend,
  RouterAnalysisResponseRowsMatchBackend,
  CampaignProgressHasNoLatestResultId,
  ExportResponseTopLevelMatchesV2,
  ExportRunOwnsItsResult,
  ExportHasNoLegacySummary,
  ExportTraceHasSafeError,
  ExportLlmHasSafePayload,
  ExportGraphHasSafeFlags,
  ExportClaimHasSafeEvidence,
] = [true, true, true, true, true, true, true, true, true, true];

describe('agentic v9 evaluation contract', () => {
  it('pins the backend OpenAPI hash and frontend baseline', () => {
    expect(AGENTIC_V9_API_CONTRACT.openapi_sha256).toMatch(/^[a-f0-9]{64}$/);
    expect(AGENTIC_V9_API_CONTRACT.frontend_baseline_commit).toMatch(/^[a-f0-9]{40}$/);
    expect(AGENTIC_V9_API_CONTRACT.control_plane_fields.campaign_config).toEqual([
      'agentic_execution_version',
      'shadow_evaluation_policy',
    ]);
    expect(AGENTIC_V9_API_CONTRACT.release_metrics).toMatchObject({
      path: '/api/evaluation/campaigns/{campaign_id}/release-metrics',
      response_schema: 'ReleaseMetricsReport',
    });
    expect(AGENTIC_V9_API_CONTRACT.control_plane_fields).not.toHaveProperty('campaign_status');
    expect(AGENTIC_V9_API_CONTRACT.release_metrics.required_fields).toContain('benchmark_id');
  });

  it('models the active evaluation API contract without compatibility fields', () => {
    const runListItem: EvaluationRunListItem = {
      run_id: 'run-1',
      campaign_id: 'campaign-1',
      question_id: 'Q1',
      question: 'Which route was selected?',
      mode: 'agentic-v9',
      run_number: 1,
      status: 'completed',
      total_tokens: null,
      created_at: '2026-08-13T00:00:00Z',
    };
    const progress: CampaignProgressEvent = {
      campaign_id: 'campaign-1',
      status: 'running',
      phase: 'execution',
      completed_units: 0,
      total_units: 1,
      evaluation_completed_units: 0,
      evaluation_total_units: 1,
    };
    const routerAnalysis: RouterAnalysisResponse = {
      campaign_id: 'campaign-1',
      analysis_unit: 'execution',
      sample_count: 1,
      independent_question_count: 1,
      repeat_count: 1,
      sample_note: 'one recorded routing decision',
      warnings: [],
      summaries: {},
      analysis_type: 'retrospective',
      rows: [{
        routing_decision_id: 'routing-1',
        run_id: 'run-1',
        campaign_id: 'campaign-1',
        question_id: 'Q1',
        repeat_number: 1,
        span_id: null,
        selected_mode: 'agentic-v9',
        analysis_type: 'retrospective',
        decision_source: 'llm_planner',
        candidate_routes: ['agentic-v9'],
        matched_rules: ['route-agentic-v9'],
        fallback_reason: null,
        confidence: 0.9,
        reason: 'The request requires grounded multi-step reasoning.',
        created_at: '2026-08-13T00:00:00Z',
      }],
    };

    expect(runListItem.total_tokens).toBeNull();
    expect('latest_result_id' in progress).toBe(false);
    expect(routerAnalysis.rows[0].analysis_type).toBe('retrospective');
    expect(routerAnalysis.rows[0]).not.toHaveProperty('payload');
    expect(activeContractTypeChecks).toEqual(Array(10).fill(true));
  });

  it('keeps historical v8 observability valid when v9 observability is null', () => {
    const v8Detail: EvaluationRunObservabilityDetail = {
      run_id: 'run-v8',
      campaign_id: 'campaign-v8',
      run_summary: null,
      trace_events: [],
      llm_calls: [],
      retrieval_events: [],
      retrieval_chunks: [],
      context_packs: [],
      tool_calls: [],
      routing_decisions: [],
      graph_events: [],
      graph_evidence_items: [],
      graph_observability_status: 'not_instrumented',
      claims: [],
      human_ratings: [],
      evidence_coverage: null,
      evidence_coverage_status: 'not_available',
      accounting_diagnostics: {
        input_tokens: null,
        output_text_tokens: null,
        reasoning_tokens: null,
        other_tokens: null,
        total_tokens: null,
        by_phase: {},
        observed_call_count: 0,
        measured_call_count: 0,
        missing_usage_call_count: 0,
        unbalanced_call_count: 0,
        unclassified_phase_call_count: 0,
        missing_usage_by_phase: {},
        missing_usage_by_purpose: {},
        missing_usage_by_provider: {},
        accounting_status: 'incomplete_legacy',
        phase_attribution_status: 'not_available',
        phase_attribution_reasons: [],
      },
      agentic_v9: null,
    };

    expect(v8Detail.agentic_v9).toBeNull();
  });

  it('requires the UI to send the complete Export v2 request shape', () => {
    const request: ExportCampaignRequest = {
      include_run_observability: false,
      include_raw_trace_payloads: false,
      include_prompt_previews: true,
      include_full_prompts: false,
      include_answers: true,
      include_retrieved_excerpts: true,
      format: 'json',
    };

    expect(request.include_run_observability).toBe(false);
    expect(activeContractTypeChecks).toEqual(Array(10).fill(true));
  });

  it('models a non-empty serialized canonical observability response', () => {
    const createdAt = '2026-08-12T00:00:00Z';
    const detail: EvaluationRunObservabilityDetail = {
      run_id: 'run-1',
      campaign_id: 'campaign-1',
      run_summary: {
        run_id: 'run-1', campaign_id: 'campaign-1', question_id: 'Q1', mode: 'agentic',
        repeat_number: 1, answer_preview: null, latency_ms: 0, total_tokens: 0,
        accounting_status: 'complete', created_at: createdAt,
      },
      trace_events: [{
        event_id: 'event-1', run_id: 'run-1', campaign_id: 'campaign-1', span_id: 'span-1',
        parent_event_id: null, parent_span_id: null, event_type: 'retrieval',
        event_schema_version: '1.0', sequence: 1, stage_type: 'retrieval', stage_name: 'retrieve',
        started_at: createdAt, ended_at: null, duration_ms: 0, status: 'success', retry_count: 0,
        payload: {}, error: {}, created_at: createdAt,
      }],
      llm_calls: [{
        llm_call_id: 'llm-1', run_id: 'run-1', campaign_id: 'campaign-1', span_id: null,
        provider: 'google', model_name: 'gemini', phase: 'final_answer', purpose: 'answer',
        reservation_id: null, provider_attempt: 1, prompt_tokens: 0, completion_tokens: 0,
        total_tokens: 0, reasoning_tokens: null, other_tokens: null, estimated_cost_usd: null,
        estimated_cost_twd: null, prompt_hash: null, prompt_preview: null,
        prompt_capture_status: 'redacted', full_prompt_capture_status: 'not_captured_at_execution',
        response_hash: null, latency_ms: 0, status: 'success', error: {}, payload: {}, created_at: createdAt,
      }],
      retrieval_events: [{
        retrieval_event_id: 'retrieval-1', run_id: 'run-1', campaign_id: 'campaign-1', span_id: null,
        query: null, query_hash: null, retriever_name: 'hybrid', top_k: 1, result_count: 1,
        latency_ms: 0, payload: {}, created_at: createdAt,
      }],
      retrieval_chunks: [{
        retrieval_chunk_id: 'retrieval-chunk-1', run_id: 'run-1', campaign_id: 'campaign-1',
        span_id: null, retrieval_event_id: 'retrieval-1', chunk_id: 'chunk-1', doc_id: null,
        page_start: null, page_end: null, modality: null, rank_before_rerank: null,
        rank_after_rerank: null, dense_score: null, bm25_score: null, rerank_score: null,
        used_in_context: null, used_in_answer: null, expected_evidence_match: null, excerpt: null,
        content_hash: null, provenance: 'persisted', availability: {
          status: 'not_available', reasons: ['provenance_not_recorded'],
        }, payload: {}, created_at: createdAt,
      }],
      context_packs: [{
        context_pack_id: 'pack-1', run_id: 'run-1', campaign_id: 'campaign-1', attempt_id: null,
        condition_id: '', schema_version: '1', span_id: null, input_chunk_count: 1,
        packed_chunk_count: 0, token_count: 0, retrieved_but_not_packed_evidence: [{
          evidence_id: 'evidence-1', doc_id: null, chunk_id: 'chunk-1', page: null,
        }], payload: {}, created_at: createdAt,
      }],
      tool_calls: [{
        tool_call_id: 'tool-1', run_id: 'run-1', campaign_id: 'campaign-1', span_id: null,
        tool_name: 'search', action: null, latency_ms: 0, status: 'success', payload: {}, created_at: createdAt,
      }],
      routing_decisions: [{
        routing_decision_id: 'route-1', run_id: 'run-1', campaign_id: 'campaign-1', span_id: null,
        selected_mode: 'agentic', analysis_type: 'actual', decision_source: 'llm_planner',
        candidate_routes: ['agentic'], matched_rules: [], fallback_reason: null, confidence: 0,
        reason: null, payload: {}, created_at: createdAt,
      }],
      graph_events: [{
        graph_event_id: 'graph-1', run_id: 'run-1', campaign_id: 'campaign-1', span_id: null,
        graph_query: 'query', graph_search_mode: 'local', graph_evidence_mode: 'raw_current',
        graph_route: 'local', router_reason: null, graph_feature_flags: {}, graph_snapshot_version: null,
        graph_schema_version: null, graph_extraction_prompt_version: null, matched_entity_ids: [],
        community_ids: [], node_count: 0, edge_count: 0, path_count: 0, graph_latency_ms: 0,
        graph_context_tokens: 0, graph_to_chunk_success_rate: 0, graph_noise_ratio: 0, created_at: createdAt,
      }],
      graph_evidence_items: [{
        graph_evidence_item_id: 'graph-evidence-1', graph_event_id: 'graph-1', node_ids: [], edge_ids: [],
        relation_path: [], source_doc_ids: [], source_chunk_ids: [], pages: [], asset_ids: [], confidence: 0,
        provenance_status: 'missing', used_as_locator: true, packed_in_context: false,
        used_in_answer: false, supported_claim_ids: [], created_at: createdAt,
      }],
      graph_observability_status: 'recorded',
      claims: [{
        claim_id: 'claim-1', run_id: 'run-1', campaign_id: 'campaign-1', attempt_id: null,
        condition_id: '', schema_version: '1', span_id: null, claim_text: 'Claim', claim_type: null,
        support_status: 'supported', evidence: [], unsupported_reason: null, payload: {}, created_at: createdAt,
        evidence_refs: [], repair_action: null, post_repair_status: null, extraction_status: 'recorded',
      }],
      claim_extraction_status: 'recorded',
      human_ratings: [{
        human_rating_id: 'rating-1', run_id: 'run-1', campaign_id: 'campaign-1', span_id: null,
        rater_id_hash: 'hash', rubric_version: 'v1', correctness_score: 0,
        faithfulness_score: 0, completeness_score: 0, citation_quality_score: 0,
        usefulness_score: 0, comments: null, is_blinded: true, shown_mode_label: false,
        payload: {}, created_at: createdAt,
      }],
      evidence_coverage: [{
        atomic_fact_id: 'fact-1', fact_text: 'Fact', retrieved: false, packed: false,
        mentioned: false, cited: false, status: 'missing', payload: {}, error: {},
      }],
      evidence_coverage_status: 'complete',
      accounting_diagnostics: {
        input_tokens: 0, output_text_tokens: 0, reasoning_tokens: null, other_tokens: null,
        total_tokens: 0, by_phase: {}, observed_call_count: 1, measured_call_count: 1,
        missing_usage_call_count: 0, unbalanced_call_count: 0, unclassified_phase_call_count: 0,
        missing_usage_by_phase: {}, missing_usage_by_purpose: {}, missing_usage_by_provider: {},
        accounting_status: 'complete', phase_attribution_status: 'complete', phase_attribution_reasons: [],
      },
      agentic_v9: null,
    };

    expect(detail.llm_calls[0].model_name).toBe('gemini');
    expect(detail.llm_calls[0].prompt_tokens).toBe(0);
    expect(detail.human_ratings[0].human_rating_id).toBe('rating-1');
    expect(detail.accounting_diagnostics.observed_call_count).toBe(1);
  });

  it('models typed evidence observability and preflight without a trusted user field', () => {
    const observability: V9ExecutionObservability = {
      schema_version: '1',
      contract: {
        contract_version: '2',
        route: 'bounded_compare',
        intent: 'compare models',
        required_slots: [
          { slot_id: 'S1', description: 'Model A Dice score' },
          { slot_id: 'S2', description: 'Model B Dice score' },
        ],
        synthesis_obligations: [{
          obligation_id: 'O1',
          kind: 'comparison',
          description: 'Compare the Dice scores.',
          depends_on_slot_ids: ['S1', 'S2'],
        }],
        response_constraints: [{
          constraint_id: 'C1',
          kind: 'prohibition',
          description: 'Do not generalize beyond the sources.',
        }],
        entities: ['SwinUNETR'],
        locator_hints: [],
        graph_policy: 'never',
        visual_required: false,
        evidence_extraction_required: false,
        max_retrieval_rounds: 2,
        max_repair_rounds: 1,
        max_llm_calls: 4,
        runtime_token_budget: 2048,
        resolved_source_scope: {
          requested_doc_ids: ['doc-1'],
          requested_source_names: [],
          resolved_doc_ids: ['doc-1'],
          authorized_doc_ids: ['doc-1'],
          rejected_source_names: [],
        },
        strategy_tier: null,
        comparison_plan: {
          subjects: [
            { subject_id: 'a', display_name: 'A', retrieval_query: 'A Dice score', evidence_slot_ids: ['S1'] },
            { subject_id: 'b', display_name: 'B', retrieval_query: 'B Dice score', evidence_slot_ids: ['S2'] },
          ],
        },
        slot_plan_status: 'complete',
        slot_plan_source: 'llm_planner',
        slot_plan_confidence: 'medium',
        slot_plan_fallback_reason: null,
        truncated_requirement_count: 0,
      },
      slot_resolutions: [],
      evidence_packets: [],
      sufficiency: null,
      context_pack: null,
      budget: [],
      repairs: [],
      conflicts: [],
      final_claims: [],
      metrics: {
        provider_attempt_count: 0,
        tool_operation_count: 0,
        retrieval_query_count: 0,
        final_generation_count: 0,
        subtask_answer_count: 0,
        prose_curator_call_count: 0,
        arbitration_call_count: 0,
        atomic_planner_call_count: 1,
        comparison_planner_call_count: 0,
        slot_binding_method: 'task_target_inherited',
        semantic_qualification: 'not_enabled',
        reserved_tokens: 0,
        reconciled_tokens: 0,
      },
    };
    const preflight: CampaignPreflightRequest = {
      test_case_ids: ['Q1'],
      model_config: {
        id: 'cfg-1',
        name: 'test',
        model_name: 'gemini',
        temperature: 0.7,
        top_p: 0.95,
        top_k: 40,
        max_input_tokens: 8192,
        max_output_tokens: 1024,
        thinking_mode: false,
      },
      runtime_token_budget: 2048,
      max_llm_calls: 4,
    };

    expect(observability.contract?.resolved_source_scope?.authorized_doc_ids).toEqual(['doc-1']);
    expect(preflight.test_case_ids).toEqual(['Q1']);
  });
});
