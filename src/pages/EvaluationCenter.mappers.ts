import type {
  AgentBehaviorResponse,
  AblationResponse,
  CampaignErrorsResponse,
  CampaignResearchSummaryResponse,
  CampaignResultsResponse,
  CampaignStatus,
  CostLatencyResponse,
  EvaluationRunListResponse,
  ExportCampaignResponse,
  HumanEvalQueueResponse,
  HumanVsAutoResponse,
  QuestionComparisonRow,
  ResearchQuestionComparisonResponse,
  RouterAnalysisResponse,
  RunDetailResponse,
  V9ContextPack,
  V9BudgetReservation,
  V9ConflictCandidate,
  V9EvidencePacket,
  V9ExecutionMetrics,
  V9FinalClaim,
  V9QueryContract,
  V9RepairPlan,
  V9SlotResolution,
  V9SufficiencyReport,
} from '../types/evaluation';

export interface AgenticV9RunEvidence {
  runId: string;
  schemaVersion: string | null;
  queryContract: V9QueryContract | null;
  slotResolutions: V9SlotResolution[] | undefined;
  evidencePackets: V9EvidencePacket[] | undefined;
  contextPack: {
    packedEvidenceIds: string[] | undefined;
    droppedEvidenceIds: string[] | undefined;
    tokenCount: number | null | undefined;
  } | null | undefined;
  finalClaims: Array<{
    claimId: string;
    statement: string;
    supportType: V9FinalClaim['support_type'];
    evidenceIds: string[] | undefined;
    premiseEvidenceIds: string[] | undefined;
    qualifiedReason: string | null | undefined;
  }> | undefined;
  sufficiency: V9SufficiencyReport | null | undefined;
  budget: V9BudgetReservation[] | undefined;
  repairs: V9RepairPlan[] | undefined;
  conflicts: V9ConflictCandidate[] | undefined;
  metrics: V9ExecutionMetrics | undefined;
}

export interface DashboardApiData {
  campaigns: CampaignStatus[];
  researchSummary?: CampaignResearchSummaryResponse;
  results?: CampaignResultsResponse;
  runs?: EvaluationRunListResponse;
  questionComparison?: ResearchQuestionComparisonResponse;
  costLatency?: CostLatencyResponse;
  routerAnalysis?: RouterAnalysisResponse;
  ablation?: AblationResponse;
  humanVsAuto?: HumanVsAutoResponse;
  humanQueue?: HumanEvalQueueResponse;
  errors?: CampaignErrorsResponse;
  exportPreview?: ExportCampaignResponse;
  runDetail?: RunDetailResponse;
  selectedV9Evidence?: AgenticV9RunEvidence;
  agentBehavior?: AgentBehaviorResponse;
}

function mapContextPack(contextPack: V9ContextPack | null | undefined): AgenticV9RunEvidence['contextPack'] {
  if (contextPack === null) {
    return null;
  }
  if (!contextPack) {
    return undefined;
  }
  return {
    packedEvidenceIds: contextPack.packed_evidence_ids,
    droppedEvidenceIds: contextPack.dropped_evidence_ids,
    tokenCount: contextPack.token_count,
  };
}

/**
 * Projects the typed v9 payload for the currently selected run only.
 * Undefined means the historical run has no materialized v9 observability;
 * it is deliberately distinct from a materialized v9 payload with empty lists.
 */
export function mapAgenticV9RunEvidence(detail?: RunDetailResponse): AgenticV9RunEvidence | undefined {
  const v9 = detail?.agentic_v9;
  if (!detail || !v9) {
    return undefined;
  }

  return {
    runId: detail.run_id,
    schemaVersion: v9.schema_version ?? null,
    queryContract: v9.contract ?? null,
    slotResolutions: v9.slot_resolutions,
    evidencePackets: v9.evidence_packets,
    contextPack: mapContextPack(v9.context_pack),
    finalClaims: v9.final_claims?.map((claim) => ({
      claimId: claim.claim_id,
      statement: claim.statement,
      supportType: claim.support_type,
      evidenceIds: claim.evidence_ids,
      premiseEvidenceIds: claim.premise_evidence_ids,
      qualifiedReason: claim.qualified_reason,
    })),
    sufficiency: v9.sufficiency,
    budget: v9.budget,
    repairs: v9.repairs,
    conflicts: v9.conflicts,
    metrics: v9.metrics,
  };
}

export function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

export function asRows(value: unknown): Array<Record<string, unknown>> {
  return Array.isArray(value)
    ? value.filter((item): item is Record<string, unknown> => Boolean(item && typeof item === 'object'))
    : [];
}

export function numberValue(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

export function nullableNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

export function stringValue(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

export function scalarString(value: unknown, fallback: string): string {
  return typeof value === 'string' || typeof value === 'number' ? String(value) : fallback;
}

export function nullableBoolean(value: unknown, instrumented: boolean): boolean | null {
  return instrumented && typeof value === 'boolean' ? value : null;
}

export function mapQuestionRows(data: DashboardApiData) {
  return (data.questionComparison?.rows ?? []).map((row: QuestionComparisonRow) => ({
    questionId: row.question_id,
    category: row.category,
    difficulty: row.difficulty,
    requiredModalities: row.required_modalities ?? [],
    deltaCorrectness: row.delta_correctness,
    deltaFaithfulness: row.delta_faithfulness,
    deltaTokens: row.delta_tokens,
    deltaLatencyMs: row.delta_latency_ms,
    ecrCorrectness: row.ecr_correctness,
    bestMode: row.best_quality_mode,
    routerSelectedMode: 'N/A',
    evidenceCoverage: row.evidence_coverage,
    unsupportedClaimRatio: row.unsupported_claim_ratio,
    risks: row.comparability_reason ? [row.comparability_reason] : [],
    status: row.comparability_reason ?? 'complete',
    ablationFlags: [],
  }));
}

export function mapRetrieval(detail?: RunDetailResponse) {
  return {
    retrievals: (detail?.retrieval_events ?? []).map((event, index) => ({
      queryLabel: stringValue(event.retriever_name, `query ${index + 1}`),
      queryText: stringValue(event.query, stringValue(event.query_hash, 'n/a')),
    })),
    chunks: (detail?.retrieval_chunks ?? []).map((chunk, index) => {
      const hasPage = typeof chunk.page_start === 'number' || typeof chunk.page_end === 'number';
      const payload = asRecord(chunk.payload);
      const instrumented = typeof payload.instrumentation_depth === 'string';
      const pageStart = scalarString(chunk.page_start, '?');
      const pageEnd = scalarString(chunk.page_end, pageStart);
      return {
        rank: numberValue(chunk.rank_after_rerank, numberValue(chunk.rank_before_rerank, index + 1)),
        docId: stringValue(chunk.doc_id, stringValue(chunk.chunk_id, 'n/a')),
        page: hasPage ? `${pageStart}-${pageEnd}` : 'n/a',
        modality: stringValue(chunk.modality, 'text'),
        denseScore: nullableNumber(chunk.dense_score),
        bm25Score: nullableNumber(chunk.bm25_score),
        rerankScore: nullableNumber(chunk.rerank_score),
        inContext: nullableBoolean(chunk.used_in_context, instrumented),
        usedInAnswer: nullableBoolean(chunk.used_in_answer, instrumented),
        goldMatch: nullableBoolean(chunk.expected_evidence_match, instrumented),
        excerpt: stringValue(chunk.excerpt),
        instrumentationDepth: instrumented ? String(payload.instrumentation_depth) : null,
      };
    }),
    coverage: Array.isArray(detail?.evidence_coverage)
      ? detail.evidence_coverage.map((row) => ({
          atomicFactId: stringValue(row.atomic_fact_id, 'n/a'),
          factText: stringValue(row.fact_text, 'n/a'),
          retrieved: nullableBoolean(
            row.retrieved,
            detail?.evidence_coverage_status === 'complete' || detail?.evidence_coverage_status === 'partial'
          ),
          packed: nullableBoolean(
            row.packed,
            detail?.evidence_coverage_status === 'complete' || detail?.evidence_coverage_status === 'partial'
          ),
          mentioned: nullableBoolean(
            row.mentioned,
            detail?.evidence_coverage_status === 'complete' || detail?.evidence_coverage_status === 'partial'
          ),
          cited: nullableBoolean(
            row.cited,
            detail?.evidence_coverage_status === 'complete' || detail?.evidence_coverage_status === 'partial'
          ),
          status: stringValue(row.status, 'instrumented'),
        }))
      : undefined,
    coverageStatus: detail?.evidence_coverage_status ?? 'not_available',
    graph: {
      status: detail?.graph_observability_status ?? 'not_instrumented',
      events: (detail?.graph_events ?? []).map((event) => ({
        route: typeof event.graph_route === 'string' ? event.graph_route : null,
        routerReason: typeof event.router_reason === 'string' ? event.router_reason : null,
        nodeCount: nullableNumber(event.node_count),
        edgeCount: nullableNumber(event.edge_count),
        pathCount: nullableNumber(event.path_count),
        graphToChunkSuccessRate: nullableNumber(event.graph_to_chunk_success_rate),
      })),
      evidenceItems: (detail?.graph_evidence_items ?? []).map((item) => {
        const record = asRecord(item);
        return {
          source: typeof record.doc_id === 'string'
            ? record.doc_id
            : typeof record.source_id === 'string'
              ? record.source_id
              : typeof record.source === 'string'
                ? record.source
                : null,
          locator: typeof record.locator === 'string'
            ? record.locator
            : typeof record.chunk_id === 'string'
              ? record.chunk_id
              : typeof record.page_label === 'string'
                ? record.page_label
                : null,
        };
      }),
    },
  };
}

export function mapAgentRows(data: DashboardApiData) {
  return (data.agentBehavior?.rows ?? []).map((row) => ({
    runId: row.run_id,
    campaignId: row.campaign_id,
    questionId: row.question_id,
    mode: row.mode,
    repeat: row.repeat_number,
    traceStatus: row.trace_status,
    accountingStatus: row.accounting_status,
    subtasks: row.subtasks,
    toolCalls: row.tool_calls,
    visualCalls: row.visual_calls,
    graphCalls: row.graph_calls,
    drilldownDepth: row.drilldown_depth,
    correctness: row.correctness,
    faithfulness: row.faithfulness,
    unsupportedClaimRatio: row.unsupported_claim_ratio,
    supportedClaimRatio: row.supported_claim_ratio,
    tokens: row.total_tokens,
  }));
}

export function mapRouterData(data: DashboardApiData) {
  const rows = asRows(data.routerAnalysis?.rows);
  const summaries = asRecord(data.routerAnalysis?.summaries);
  if (!data.routerAnalysis && rows.length === 0) {
    return undefined;
  }
  const firstDecision = rows[0] ?? {};
  const hasActualRouterRuns = rows.some((row) => row.analysis_type === 'actual');
  return {
    analysisType: data.routerAnalysis?.analysis_type ?? 'retrospective',
    oracleLabelSource: 'utility_best_mode' as const,
    hasActualRouterRuns,
    utilityFormula: stringValue(summaries.utility_formula, 'Retrospective utility summary from recorded routing decisions.'),
    selectedDecision: {
      selectedMode: stringValue(firstDecision.selected_mode, 'n/a'),
      tier: stringValue(firstDecision.tier, 'n/a'),
      complexity: stringValue(firstDecision.complexity, 'n/a'),
      routingReason: stringValue(firstDecision.reason, 'No routing reason recorded.'),
      questionId: stringValue(firstDecision.question_id, 'n/a'),
      runId: stringValue(firstDecision.run_id, 'n/a'),
      repeat: nullableNumber(firstDecision.repeat_number),
    },
    comparisonRows: rows.map((row, index) => ({
      questionId: typeof row.question_id === 'string' ? row.question_id : null,
      runId: typeof row.run_id === 'string' ? row.run_id : null,
      repeat: nullableNumber(row.repeat_number),
      label: stringValue(row.selected_mode, `Decision ${index + 1}`),
      qualityScore: nullableNumber(row.quality_score),
      avgLatencyMs: nullableNumber(row.latency_ms),
      tokens: nullableNumber(row.total_tokens),
      regret: nullableNumber(row.regret),
      policyType: stringValue(row.analysis_type, 'retrospective'),
    })),
    savedTokens: hasActualRouterRuns ? nullableNumber(summaries.saved_tokens) : null,
    qualityLossVsAgentic: hasActualRouterRuns ? nullableNumber(summaries.quality_loss_vs_agentic) : null,
    qualityGainVsNaive: hasActualRouterRuns ? nullableNumber(summaries.quality_gain_vs_naive) : null,
    routerRegret: hasActualRouterRuns ? nullableNumber(summaries.router_regret) : null,
    confusionMatrix: [],
  };
}
