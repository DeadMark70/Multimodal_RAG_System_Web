import { describe, expect, it } from 'vitest';
import { parseExportCampaignResponse } from './evaluationExportSchema';

const createdAt = '2026-08-13T00:00:00Z';

function availability(status = 'complete') {
  return { status, reasons: [] };
}

function tokenBreakdown() {
  return {
    input_tokens: 3,
    output_text_tokens: 5,
    reasoning_tokens: 2,
    other_tokens: 0,
    total_tokens: 10,
    by_phase: { final_generation: 10 },
    observed_call_count: 1,
    measured_call_count: 1,
    missing_usage_call_count: 0,
    unbalanced_call_count: 0,
    unclassified_phase_call_count: 0,
    missing_usage_by_phase: {},
    missing_usage_by_purpose: {},
    missing_usage_by_provider: {},
    accounting_status: 'complete',
    phase_attribution_status: 'complete',
    phase_attribution_reasons: [],
  };
}

function aggregate() {
  return {
    campaign_id: 'cmp-1',
    analysis_unit: 'execution',
    sample_count: 1,
    independent_question_count: 1,
    repeat_count: 1,
    sample_note: 'one execution sample',
    warnings: [],
    rows: [],
    summaries: {},
  };
}

function validExportV2() {
  return {
    schema_version: '2.0',
    export_metadata: {
      exported_at: createdAt,
      options: {
        include_run_observability: true,
        include_raw_trace_payloads: false,
        include_prompt_previews: true,
        include_full_prompts: false,
        include_answers: false,
        include_retrieved_excerpts: false,
        format: 'json',
      },
      redaction: {
        provider_errors: 'excluded',
        stack_traces: 'excluded',
        credentials: 'redacted',
      },
      availability_warnings: ['redacted fixture warning'],
    },
    campaign: {
      id: 'cmp-1',
      name: 'Redacted export fixture',
      status: 'completed',
      benchmark_id: 'benchmark-1',
      modes: ['agentic-v9'],
      repeat_count: 1,
      created_at: createdAt,
      updated_at: createdAt,
    },
    sections: {
      overview: { availability: availability('not_available'), data: null },
      question_analysis: { availability: availability('not_available'), data: null },
      agent_behavior: { availability: availability('not_available'), data: null },
      router_analysis: { availability: availability('not_available'), data: null },
      ablation: { availability: availability('not_available'), data: null },
      human_evaluation: {
        availability: availability(),
        data: {
          comparison: aggregate(),
          queue: {
            campaign_id: 'cmp-1',
            rows: [{
              run_id: 'run-1', campaign_id: 'cmp-1', question_id: 'Q1',
              question: 'redacted question', mode: 'agentic-v9', run_number: 1,
              repeat_number: 1, answer_preview: null, existing_rating_count: 0,
              already_rated_by_current_user: false,
            }],
          },
        },
      },
      diagnostics: {
        availability: availability(),
        data: {
          errors: { campaign_id: 'cmp-1', rows: [] },
          stage_warnings: { campaign_id: 'cmp-1', rows: [] },
        },
      },
    },
    runs: [{
      result: {
        run_id: 'run-1', campaign_id: 'cmp-1', question_id: 'Q1',
        question: 'redacted question', mode: 'agentic-v9', run_number: 1,
        repeat_number: 1, condition_id: 'guided', execution_profile: 'evaluation_v9',
        context_policy_version: 'context-v1', agentic_execution_version: 'v9',
        execution_identity: 'identity-v1', response_status: 'complete', status: 'completed',
        answer: null, ground_truth: null, ground_truth_short: null, contexts: null,
        source_doc_ids: ['doc-1'], latency_ms: 12, total_latency_ms: 15,
        total_tokens: 10, created_at: createdAt,
      },
      ragas_metrics: { faithfulness: 0.9 },
      accounting: tokenBreakdown(),
      latency: { latency_ms: 12, total_latency_ms: 15, started_at: createdAt, completed_at: createdAt },
      observability: {
        included: true,
        availability: availability(),
        data: {
          run_id: 'run-1', campaign_id: 'cmp-1',
          run_summary: {
            run_id: 'run-1', campaign_id: 'cmp-1', question_id: 'Q1', mode: 'agentic-v9',
            repeat_number: 1, answer_preview: null, latency_ms: 12, total_tokens: 10,
            accounting_status: 'complete', created_at: createdAt,
          },
          accounting_diagnostics: tokenBreakdown(),
          trace_events: [], llm_calls: [], retrieval_events: [], retrieval_chunks: [],
          context_packs: [], tool_calls: [], routing_decisions: [], graph_events: [],
          graph_evidence_items: [], graph_observability_status: 'recorded', claims: [],
          claim_extraction_status: 'empty', human_ratings: [], evidence_coverage: null,
          evidence_coverage_status: 'not_available',
          agentic_v9: {
            schema_version: '1', contract: null, slot_resolutions: [], evidence_packets: [],
            sufficiency: null, context_pack: null, budget: [], repairs: [], conflicts: [],
            final_claims: [], metrics: {}, comparison: null,
          },
        },
      },
    }],
  };
}

describe('Export Schema v2 runtime decoder', () => {
  it('parses a fully populated non-empty redacted v2 response', () => {
    const parsed = parseExportCampaignResponse(validExportV2());
    expect(parsed.schema_version).toBe('2.0');
    expect(parsed.runs[0].result.answer).toBeNull();
    expect(parsed.sections.human_evaluation.data?.queue.rows).toHaveLength(1);
    expect(parsed.runs[0].observability.data?.agentic_v9?.schema_version).toBe('1');
  });

  it.each([
    ['missing diagnostics section', (value: ReturnType<typeof validExportV2>) => { delete (value.sections as Partial<typeof value.sections>).diagnostics; }],
    ['wrong schema version', (value: ReturnType<typeof validExportV2>) => { value.schema_version = '1.0'; }],
    ['legacy response', (value: ReturnType<typeof validExportV2>) => {
      Object.assign(value, { redaction: {}, llm_calls: [], summary: {} });
      delete (value as Partial<typeof value>).export_metadata;
    }],
    ['arbitrary run result', (value: ReturnType<typeof validExportV2>) => {
      value.runs[0].result = { arbitrary: 'answer-text-sentinel' } as never;
    }],
    ['missing nullable v9 wrapper', (value: ReturnType<typeof validExportV2>) => {
      delete (value.runs[0].observability.data as { agentic_v9?: unknown }).agentic_v9;
    }],
    ['nullable human queue wrapper', (value: ReturnType<typeof validExportV2>) => {
      value.sections.human_evaluation.data.queue = null as never;
    }],
  ])('rejects %s', (_name, mutate) => {
    const value = validExportV2();
    mutate(value);
    expect(() => parseExportCampaignResponse(value)).toThrow('Invalid export response.');
  });

  it('sanitizes validation errors without echoing server payload content', () => {
    const value = validExportV2();
    value.runs[0].result.question = 'prompt-text-sentinel';
    value.runs[0].result.run_number = -1;

    expect(() => parseExportCampaignResponse(value)).toThrow('Invalid export response.');
    try {
      parseExportCampaignResponse(value);
    } catch (error) {
      expect(String(error)).not.toContain('prompt-text-sentinel');
      expect(String(error)).not.toContain('answer-text-sentinel');
    }
  });
});
