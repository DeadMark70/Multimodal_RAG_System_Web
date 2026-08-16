import type {
  AgentBehaviorResponse,
  AblationResponse,
  CampaignErrorsResponse,
  CampaignStageWarningsResponse,
  CampaignResearchSummaryResponse,
  ReleaseMetricsReport,
  CampaignResultsResponse,
  CampaignStatus,
  CostLatencyResponse,
  EvaluationRunListResponse,
  HumanEvalQueueResponse,
  HumanVsAutoResponse,
  EvaluationClaim,
  QuestionComparisonRow,
  ResearchQuestionComparisonResponse,
  RouterAnalysisResponse,
  EvaluationRunObservabilityDetail,
  V9ContextPack,
  V9BudgetReservation,
  V9ConflictCandidate,
  V9EvidencePacket,
  V9ExecutionMetrics,
  V9FinalClaim,
  V9QueryContract,
  V9PromptCaptureAvailability,
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
    /** The authoritative persisted claim → slot relation; undefined for historical payloads. */
    slotId?: string | null;
    obligationId?: string | null;
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
  /** Omitted by historical v9 payloads; consumers must render it N/A-safe. */
  promptCapture?: {
    hashAvailability: string | null | undefined;
    previewAvailability: string | null | undefined;
    fullPromptAvailability: string | null | undefined;
  } | null | undefined;
}

export interface DashboardApiData {
  campaigns: CampaignStatus[];
  researchSummary?: CampaignResearchSummaryResponse;
  releaseMetrics?: ReleaseMetricsReport;
  results?: CampaignResultsResponse;
  runs?: EvaluationRunListResponse;
  questionComparison?: ResearchQuestionComparisonResponse;
  costLatency?: CostLatencyResponse;
  routerAnalysis?: RouterAnalysisResponse;
  ablation?: AblationResponse;
  humanVsAuto?: HumanVsAutoResponse;
  humanQueue?: HumanEvalQueueResponse;
  errors?: CampaignErrorsResponse;
  stageWarnings?: CampaignStageWarningsResponse;
  runDetail?: EvaluationRunObservabilityDetail;
  selectedV9Evidence?: AgenticV9RunEvidence;
  agentBehavior?: AgentBehaviorResponse;
}

type RetrievalObservabilityProjection = Partial<EvaluationRunObservabilityDetail>;
type AgenticV9ObservabilityProjection = Pick<EvaluationRunObservabilityDetail, 'run_id' | 'agentic_v9'>
  & Partial<Omit<EvaluationRunObservabilityDetail, 'run_id' | 'agentic_v9'>>;

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
export function mapAgenticV9RunEvidence(
  detail?: AgenticV9ObservabilityProjection,
): AgenticV9RunEvidence | undefined {
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
      slotId: claim.slot_id,
      obligationId: claim.obligation_id,
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
    promptCapture: mapPromptCapture(v9.prompt_capture),
  };
}

function mapPromptCapture(capture: V9PromptCaptureAvailability | null | undefined): AgenticV9RunEvidence['promptCapture'] {
  if (capture === null) return null;
  if (!capture) return undefined;
  return {
    hashAvailability: promptCaptureAvailability(capture.hash),
    previewAvailability: promptCaptureAvailability(capture.preview),
    // Never project raw full-prompt text into frontend evidence. A non-status
    // persisted value means capture occurred, not that UI may disclose it.
    fullPromptAvailability: promptCaptureAvailability(capture.full_prompt),
  };
}

function promptCaptureAvailability(value: string | null | undefined): string | null | undefined {
  if (value == null) return value;
  if (['captured', 'not_captured_at_execution', 'not_available', 'redacted'].includes(value)) {
    return value;
  }
  return 'captured';
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

export function nullableBoolean(value: unknown, available = true): boolean | null {
  return available && typeof value === 'boolean' ? value : null;
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

function numberArray(value: unknown): number[] {
  return Array.isArray(value)
    ? value.filter((item): item is number => typeof item === 'number' && Number.isFinite(item))
    : [];
}

function safeClaimReferenceText(reference: NonNullable<EvaluationClaim['evidence_refs']>[number]): string | null {
  if (typeof reference.chunk_id === 'string') return reference.chunk_id;
  if (typeof reference.evidence_id === 'string') return reference.evidence_id;
  if (typeof reference.doc_id === 'string') return reference.doc_id;
  return typeof reference.page === 'number' ? `p. ${reference.page}` : null;
}

export function mapClaims(
  detail?: Pick<EvaluationRunObservabilityDetail, 'claims' | 'claim_extraction_status'>,
) {
  const claims = (detail?.claims ?? []).map((claim) => ({
    claim: typeof claim.claim_text === 'string' ? claim.claim_text : null,
    type: typeof claim.claim_type === 'string' ? claim.claim_type : null,
    status: typeof claim.support_status === 'string' ? claim.support_status : null,
    evidence: (claim.evidence_refs ?? [])
      .map(safeClaimReferenceText)
      .filter((reference): reference is string => reference !== null),
    repairAction: typeof claim.repair_action === 'string' ? claim.repair_action : null,
    postRepairStatus: typeof claim.post_repair_status === 'string' ? claim.post_repair_status : null,
    extractionStatus: claim.extraction_status ?? null,
  }));

  return {
    claims,
    extractionStatus: detail?.claim_extraction_status ?? 'not_instrumented',
    unsupportedReasons: claims
      .filter((claim) => claim.status !== null && claim.status !== 'supported' && claim.claim !== null)
      .flatMap((claim) => claim.claim === null ? [] : [claim.claim]),
  };
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
    evidenceCoverage: row.evidence_coverage,
    unsupportedClaimRatio: row.unsupported_claim_ratio,
    risks: row.comparability_reason ? [row.comparability_reason] : [],
    status: row.comparability_reason ?? 'complete',
  }));
}

export function mapRetrieval(detail?: RetrievalObservabilityProjection) {
  return {
    retrievals: (detail?.retrieval_events ?? []).map((event, index) => ({
      queryLabel: stringValue(event.retriever_name, `query ${index + 1}`),
      queryText: stringValue(event.query, stringValue(event.query_hash, 'n/a')),
    })),
    chunks: (detail?.retrieval_chunks ?? []).map((chunk, index) => {
      const hasPage = typeof chunk.page_start === 'number' || typeof chunk.page_end === 'number';
      const pageStart = scalarString(chunk.page_start, '?');
      const pageEnd = scalarString(chunk.page_end, pageStart);
      return {
        retrievalChunkId: chunk.retrieval_chunk_id,
        rank: numberValue(chunk.rank_after_rerank, numberValue(chunk.rank_before_rerank, index + 1)),
        docId: stringValue(chunk.doc_id, stringValue(chunk.chunk_id, 'n/a')),
        page: hasPage ? `${pageStart}-${pageEnd}` : 'n/a',
        modality: stringValue(chunk.modality, 'N/A'),
        denseScore: nullableNumber(chunk.dense_score),
        bm25Score: nullableNumber(chunk.bm25_score),
        rerankScore: nullableNumber(chunk.rerank_score),
        inContext: nullableBoolean(chunk.used_in_context),
        usedInAnswer: nullableBoolean(chunk.used_in_answer),
        goldMatch: nullableBoolean(chunk.expected_evidence_match),
        excerpt: stringValue(chunk.excerpt),
        provenance: chunk.provenance ?? null,
        availabilityStatus: chunk.availability?.status ?? null,
        availabilityReasons: chunk.availability?.reasons ?? null,
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
    graphEvidence: (detail?.graph_evidence_items ?? []).map((row) => ({
      sourceDocIds: stringArray(row.source_doc_ids),
      sourceChunkIds: stringArray(row.source_chunk_ids),
      pages: numberArray(row.pages),
      assetIds: stringArray(row.asset_ids),
    })),
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
      evidenceItems: (detail?.graph_evidence_items ?? []).map((item) => ({
        source: stringArray(item.source_doc_ids)[0] ?? null,
        locator: stringArray(item.source_chunk_ids)[0] ?? null,
      })),
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
    behaviorSchema: row.behavior_schema ?? null,
    failureReason: row.failure_reason ?? null,
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
    legacy: row.legacy ?? null,
    v9: row.v9 ? {
      route: row.v9.route,
      contractVersion: row.v9.contract_version ?? null,
      slotPlanStatus: row.v9.slot_plan_status ?? null,
      slotSemantics: row.v9.slot_semantics ?? null,
      graphExecution: row.v9.graph_execution,
      visualExecution: row.v9.visual_execution,
      evidencePacketCount: row.v9.evidence_packet_count,
      supportedSlotCount: row.v9.supported_slot_count,
      requiredSlotCount: row.v9.required_slot_count,
    } : null,
  }));
}

export function mapRouterData(data: DashboardApiData) {
  if (!data.routerAnalysis) {
    return undefined;
  }
  return {
    analysisType: data.routerAnalysis.analysis_type,
    decisions: data.routerAnalysis.rows.map((row) => ({
      routingDecisionId: row.routing_decision_id,
      runId: row.run_id,
      campaignId: row.campaign_id,
      questionId: row.question_id,
      repeat: row.repeat_number,
      spanId: row.span_id ?? null,
      selectedMode: row.selected_mode,
      decisionSource: row.decision_source,
      candidateRoutes: row.candidate_routes,
      matchedRules: row.matched_rules,
      fallbackReason: row.fallback_reason,
      confidence: row.confidence,
      reason: row.reason,
      createdAt: row.created_at,
    })),
  };
}
