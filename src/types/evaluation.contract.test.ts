import { describe, expect, it } from 'vitest';
import { AGENTIC_V9_API_CONTRACT } from '../test/fixtures/agenticV9ApiContract';
import type {
  CampaignPreflightRequest,
  RunDetailResponse,
  V9ExecutionObservability,
} from './evaluation';

describe('agentic v9 evaluation contract', () => {
  it('pins the backend OpenAPI source and frontend baseline', () => {
    expect(AGENTIC_V9_API_CONTRACT).toEqual({
      backend_commit: 'fa064545a06bf3915eb5ac77c57a7a7b30203c17',
      openapi_sha256: '231f287c6a3ffb3075158ee735897a4ed68d42e24e3abb97fd52efb09bac5548',
      frontend_baseline_commit: '1ab15449af756886039614fab6b6cc64781d1d23',
      control_plane_fields: {
        campaign_config: ['agentic_execution_version', 'shadow_evaluation_policy'],
        campaign_result: [
          'condition_id',
          'agentic_execution_version',
          'execution_identity',
          'shadow_evaluation_policy',
          'response_status',
        ],
      },
      release_metrics: {
        path: '/api/evaluation/campaigns/{campaign_id}/release-metrics',
        response_schema: 'ReleaseMetricsReport',
        required_fields: [
          'benchmark_id',
          'benchmark_kind',
          'comparable',
          'gate_reasons',
          'category_quality_deltas',
          'per_question_quality_deltas',
        ],
      },
    });
    expect(AGENTIC_V9_API_CONTRACT.control_plane_fields).not.toHaveProperty('campaign_status');
    expect(AGENTIC_V9_API_CONTRACT.release_metrics.required_fields).toContain('benchmark_id');
  });

  it('keeps historical v8 run details valid when v9 observability is absent', () => {
    const v8Detail: RunDetailResponse = {
      run_id: 'run-v8',
      campaign_id: 'campaign-v8',
      trace_events: [],
      llm_calls: [],
      retrieval_events: [],
      retrieval_chunks: [],
      context_packs: [],
      tool_calls: [],
      routing_decisions: [],
      claims: [],
      human_ratings: [],
    };

    expect(v8Detail.agentic_v9).toBeUndefined();
  });

  it('models typed evidence observability and preflight without a trusted user field', () => {
    const observability: V9ExecutionObservability = {
      schema_version: '1',
      contract: {
        contract_version: '1',
        route: 'bounded_compare',
        intent: 'compare models',
        required_slots: [{ slot_id: 'dice', description: 'Dice score' }],
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
