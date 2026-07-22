import { describe, expect, it } from 'vitest';
import {
  mapAgentRows,
  mapAgenticV9RunEvidence,
  mapQuestionRows,
  mapRetrieval,
  mapRouterData,
  type DashboardApiData,
} from './EvaluationCenter.mappers';

describe('Evaluation Center data mappers', () => {
  it('preserves missing question comparison metrics instead of inventing zeros', () => {
    const mapped = mapQuestionRows({
      campaigns: [],
      questionComparison: {
        campaign_id: 'cmp-1',
        analysis_unit: 'question',
        sample_count: 1,
        independent_question_count: 1,
        repeat_count: 1,
        sample_note: 'test',
        warnings: [],
        summaries: {},
        rows: [{
          question_id: 'Q-1',
          category: null,
          difficulty: null,
          required_modalities: null,
          by_mode: [],
          delta_correctness: null,
          delta_faithfulness: null,
          delta_latency_ms: null,
          delta_tokens: null,
          ecr_correctness: null,
          best_quality_mode: null,
          evidence_coverage: null,
          unsupported_claim_ratio: null,
          comparability_reason: 'comparison_mode_missing',
        }],
      },
    } as DashboardApiData);

    expect(mapped[0]).toMatchObject({
      deltaCorrectness: null,
      deltaFaithfulness: null,
      deltaTokens: null,
      bestMode: null,
      evidenceCoverage: null,
      unsupportedClaimRatio: null,
      risks: ['comparison_mode_missing'],
    });
  });

  it('keeps unknown retrieval scores and coverage uninstrumented', () => {
    const mapped = mapRetrieval({
      run_id: 'run-1',
      campaign_id: 'cmp-1',
      retrieval_events: [],
      retrieval_chunks: [{
        chunk_id: 'chunk-1',
        doc_id: 'doc-1',
        rank_after_rerank: 1,
        dense_score: null,
        bm25_score: null,
        rerank_score: null,
      }],
      context_packs: [],
      trace_events: [],
      llm_calls: [],
      tool_calls: [],
      routing_decisions: [],
      claims: [],
      human_ratings: [],
      evidence_coverage: null,
      graph_observability_status: 'not_instrumented',
      graph_events: [{ graph_route: null, router_reason: null, node_count: 0, edge_count: null, path_count: 0 }],
      graph_evidence_items: [{ doc_id: 'doc-1', chunk_id: 'chunk-1' }],
    });

    expect(mapped.chunks[0]).toMatchObject({ denseScore: null, bm25Score: null, rerankScore: null });
    expect(mapped.coverage).toBeUndefined();
    expect(mapped.graph).toMatchObject({
      status: 'not_instrumented',
      events: [{ route: null, routerReason: null, nodeCount: 0, edgeCount: null, pathCount: 0 }],
      evidenceItems: [{ source: 'doc-1', locator: 'chunk-1' }],
    });
  });

  it('does not report retrospective router summary zeros as measured actual metrics', () => {
    const mapped = mapRouterData({
      campaigns: [],
      routerAnalysis: {
        campaign_id: 'cmp-1',
        analysis_unit: 'execution',
        sample_count: 0,
        independent_question_count: 0,
        repeat_count: 0,
        sample_note: 'test',
        warnings: [],
        analysis_type: 'retrospective',
        rows: [],
        summaries: { saved_tokens: 0, quality_loss_vs_agentic: 0, router_regret: 0 },
      },
    } as DashboardApiData);

    expect(mapped?.hasActualRouterRuns).toBe(false);
    expect(mapped?.savedTokens).toBeNull();
    expect(mapped?.qualityLossVsAgentic).toBeNull();
    expect(mapped?.routerRegret).toBeNull();
  });

  it('keeps retrospective routing decisions tied to their run identity', () => {
    const mapped = mapRouterData({
      campaigns: [],
      routerAnalysis: {
        campaign_id: 'cmp-1',
        analysis_unit: 'execution',
        sample_count: 1,
        independent_question_count: 1,
        repeat_count: 1,
        sample_note: 'test',
        warnings: [],
        analysis_type: 'retrospective',
        rows: [{
          run_id: 'run-7',
          question_id: 'Q-7',
          repeat_number: 2,
          selected_mode: 'graph',
          analysis_type: 'retrospective',
        }],
        summaries: {},
      },
    } as DashboardApiData);

    expect(mapped?.comparisonRows[0]).toMatchObject({ questionId: 'Q-7', runId: 'run-7', repeat: 2 });
    expect(mapped?.selectedDecision).toMatchObject({ questionId: 'Q-7', runId: 'run-7', repeat: 2 });
  });

  it('keeps agent behavior rows distinct by run and leaves missing fields null', () => {
    const mapped = mapAgentRows({
      campaigns: [],
      agentBehavior: {
        campaign_id: 'cmp-1',
        analysis_unit: 'execution',
        sample_count: 1,
        independent_question_count: 1,
        repeat_count: 2,
        sample_note: 'test',
        warnings: [],
        summaries: {},
        rows: [{
          run_id: 'run-b',
          campaign_id: 'cmp-1',
          question_id: 'Q-1',
          mode: 'agentic',
          repeat_number: 2,
          trace_status: 'not_instrumented',
          accounting_status: 'not_available',
          subtasks: null,
          tool_calls: null,
          visual_calls: null,
          graph_calls: null,
          drilldown_depth: null,
          correctness: null,
          faithfulness: null,
          unsupported_claim_ratio: null,
          supported_claim_ratio: null,
          total_tokens: null,
        }],
      },
    } as DashboardApiData);

    expect(mapped[0]).toMatchObject({ runId: 'run-b', mode: 'agentic', repeat: 2, toolCalls: null, tokens: null });
  });

  it('maps only a materialized selected-run v9 evidence projection without fabricating token state', () => {
    const mapped = mapAgenticV9RunEvidence({
      run_id: 'run-v9',
      campaign_id: 'cmp-1',
      trace_events: [],
      llm_calls: [],
      retrieval_events: [],
      retrieval_chunks: [],
      context_packs: [],
      tool_calls: [],
      routing_decisions: [],
      claims: [],
      human_ratings: [],
      agentic_v9: {
        schema_version: '1',
        contract: {
          route: 'bounded_compare',
          intent: 'compare two models',
          required_slots: [{ slot_id: 'dice', description: 'Dice score' }],
          resolved_source_scope: { authorized_doc_ids: ['doc-a'] },
        },
        slot_resolutions: [{
          slot_id: 'dice',
          resolution_stage: 'final',
          resolution: { slot_id: 'dice', status: 'supported', evidence_ids: ['ev-1'] },
        }],
        evidence_packets: [{
          evidence_id: 'ev-1',
          packet: {
            schema_version: '1',
            evidence_id: 'ev-1',
            task_id: 'task-1',
            round_id: 'round-1',
            query_id: 'query-1',
            slot_ids: ['dice'],
            statement: 'Dice is 0.9.',
            support_type: 'direct',
            source: { doc_id: 'doc-a' },
            scope: {},
            locator: {},
          },
        }],
        context_pack: {
          packed_evidence_ids: ['ev-1'],
          dropped_evidence_ids: ['ev-2'],
          token_count: null,
        },
        final_claims: [{
          claim_id: 'claim-1',
          statement: 'Model A has Dice 0.9.',
          support_type: 'direct',
          evidence_ids: ['ev-1'],
          premise_evidence_ids: ['ev-0'],
        }],
        sufficiency: {
          evidence_complete: true,
          answerable: true,
          response_status: 'complete',
        },
        budget: [{
          reservation_id: 'reserve-1',
          phase: 'retrieval',
          estimated_input_tokens: 100,
          reserved_output_tokens: 200,
        }],
        repairs: [{ repair_round_index: 1, tasks: [] }],
        conflicts: [],
        metrics: {
          provider_attempt_count: 2,
          reserved_tokens: 200,
          reconciled_tokens: 180,
        },
      },
    });

    expect(mapped).toMatchObject({
      runId: 'run-v9',
      schemaVersion: '1',
      queryContract: { route: 'bounded_compare', required_slots: [{ slot_id: 'dice' }] },
      slotResolutions: [{ slot_id: 'dice', resolution: { evidence_ids: ['ev-1'] } }],
      evidencePackets: [{ evidence_id: 'ev-1', packet: { source: { doc_id: 'doc-a' } } }],
      contextPack: {
        packedEvidenceIds: ['ev-1'],
        droppedEvidenceIds: ['ev-2'],
        tokenCount: null,
      },
      finalClaims: [{ claimId: 'claim-1', evidenceIds: ['ev-1'], premiseEvidenceIds: ['ev-0'] }],
      sufficiency: { response_status: 'complete' },
      budget: [{ reservation_id: 'reserve-1' }],
      repairs: [{ repair_round_index: 1 }],
      conflicts: [],
      metrics: { provider_attempt_count: 2, reconciled_tokens: 180 },
    });
  });

  it('keeps historical v8 details unavailable instead of presenting empty v9 evidence', () => {
    const mapped = mapAgenticV9RunEvidence({
      run_id: 'run-v8',
      campaign_id: 'cmp-1',
      trace_events: [],
      llm_calls: [],
      retrieval_events: [],
      retrieval_chunks: [],
      context_packs: [],
      tool_calls: [],
      routing_decisions: [],
      claims: [],
      human_ratings: [],
      agentic_v9: null,
    });

    expect(mapped).toBeUndefined();
  });
});
