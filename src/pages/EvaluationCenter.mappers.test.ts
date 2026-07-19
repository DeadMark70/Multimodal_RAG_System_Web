import { describe, expect, it } from 'vitest';
import { mapAgentRows, mapQuestionRows, mapRetrieval, mapRouterData, type DashboardApiData } from './EvaluationCenter';

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
    });

    expect(mapped.chunks[0]).toMatchObject({ denseScore: null, bm25Score: null, rerankScore: null });
    expect(mapped.coverage).toBeUndefined();
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
});
