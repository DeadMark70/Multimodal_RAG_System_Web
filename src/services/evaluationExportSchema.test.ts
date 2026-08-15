import { describe, expect, it } from "vitest";
import { parseExportCampaignResponse } from "./evaluationExportSchema";

const createdAt = "2026-08-13T00:00:00Z";

function availability(status = "complete") {
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
    accounting_status: "complete",
    phase_attribution_status: "complete",
    phase_attribution_reasons: [],
  };
}

function aggregate() {
  return {
    campaign_id: "cmp-1",
    analysis_unit: "execution",
    sample_count: 1,
    independent_question_count: 1,
    repeat_count: 1,
    sample_note: "one execution sample",
    warnings: [],
    rows: [],
    summaries: {
      human_rating_count: 0,
      paired_sample_count: 0,
      human_correctness_mean: null,
      human_faithfulness_mean: null,
      ragas_human_pearson_r: null,
      ragas_human_spearman_r: null,
      inter_rater_agreement: null,
    },
  };
}

function ablationWithoutConditionComparison() {
  return {
    campaign_id: "cmp-1",
    analysis_unit: "execution",
    sample_count: 1,
    independent_question_count: 1,
    repeat_count: 1,
    sample_note: "one execution sample",
    warnings: [],
    rows: [],
    summaries: {
      condition_counts: { baseline: 1 },
      condition_labels: { baseline: "Baseline" },
      conditions_by_ablation_family: { retrieval: { baseline: 1 } },
      graph_metrics_by_ablation_family: { retrieval: { graph_to_chunk_success_rate: null } },
    },
  };
}

function researchSummary() {
  return {
    campaign_id: "cmp-1",
    research_schema_version: "2",
    completed_run_count: 1,
    total_run_count: 1,
    failed_run_count: 0,
    quality_status: "complete",
    token_accounting_status: "complete",
    pricing_status: "complete",
    phase_attribution_status: "complete",
    sample_count: 1,
    quality: {},
    latency: {
      mean_ms: 12,
      p50_ms: 12,
      p95_ms: 12,
      sample_count: 1,
      method: "nearest_rank",
      low_sample_size: true,
    },
    tokens: tokenBreakdown(),
    execution_cost: {
      benchmark_usd: 0,
      operational_usd: 0,
      pricing_status: "complete",
      priced_call_count: 1,
      unpriced_call_count: 0,
    },
    modes: [],
    evaluation_overhead: {
      tokens: tokenBreakdown(),
      cost_usd: 0,
      pricing_status: "complete",
      evaluator_models: [],
      metric_names: [],
      batch_count: 0,
      retry_count: 0,
    },
    warnings: [],
  };
}

function comparison() {
  return {
    planner_status: "planned",
    planner_latency_ms: 1,
    planner_fallback_reason: null,
    fallback_stage: null,
    validation_issues: [],
    is_comparison: true,
    subjects: [],
    dimensions: [],
    task_diagnostics: [],
    coverage_before_repair: [],
    missing_before_repair: [],
    repair_executed: false,
    coverage_after_repair: [],
    missing_after_repair: [],
    final_status: "complete",
    final_evidence_subjects: [],
    final_evidence_count: 0,
    final_evidence: [],
  };
}

function notApplicableRelease() {
  const metric = { value: null, reason: "benchmark_not_configured" };
  return {
    benchmark_id: "",
    benchmark_kind: "not_applicable",
    comparable: false,
    availability: "not_applicable",
    not_applicable_reason: "benchmark_not_configured",
    gate_reasons: ["benchmark_not_configured"],
    manifest: {},
    arms: [],
    required_slot_coverage: metric,
    important_unsupported_claim_rate: metric,
    provenance_failure_rate: metric,
    pack_efficiency: metric,
    graph_locator_success: metric,
    graph_locator_fallback: metric,
    final_generation_count: metric,
    latency_p95_ms: metric,
    token_ratio: metric,
    paired_quality_delta: metric,
    paired_quality_ci_lower: metric,
    paired_quality_ci_upper: metric,
    category_quality_deltas: {},
    per_question_quality_deltas: {},
    statistics: {},
  };
}

function validExportV2() {
  return {
    schema_version: "2.0",
    export_metadata: {
      exported_at: createdAt,
      options: {
        include_run_observability: true,
        include_raw_trace_payloads: false,
        include_prompt_previews: true,
        include_full_prompts: false,
        include_answers: false,
        include_retrieved_excerpts: false,
        format: "json",
      },
      redaction: {
        provider_errors: "excluded",
        stack_traces: "excluded",
        credentials: "redacted",
      },
      availability_warnings: ["redacted fixture warning"],
    },
    campaign: {
      id: "cmp-1",
      name: "Redacted export fixture",
      status: "completed",
      benchmark_id: "benchmark-1",
      modes: ["agentic-v9"],
      repeat_count: 1,
      created_at: createdAt,
      updated_at: createdAt,
    },
    sections: {
      overview: { availability: availability("not_available"), data: null },
      question_analysis: {
        availability: availability("not_available"),
        data: null,
      },
      agent_behavior: {
        availability: availability("not_available"),
        data: null,
      },
      router_analysis: {
        availability: availability("not_available"),
        data: null,
      },
      ablation: { availability: availability("not_available"), data: null },
      human_evaluation: {
        availability: availability(),
        data: {
          comparison: aggregate(),
          queue: {
            campaign_id: "cmp-1",
            rows: [
              {
                run_id: "run-1",
                campaign_id: "cmp-1",
                question_id: "Q1",
                question: "redacted question",
                mode: "agentic-v9",
                run_number: 1,
                repeat_number: 1,
                answer_preview: null,
                existing_rating_count: 0,
                already_rated_by_current_user: false,
              },
            ],
          },
        },
      },
      diagnostics: {
        availability: availability(),
        data: {
          errors: { campaign_id: "cmp-1", rows: [] },
          stage_warnings: { campaign_id: "cmp-1", rows: [] },
        },
      },
    },
    runs: [
      {
        result: {
          run_id: "run-1",
          campaign_id: "cmp-1",
          question_id: "Q1",
          question: "redacted question",
          mode: "agentic-v9",
          run_number: 1,
          repeat_number: 1,
          condition_id: "guided",
          execution_profile: "evaluation_v9",
          context_policy_version: "context-v1",
          agentic_execution_version: "v9",
          execution_identity: "identity-v1",
          response_status: "complete",
          status: "completed",
          answer: null,
          ground_truth: null,
          ground_truth_short: null,
          contexts: null,
          source_doc_ids: ["doc-1"],
          latency_ms: 12,
          total_latency_ms: 15,
          total_tokens: 10,
          created_at: createdAt,
        },
        ragas_metrics: { faithfulness: 0.9 },
        accounting: tokenBreakdown(),
        latency: {
          latency_ms: 12,
          total_latency_ms: 15,
          started_at: createdAt,
          completed_at: createdAt,
        },
        observability: {
          included: true,
          availability: availability(),
          data: {
            run_id: "run-1",
            campaign_id: "cmp-1",
            run_summary: {
              run_id: "run-1",
              campaign_id: "cmp-1",
              question_id: "Q1",
              mode: "agentic-v9",
              repeat_number: 1,
              answer_preview: null,
              latency_ms: 12,
              total_tokens: 10,
              accounting_status: "complete",
              created_at: createdAt,
            },
            accounting_diagnostics: tokenBreakdown(),
            trace_events: [],
            llm_calls: [],
            retrieval_events: [],
            retrieval_chunks: [],
            context_packs: [],
            tool_calls: [],
            routing_decisions: [],
            graph_events: [],
            graph_evidence_items: [],
            graph_observability_status: "recorded",
            claims: [],
            claim_extraction_status: "empty",
            human_ratings: [],
            evidence_coverage: null,
            evidence_coverage_status: "not_available",
            agentic_v9: {
              schema_version: "1",
              contract: {
                contract_version: "2",
                route: "bounded_compare",
                intent: "Compare A and B",
                required_slots: [
                  {
                    slot_id: "S1",
                    description: "Report A's value.",
                    required: true,
                    entity_ids: ["a"],
                    locator_hints: [],
                    source_name_hints: [],
                    authorized_source_doc_ids: ["doc-1"],
                    expected_answer_type: "number",
                    depends_on_slot_ids: [],
                    visual_policy: "never",
                  },
                  {
                    slot_id: "S2",
                    description: "Report B's value.",
                    required: true,
                    entity_ids: ["b"],
                    locator_hints: [],
                    source_name_hints: [],
                    authorized_source_doc_ids: ["doc-1"],
                    expected_answer_type: "number",
                    depends_on_slot_ids: [],
                    visual_policy: "never",
                  },
                ],
                synthesis_obligations: [{
                  obligation_id: "O1",
                  kind: "comparison",
                  description: "Compare the reported values.",
                  depends_on_slot_ids: ["S1", "S2"],
                }],
                response_constraints: [{
                  constraint_id: "C1",
                  kind: "prohibition",
                  description: "Do not claim a universal ranking.",
                }],
                entities: ["a", "b"],
                locator_hints: [],
                graph_policy: "never",
                visual_requested: false,
                visual_required: false,
                evidence_extraction_required: false,
                max_retrieval_rounds: 1,
                max_repair_rounds: 1,
                max_llm_calls: 3,
                runtime_token_budget: 2048,
                resolved_source_scope: {
                  requested_doc_ids: ["doc-1"],
                  requested_source_names: [],
                  resolved_doc_ids: ["doc-1"],
                  authorized_doc_ids: ["doc-1"],
                  source_name_to_doc_ids: {},
                  rejected_source_names: [],
                },
                strategy_tier: null,
                route_decision: {
                  selected_route: "bounded_compare",
                  decision_source: "deterministic",
                  matched_rules: ["comparison"],
                  candidate_routes: ["bounded_compare"],
                  route_reason: "Comparison question.",
                  planner_call_used: false,
                  fallback_reason: null,
                  confidence: 1,
                },
                comparison_plan: {
                  subjects: [
                    {
                      subject_id: "a",
                      display_name: "A",
                      aliases: [],
                      retrieval_query: "A value",
                      evidence_slot_ids: ["S1"],
                    },
                    {
                      subject_id: "b",
                      display_name: "B",
                      aliases: [],
                      retrieval_query: "B value",
                      evidence_slot_ids: ["S2"],
                    },
                  ],
                  dimensions: ["reported value"],
                  qualification: null,
                },
                slot_plan_status: "complete",
                slot_plan_source: "llm_planner",
                slot_plan_confidence: "medium",
                slot_plan_fallback_reason: null,
                truncated_requirement_count: 0,
                slot_semantics: "heuristic_experimental",
                atomic_completeness: null,
                atomic_completeness_reason: "atomic_slot_matching_experimental",
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
                slot_binding_method: "task_target_inherited",
                semantic_qualification: "not_enabled",
                reserved_tokens: 0,
                reconciled_tokens: 0,
                candidate_packet_count: 0,
                qualified_packet_count: 0,
                qualification_round_count: 0,
                qualification_provider_call_count: 0,
                qualification_failure_code: null as string | null,
              },
              planner_diagnostics: {
                outcome: "planned",
                failure_stage: null,
                failure_code: null,
                provider_response_received: true,
                retrieval_query_strategy: "atomic_slots",
                compiled_retrieval_task_count: 2,
              },
              comparison: {
                planner_status: "planned",
                planner_latency_ms: 1.5,
                planner_fallback_reason: null,
                fallback_stage: null,
                validation_issues: [],
                is_comparison: true,
                subjects: [{
                  subject_id: "a",
                  display_name: "A",
                  aliases: [],
                  evidence_slot_ids: ["S1"],
                }],
                dimensions: ["reported value"],
                task_diagnostics: [],
                coverage_before_repair: ["a"],
                missing_before_repair: [],
                repair_executed: false,
                coverage_after_repair: ["a"],
                missing_after_repair: [],
                final_status: "complete",
                final_evidence_subjects: ["a"],
                final_evidence_count: 1,
                final_evidence: [{
                  evidence_id: "evidence-1",
                  doc_id: "doc-1",
                  chunk_id: "chunk-1",
                  subject_ids: ["a"],
                }],
              },
            },
          },
        },
      },
    ],
  };
}

describe("Export Schema v2 runtime decoder", () => {
  it("parses a fully populated non-empty redacted v2 response", () => {
    const parsed = parseExportCampaignResponse(validExportV2());
    expect(parsed.schema_version).toBe("2.0");
    expect(parsed.runs[0].result.answer).toBeNull();
    expect(parsed.sections.human_evaluation.data?.queue.rows).toHaveLength(1);
    expect(parsed.runs[0].observability.data?.agentic_v9?.schema_version).toBe("1");
    expect(parsed.runs[0].observability.data?.agentic_v9?.contract?.synthesis_obligations).toHaveLength(1);
    expect(parsed.runs[0].observability.data?.agentic_v9?.contract?.comparison_plan?.subjects[0].evidence_slot_ids).toEqual(["S1"]);
    expect(parsed.runs[0].observability.data?.agentic_v9?.metrics.atomic_planner_call_count).toBe(1);
    expect(parsed.runs[0].observability.data?.agentic_v9?.metrics.candidate_packet_count).toBe(0);
    expect(parsed.runs[0].observability.data?.agentic_v9?.metrics.qualified_packet_count).toBe(0);
    expect(parsed.runs[0].observability.data?.agentic_v9?.metrics.qualification_round_count).toBe(0);
    expect(parsed.runs[0].observability.data?.agentic_v9?.metrics.qualification_provider_call_count).toBe(0);
    expect(parsed.runs[0].observability.data?.agentic_v9?.metrics.qualification_failure_code).toBeNull();
    expect(parsed.runs[0].observability.data?.agentic_v9?.planner_diagnostics?.outcome).toBe("planned");
    expect(parsed.runs[0].observability.data?.agentic_v9?.comparison?.subjects[0].evidence_slot_ids).toEqual(["S1"]);
  });

  it("accepts an explicitly unavailable planner diagnostic", () => {
    const value = validExportV2();
    (value.runs[0].observability.data.agentic_v9 as unknown as { planner_diagnostics: unknown })
      .planner_diagnostics = null;

    expect(
      parseExportCampaignResponse(value).runs[0].observability.data?.agentic_v9?.planner_diagnostics,
    ).toBeNull();
  });

  it("rejects full observability when the required planner diagnostic field is omitted", () => {
    const value = validExportV2();
    delete (value.runs[0].observability.data.agentic_v9 as { planner_diagnostics?: unknown })
      .planner_diagnostics;

    expect(() => parseExportCampaignResponse(value)).toThrow("Invalid export response.");
  });

  it.each([
    ["unknown outcome", { outcome: "unknown" }],
    ["unknown failure stage", { failure_stage: "transport" }],
    ["negative task count", { compiled_retrieval_task_count: -1 }],
  ])("rejects planner diagnostics with %s", (_label, override) => {
    const value = validExportV2();
    Object.assign(value.runs[0].observability.data.agentic_v9.planner_diagnostics, override);

    expect(() => parseExportCampaignResponse(value)).toThrow("Invalid export response.");
  });

  it("accepts the backend prose curator call-count limit in full observability", () => {
    const value = validExportV2();
    value.runs[0].observability.data.agentic_v9.comparison = null as never;
    value.runs[0].observability.data.agentic_v9.metrics.prose_curator_call_count = 3;

    expect(
      parseExportCampaignResponse(value).runs[0].observability.data?.agentic_v9?.metrics.prose_curator_call_count,
    ).toBe(3);
  });

  it("accepts full observability with populated qualification metrics and failure code", () => {
    const value = validExportV2();
    Object.assign(value.runs[0].observability.data.agentic_v9.metrics, {
      candidate_packet_count: 5,
      qualified_packet_count: 3,
      qualification_round_count: 2,
      qualification_provider_call_count: 2,
      qualification_failure_code: "qualification_insufficient",
    });

    const parsed = parseExportCampaignResponse(value);
    const metrics = parsed.runs[0].observability.data?.agentic_v9?.metrics;

    expect(metrics?.candidate_packet_count).toBe(5);
    expect(metrics?.qualified_packet_count).toBe(3);
    expect(metrics?.qualification_round_count).toBe(2);
    expect(metrics?.qualification_provider_call_count).toBe(2);
    expect(metrics?.qualification_failure_code).toBe("qualification_insufficient");
  });

  it("accepts agent behavior metrics with populated qualification fields", () => {
    const value = validExportV2();
    value.sections.agent_behavior = {
      availability: availability(),
      data: {
        campaign_id: "cmp-1",
        analysis_unit: "execution",
        sample_count: 1,
        independent_question_count: 1,
        repeat_count: 1,
        sample_note: "one sample",
        warnings: [],
        behavior_schema_version: "2",
        rows: [
          {
            run_id: "run-1",
            campaign_id: "cmp-1",
            question_id: "Q1",
            mode: "agentic-v9",
            repeat_number: 1,
            behavior_schema: "v9",
            trace_status: "completed",
            failure_reason: null,
            accounting_status: "complete",
            subtasks: null,
            tool_calls: null,
            visual_calls: null,
            graph_calls: null,
            drilldown_depth: null,
            correctness: 1.0,
            faithfulness: 1.0,
            unsupported_claim_ratio: 0.0,
            supported_claim_ratio: 1.0,
            total_tokens: 10,
            legacy: null,
            v9: {
              route: "bounded_compare",
              contract_version: "2",
              slot_plan_status: "complete",
              slot_semantics: "heuristic_experimental",
              atomic_completeness: null,
              atomic_completeness_reason: null,
              graph_policy: "never",
              visual_requested: false,
              visual_required: false,
              evidence_extraction_required: false,
              retrieval_query_count: 1,
              provider_attempt_count: 1,
              final_generation_count: 1,
              evidence_packet_count: 2,
              packed_evidence_count: 2,
              slot_resolution_count: 2,
              required_slot_count: 2,
              supported_slot_count: 2,
              repair_count: 0,
              final_claim_count: 1,
              reserved_tokens: 0,
              reconciled_tokens: 0,
              candidate_packet_count: 4,
              qualified_packet_count: 2,
              qualification_round_count: 1,
              qualification_provider_call_count: 1,
              qualification_failure_code: "qualification_insufficient",
              graph_execution: "not_requested",
              visual_execution: "not_requested",
            },
          },
        ],
        summaries: {},
      },
    } as never;

    const parsed = parseExportCampaignResponse(value);
    const behaviorV9 = parsed.sections.agent_behavior.data?.rows[0].v9;
    expect(behaviorV9?.candidate_packet_count).toBe(4);
    expect(behaviorV9?.qualified_packet_count).toBe(2);
    expect(behaviorV9?.qualification_round_count).toBe(1);
    expect(behaviorV9?.qualification_provider_call_count).toBe(1);
    expect(behaviorV9?.qualification_failure_code).toBe("qualification_insufficient");
  });

  it("accepts a non-comparison contract when the backend omits comparison_plan", () => {
    const value = validExportV2();
    const contract = value.runs[0].observability.data.agentic_v9.contract as {
      comparison_plan?: unknown;
    };
    delete contract.comparison_plan;

    const parsed = parseExportCampaignResponse(value);

    expect(parsed.runs[0].observability.data?.agentic_v9?.contract?.comparison_plan).toBeUndefined();
  });

  it("accepts a repair retrieval task when the backend omits subject_id", () => {
    const value = validExportV2();
    const repairs = [
      {
        repair_round_index: 1,
        tasks: [
          {
            task_id: "repair-task-1",
            round_id: "repair-round-1",
            query_id: "repair-query-1",
            query: "Find direct evidence for S1",
            target_slot_ids: ["S1"],
            source_scope: {
              requested_doc_ids: ["doc-1"],
              requested_source_names: [],
              resolved_doc_ids: ["doc-1"],
              authorized_doc_ids: ["doc-1"],
              source_name_to_doc_ids: {},
              rejected_source_names: [],
            },
            source_group_id: "source-group-1",
            locator_hints: [],
            graph_policy: "never",
            visual_required: false,
            depends_on_task_ids: [],
          },
        ],
        resulting_evidence_ids: [],
        stop_reason: "repair_budget_exhausted",
      },
    ];
    (value.runs[0].observability.data.agentic_v9 as unknown as { repairs: typeof repairs }).repairs = repairs;

    const parsed = parseExportCampaignResponse(value);
    const task = parsed.runs.at(0)?.observability?.data?.agentic_v9?.repairs?.at(0)?.tasks?.at(0);

    expect(task).toBeDefined();
    expect(task?.subject_id).toBeUndefined();
  });

  it("accepts the exact no-benchmark release shape with strict empty objects", () => {
    const value = validExportV2();
    value.sections.overview = {
      availability: availability(),
      data: {
        research_summary: researchSummary(),
        release_metrics: {
          availability: availability("not_applicable"),
          data: notApplicableRelease(),
        },
      },
    } as never;

    const parsed = parseExportCampaignResponse(value);

    expect(parsed.sections.overview.data?.release_metrics.data?.manifest).toEqual({});
    expect(parsed.sections.overview.data?.release_metrics.data?.statistics).toEqual({});
  });

  it("accepts populated ablation data when unavailable condition comparison is omitted", () => {
    const value = validExportV2();
    value.sections.ablation = {
      availability: availability(),
      data: ablationWithoutConditionComparison(),
    } as never;

    const parsed = parseExportCampaignResponse(value);

    expect(parsed.sections.ablation.data?.summaries).not.toHaveProperty("condition_comparison");
  });

  it("rejects a wrong nested no-benchmark release shape", () => {
    const value = validExportV2();
    const release = notApplicableRelease();
    release.manifest = { unexpected: true } as never;
    value.sections.overview = {
      availability: availability(),
      data: {
        research_summary: researchSummary(),
        release_metrics: {
          availability: availability("not_applicable"),
          data: release,
        },
      },
    } as never;

    expect(() => parseExportCampaignResponse(value)).toThrow("Invalid export response.");
  });

  it("rejects observability marked included when its data is null", () => {
    const value = validExportV2();
    (value.runs[0].observability as { data: unknown }).data = null;

    expect(() => parseExportCampaignResponse(value)).toThrow("Invalid export response.");
  });

  it("accepts only explicit empty safe fields added by the backend projection", () => {
    const value = validExportV2();
    value.runs[0].observability.data.trace_events = [
      {
        event_id: "event-1",
        run_id: "run-1",
        campaign_id: "cmp-1",
        span_id: "span-1",
        parent_event_id: null,
        parent_span_id: null,
        event_type: "generation",
        event_schema_version: "1.0",
        sequence: 1,
        stage_type: "generation",
        stage_name: "final_answer",
        started_at: createdAt,
        ended_at: createdAt,
        duration_ms: 1,
        status: "success",
        retry_count: 0,
        payload: {},
        error: {},
        created_at: createdAt,
      },
    ] as never;

    expect(parseExportCampaignResponse(value).runs[0].observability.data?.trace_events).toHaveLength(1);
    const trace = value.runs[0].observability.data.trace_events[0] as unknown as {
      error: unknown;
    };
    trace.error = { message: "must reject" };
    expect(() => parseExportCampaignResponse(value)).toThrow("Invalid export response.");
  });

  it.each([
    [
      "missing diagnostics section",
      (value: ReturnType<typeof validExportV2>) => {
        delete (value.sections as Partial<typeof value.sections>).diagnostics;
      },
    ],
    [
      "wrong schema version",
      (value: ReturnType<typeof validExportV2>) => {
        value.schema_version = "1.0";
      },
    ],
    [
      "legacy response",
      (value: ReturnType<typeof validExportV2>) => {
        Object.assign(value, { redaction: {}, llm_calls: [], summary: {} });
        delete (value as Partial<typeof value>).export_metadata;
      },
    ],
    [
      "arbitrary run result",
      (value: ReturnType<typeof validExportV2>) => {
        value.runs[0].result = { arbitrary: "answer-text-sentinel" } as never;
      },
    ],
    [
      "missing nullable v9 wrapper",
      (value: ReturnType<typeof validExportV2>) => {
        delete (value.runs[0].observability.data as { agentic_v9?: unknown }).agentic_v9;
      },
    ],
    [
      "nullable human queue wrapper",
      (value: ReturnType<typeof validExportV2>) => {
        value.sections.human_evaluation.data.queue = null as never;
      },
    ],
    [
      "missing accounting field",
      (value: ReturnType<typeof validExportV2>) => {
        delete (value.runs[0].accounting as Partial<ReturnType<typeof tokenBreakdown>>).observed_call_count;
      },
    ],
    [
      "missing nested overview field",
      (value: ReturnType<typeof validExportV2>) => {
        const overview = {
          availability: availability(),
          data: {
            research_summary: researchSummary(),
            release_metrics: {
              availability: availability("not_available"),
              data: null,
            },
          },
        };
        delete (overview.data.research_summary as Partial<ReturnType<typeof researchSummary>>).completed_run_count;
        value.sections.overview = overview as never;
      },
    ],
    [
      "missing nested release availability field",
      (value: ReturnType<typeof validExportV2>) => {
        const overview = {
          availability: availability(),
          data: {
            research_summary: researchSummary(),
            release_metrics: {
              availability: availability("not_available"),
              data: null,
            },
          },
        };
        delete (overview.data.release_metrics.availability as { reasons?: string[] }).reasons;
        value.sections.overview = overview as never;
      },
    ],
    [
      "arbitrary question analysis property",
      (value: ReturnType<typeof validExportV2>) => {
        value.sections.question_analysis = {
          availability: availability(),
          data: { ...aggregate(), summaries: {}, unexpected: true },
        } as never;
      },
    ],
    [
      "arbitrary diagnostics row property",
      (value: ReturnType<typeof validExportV2>) => {
        value.sections.diagnostics.data.errors.rows = [
          {
            run_id: "run-1",
            campaign_id: "cmp-1",
            stage_name: "retrieval",
            code: null,
            message: "sanitized",
            source: "run",
            created_at: createdAt,
            unexpected: true,
          },
        ] as never;
      },
    ],
    [
      "missing v9 comparison field",
      (value: ReturnType<typeof validExportV2>) => {
        const invalidComparison: Partial<ReturnType<typeof comparison>> = comparison();
        delete invalidComparison.planner_status;
        value.runs[0].observability.data.agentic_v9.comparison = invalidComparison as never;
      },
    ],
    [
      "unknown synthesis obligation kind",
      (value: ReturnType<typeof validExportV2>) => {
        value.runs[0].observability.data.agentic_v9.contract.synthesis_obligations[0].kind = "unknown" as never;
      },
    ],
    [
      "unknown response constraint kind",
      (value: ReturnType<typeof validExportV2>) => {
        value.runs[0].observability.data.agentic_v9.contract.response_constraints[0].kind = "unknown" as never;
      },
    ],
    [
      "atomic planner count above one",
      (value: ReturnType<typeof validExportV2>) => {
        value.runs[0].observability.data.agentic_v9.metrics.atomic_planner_call_count = 2;
      },
    ],
    [
      "independent comparison planner call",
      (value: ReturnType<typeof validExportV2>) => {
        value.runs[0].observability.data.agentic_v9.metrics.comparison_planner_call_count = 1;
      },
    ],
    [
      "unsupported semantic qualification",
      (value: ReturnType<typeof validExportV2>) => {
        value.runs[0].observability.data.agentic_v9.metrics.semantic_qualification = "enabled" as never;
      },
    ],
    [
      "negative candidate packet count",
      (value: ReturnType<typeof validExportV2>) => {
        value.runs[0].observability.data.agentic_v9.metrics.candidate_packet_count = -1;
      },
    ],
    [
      "negative qualified packet count",
      (value: ReturnType<typeof validExportV2>) => {
        value.runs[0].observability.data.agentic_v9.metrics.qualified_packet_count = -1;
      },
    ],
    [
      "negative qualification round count",
      (value: ReturnType<typeof validExportV2>) => {
        value.runs[0].observability.data.agentic_v9.metrics.qualification_round_count = -1;
      },
    ],
    [
      "negative qualification provider call count",
      (value: ReturnType<typeof validExportV2>) => {
        value.runs[0].observability.data.agentic_v9.metrics.qualification_provider_call_count = -1;
      },
    ],
    [
      "qualification failure code exceeds max length",
      (value: ReturnType<typeof validExportV2>) => {
        value.runs[0].observability.data.agentic_v9.metrics.qualification_failure_code = "a".repeat(97);
      },
    ],
    [
      "omitted candidate packet count",
      (value: ReturnType<typeof validExportV2>) => {
        delete (value.runs[0].observability.data.agentic_v9.metrics as { candidate_packet_count?: unknown })
          .candidate_packet_count;
      },
    ],
    [
      "omitted qualified packet count",
      (value: ReturnType<typeof validExportV2>) => {
        delete (value.runs[0].observability.data.agentic_v9.metrics as { qualified_packet_count?: unknown })
          .qualified_packet_count;
      },
    ],
    [
      "omitted qualification round count",
      (value: ReturnType<typeof validExportV2>) => {
        delete (value.runs[0].observability.data.agentic_v9.metrics as { qualification_round_count?: unknown })
          .qualification_round_count;
      },
    ],
    [
      "omitted qualification provider call count",
      (value: ReturnType<typeof validExportV2>) => {
        delete (value.runs[0].observability.data.agentic_v9.metrics as { qualification_provider_call_count?: unknown })
          .qualification_provider_call_count;
      },
    ],
    [
      "omitted qualification failure code",
      (value: ReturnType<typeof validExportV2>) => {
        delete (value.runs[0].observability.data.agentic_v9.metrics as { qualification_failure_code?: unknown })
          .qualification_failure_code;
      },
    ],
  ])("rejects %s", (_name, mutate) => {
    const value = validExportV2();
    mutate(value);
    expect(() => parseExportCampaignResponse(value)).toThrow("Invalid export response.");
  });

  it("sanitizes validation errors without echoing server payload content", () => {
    const value = validExportV2();
    value.runs[0].result.question = "prompt-text-sentinel";
    value.runs[0].result.run_number = -1;

    expect(() => parseExportCampaignResponse(value)).toThrow("Invalid export response.");
    try {
      parseExportCampaignResponse(value);
    } catch (error) {
      expect(String(error)).toContain("runs.0.result.run_number (too_small)");
      expect(String(error)).not.toContain("prompt-text-sentinel");
      expect(String(error)).not.toContain("answer-text-sentinel");
    }
  });
});
