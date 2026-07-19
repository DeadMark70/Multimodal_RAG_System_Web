import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Box,
  Button,
  Flex,
  HStack,
  Select,
  Spinner,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Text,
  useDisclosure,
} from '@chakra-ui/react';
import Layout from '../components/layout/Layout';
import PageHeader from '../components/common/PageHeader';
import {
  getAblationAnalysis,
  getCampaignErrors,
  getCampaignResearchSummary,
  getAgentBehavior,
  getHumanEvalQueue,
  getHumanVsAuto,
  getResearchQuestionComparison,
  getRouterAnalysis,
  getCampaignRuns,
  getRunDetail,
  listCampaigns,
} from '../services/evaluationApi';
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
} from '../types/evaluation';

const EvaluationSetupDrawer = lazy(() => import('../components/evaluation/EvaluationSetupDrawer'));
const CampaignOverviewTab = lazy(() => import('../components/evaluation/CampaignOverviewTab'));
const QuestionAnalysisTab = lazy(() => import('../components/evaluation/QuestionAnalysisTab'));
const RunTraceTab = lazy(() => import('../components/evaluation/RunTraceTab'));
const RetrievalEvidenceTab = lazy(() => import('../components/evaluation/RetrievalEvidenceTab'));
const AgentBehaviorTab = lazy(() => import('../components/evaluation/AgentBehaviorTab'));
const ClaimEvidenceTab = lazy(() => import('../components/evaluation/ClaimEvidenceTab'));
const RouterLabTab = lazy(() => import('../components/evaluation/RouterLabTab'));
const AblationDashboardTab = lazy(() => import('../components/evaluation/AblationDashboardTab'));

interface DashboardApiData {
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
  agentBehavior?: AgentBehaviorResponse;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function asRows(value: unknown): Array<Record<string, unknown>> {
  return Array.isArray(value)
    ? value.filter((item): item is Record<string, unknown> => Boolean(item && typeof item === 'object'))
    : [];
}

function numberValue(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function nullableNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function stringValue(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function scalarString(value: unknown, fallback: string): string {
  return typeof value === 'string' || typeof value === 'number' ? String(value) : fallback;
}

function mapQuestionRows(data: DashboardApiData) {
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

function mapRunOptions(runs?: EvaluationRunListResponse) {
  return (runs?.runs ?? []).map((run) => ({
    runId: run.run_id,
    campaignId: run.campaign_id,
    questionId: run.question_id,
    mode: run.mode,
    repeat: run.repeat_number ?? run.run_number,
  }));
}

function mapTraceEvents(detail?: RunDetailResponse) {
  return (detail?.trace_events ?? []).map((event) => ({
    eventId: stringValue(event.event_id, stringValue(event.span_id, scalarString(event.sequence, 'event'))),
    sequence: numberValue(event.sequence),
    stageName: stringValue(event.stage_name, 'unknown'),
    status: stringValue(event.status, 'unknown'),
    startedAt: stringValue(event.started_at),
    durationMs: typeof event.duration_ms === 'number' ? event.duration_ms : undefined,
    payload: asRecord(event.payload),
    error: asRecord(event.error),
  }));
}

function mapRetrieval(detail?: RunDetailResponse) {
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
        rank: numberValue(chunk.rank_after_rerank, numberValue(chunk.rank_before_rerank, index + 1)),
        docId: stringValue(chunk.doc_id, stringValue(chunk.chunk_id, 'n/a')),
        page: hasPage ? `${pageStart}-${pageEnd}` : 'n/a',
        modality: stringValue(chunk.modality, 'text'),
        denseScore: nullableNumber(chunk.dense_score),
        bm25Score: nullableNumber(chunk.bm25_score),
        rerankScore: nullableNumber(chunk.rerank_score),
        inContext: Boolean(chunk.used_in_context),
        usedInAnswer: Boolean(chunk.used_in_answer),
        goldMatch: Boolean(chunk.expected_evidence_match),
        excerpt: stringValue(chunk.excerpt),
      };
    }),
    coverage: Array.isArray(detail?.evidence_coverage)
      ? detail.evidence_coverage.map((row) => ({
          atomicFactId: stringValue(row.atomic_fact_id, 'n/a'),
          factText: stringValue(row.fact_text, 'n/a'),
          retrieved: Boolean(row.retrieved),
          packed: Boolean(row.packed),
          mentioned: Boolean(row.mentioned),
          cited: Boolean(row.cited),
          status: stringValue(row.status, 'instrumented'),
        }))
      : undefined,
  };
}

function mapAgentRows(data: DashboardApiData) {
  return (data.agentBehavior?.rows ?? []).map((row) => ({
    runId: row.run_id,
    campaignId: row.campaign_id,
    questionId: row.question_id,
    mode: row.mode,
    repeat: row.repeat_number,
    traceStatus: row.trace_status,
    subtasks: row.subtasks,
    toolCalls: row.tool_calls,
    visualCalls: row.visual_calls,
    graphCalls: row.graph_calls,
    drilldownDepth: row.drilldown_depth,
    correctness: row.correctness,
    faithfulness: row.faithfulness,
    tokens: row.total_tokens,
  }));
}

function mapClaims(detail?: RunDetailResponse) {
  const claims = (detail?.claims ?? []).map((claim) => ({
    claim: stringValue(claim.claim_text, 'n/a'),
    type: stringValue(claim.claim_type, 'claim'),
    status: stringValue(claim.support_status, 'unknown'),
    evidence: Array.isArray(claim.evidence) ? claim.evidence.map((item) => JSON.stringify(item)) : [],
    repairAction: stringValue(asRecord(claim.payload).repair_action, 'none'),
    postRepairStatus: stringValue(asRecord(claim.payload).post_repair_status, stringValue(claim.support_status, 'unknown')),
  }));
  return {
    claims,
    unsupportedReasons: claims.filter((claim) => claim.status !== 'supported').map((claim) => claim.claim),
  };
}

function mapRouterData(data: DashboardApiData) {
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
    },
    comparisonRows: rows.map((row, index) => ({
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

export default function EvaluationCenter() {
  const setupDrawer = useDisclosure();
  const [selectedCampaignId, setSelectedCampaignId] = useState('');
  const [dashboardData, setDashboardData] = useState<DashboardApiData>({ campaigns: [] });
  const [loadingDashboard, setLoadingDashboard] = useState(true);
  const [loadingTab, setLoadingTab] = useState(false);
  const [activeTabIndex, setActiveTabIndex] = useState(0);
  const [selectedRunId, setSelectedRunId] = useState('');
  const [dashboardError, setDashboardError] = useState<string | null>(null);
  const loadedTabsRef = useRef(new Set<string>());
  const requestGenerationRef = useRef(0);
  const runDetailRequestRef = useRef(0);

  useEffect(() => {
    let mounted = true;

    const loadCampaigns = async () => {
      setLoadingDashboard(true);
      try {
        const campaigns = await listCampaigns();
        if (!mounted) {
          return;
        }
        setDashboardData({ campaigns });
        setSelectedCampaignId((current) => current || campaigns[0]?.id || '');
        setDashboardError(null);
      } catch (error) {
        if (mounted) {
          setDashboardError(error instanceof Error ? error.message : 'Failed to load evaluation campaigns');
        }
      } finally {
        if (mounted) {
          setLoadingDashboard(false);
        }
      }
    };

    void loadCampaigns();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!selectedCampaignId) {
      return;
    }

    let mounted = true;
    const generation = requestGenerationRef.current + 1;
    requestGenerationRef.current = generation;
    runDetailRequestRef.current += 1;
    loadedTabsRef.current = new Set();
    setActiveTabIndex(0);
    setSelectedRunId('');
    setDashboardData((current) => ({ campaigns: current.campaigns }));
    const loadDashboard = async () => {
      setLoadingDashboard(true);
      try {
        const researchSummary = await getCampaignResearchSummary(selectedCampaignId);
        if (!mounted) {
          return;
        }
        setDashboardData((current) => ({ ...current, researchSummary }));
        setDashboardError(null);
        setLoadingDashboard(false);
      } catch (error) {
        if (mounted) {
          setDashboardError(error instanceof Error ? error.message : 'Failed to load evaluation analytics');
          setLoadingDashboard(false);
        }
      }
    };

    void loadDashboard();
    return () => {
      mounted = false;
    };
  }, [selectedCampaignId]);

  const loadTabData = useCallback(async (tabIndex: number, campaignId: string, preferredRunId?: string) => {
    switch (tabIndex) {
      case 0:
        return { errors: await getCampaignErrors(campaignId) };
      case 1:
        return { questionComparison: await getResearchQuestionComparison(campaignId) };
      case 2:
      case 3:
      case 5: {
        const runs = await getCampaignRuns(campaignId);
        const effectiveRunId =
          (preferredRunId && runs.runs.some((run) => run.run_id === preferredRunId)
            ? preferredRunId
            : runs.runs[0]?.run_id) ?? '';
        const runDetail = effectiveRunId ? await getRunDetail(campaignId, effectiveRunId) : undefined;
        return { runs, runDetail };
      }
      case 4:
        return { agentBehavior: await getAgentBehavior(campaignId) };
      case 6:
        return { routerAnalysis: await getRouterAnalysis(campaignId) };
      case 7: {
        const [ablation, humanVsAuto, humanQueue, errors] = await Promise.all([
          getAblationAnalysis(campaignId),
          getHumanVsAuto(campaignId),
          getHumanEvalQueue(campaignId),
          getCampaignErrors(campaignId),
        ]);
        return { ablation, humanVsAuto, humanQueue, errors };
      }
      default:
        return {};
    }
  }, []);

  useEffect(() => {
    if (!selectedCampaignId || !dashboardData.researchSummary) {
      return;
    }
    const tabKey = `${selectedCampaignId}:${activeTabIndex}`;
    if (loadedTabsRef.current.has(tabKey)) {
      return;
    }

    let mounted = true;
    const generation = requestGenerationRef.current;
    setLoadingTab(true);
    void loadTabData(activeTabIndex, selectedCampaignId, selectedRunId)
      .then((partialData) => {
        if (!mounted || generation !== requestGenerationRef.current) {
          return;
        }
        setDashboardData((current) => ({ ...current, ...partialData }));
        if ('runs' in partialData && partialData.runs?.runs.length) {
          setSelectedRunId((current) =>
            current && partialData.runs?.runs.some((run) => run.run_id === current)
              ? current
              : partialData.runs?.runs[0]?.run_id || ''
          );
        }
        loadedTabsRef.current.add(tabKey);
      })
      .catch((error) => {
        if (mounted && generation === requestGenerationRef.current) {
          setDashboardError(error instanceof Error ? error.message : 'Failed to load evaluation tab');
        }
      })
      .finally(() => {
        if (mounted && generation === requestGenerationRef.current) {
          setLoadingTab(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, [activeTabIndex, dashboardData.researchSummary, loadTabData, selectedCampaignId, selectedRunId]);

  const handleSelectedRunIdChange = useCallback(
    (runId: string) => {
      if (!selectedCampaignId || !runId || runId === selectedRunId) {
        return;
      }
      setSelectedRunId(runId);
      const requestId = runDetailRequestRef.current + 1;
      const campaignGeneration = requestGenerationRef.current;
      runDetailRequestRef.current = requestId;
      void getRunDetail(selectedCampaignId, runId)
        .then((runDetail) => {
          if (
            requestId === runDetailRequestRef.current &&
            campaignGeneration === requestGenerationRef.current
          ) {
            setDashboardData((current) => ({ ...current, runDetail }));
          }
        })
        .catch((error) => {
          if (
            requestId === runDetailRequestRef.current &&
            campaignGeneration === requestGenerationRef.current
          ) {
            setDashboardError(error instanceof Error ? error.message : 'Failed to load selected run');
          }
        });
    },
    [selectedCampaignId, selectedRunId]
  );

  const selectedCampaign = useMemo(
    () => dashboardData.campaigns.find((campaign) => campaign.id === selectedCampaignId) ?? null,
    [dashboardData.campaigns, selectedCampaignId]
  );
  const runOptions = mapRunOptions(dashboardData.runs);
  const selectedRun = runOptions.find((run) => run.runId === selectedRunId) ?? runOptions[0];
  const retrievalData = mapRetrieval(dashboardData.runDetail);
  const claimData = mapClaims(dashboardData.runDetail);
  const dashboardTabs = [
    { label: 'Campaign Overview', component: <CampaignOverviewTab data={dashboardData.researchSummary} /> },
    { label: 'Question Analysis', component: <QuestionAnalysisTab rows={mapQuestionRows(dashboardData)} /> },
    {
      label: 'Run Trace',
      component: (
        <RunTraceTab
          runOptions={runOptions}
          selectedRunId={selectedRun?.runId}
          onSelectedRunIdChange={handleSelectedRunIdChange}
          metadata={{
            questionId: selectedRun?.questionId ?? '',
            mode: selectedRun?.mode ?? '',
            repeat: selectedRun?.repeat ?? 1,
            finalAnswerPreview: dashboardData.runDetail?.run_summary?.answer_preview ?? undefined,
            totalTokens: dashboardData.runDetail?.run_summary?.total_tokens,
            accountingStatus: dashboardData.runDetail?.run_summary?.accounting_status,
          }}
          traceEvents={mapTraceEvents(dashboardData.runDetail)}
        />
      ),
    },
    {
      label: 'Retrieval Evidence',
      component: (
        <RetrievalEvidenceTab
          retrievals={retrievalData.retrievals}
          chunks={retrievalData.chunks}
          coverage={retrievalData.coverage}
        />
      ),
    },
    { label: 'Agent Behavior', component: <AgentBehaviorTab rows={mapAgentRows(dashboardData)} /> },
    {
      label: 'Claim Evidence',
      component: <ClaimEvidenceTab claims={claimData.claims} unsupportedReasons={claimData.unsupportedReasons} />,
    },
    { label: 'Router Lab', component: <RouterLabTab data={mapRouterData(dashboardData)} /> },
    {
      label: 'Ablation',
      component: (
        <AblationDashboardTab
          data={{
            ablation: dashboardData.ablation,
            humanVsAuto: dashboardData.humanVsAuto,
            humanQueue: dashboardData.humanQueue,
            errors: dashboardData.errors,
            exportPreview: dashboardData.exportPreview,
          }}
        />
      ),
    },
  ] as const;

  return (
    <Layout>
      <Flex direction="column" flex={1} minH={0} overflow="hidden">
        <HStack flexShrink={0} align="flex-start" justify="space-between" gap={4}>
          <PageHeader
            title="評估中心"
            subtitle={
              selectedCampaign
                ? `${selectedCampaign.name || selectedCampaign.id} · ${selectedCampaign.status}`
                : '題庫管理與模型參數設定'
            }
            variant="dashboard"
          />
          <HStack mt={3} flexShrink={0} spacing={3}>
            <Select
              size="sm"
              minW="220px"
              value={selectedCampaignId}
              onChange={(event) => setSelectedCampaignId(event.target.value)}
              aria-label="Campaign selector"
            >
              {dashboardData.campaigns.map((campaign) => (
                <option key={campaign.id} value={campaign.id}>
                  {campaign.name || campaign.id}
                </option>
              ))}
            </Select>
            <Button flexShrink={0} onClick={setupDrawer.onOpen}>
              Setup evaluation
            </Button>
          </HStack>
        </HStack>

        <Box
          flex={1}
          minH={0}
          overflowY="auto"
          pr={{ base: 1, md: 2 }}
          pb={2}
          data-testid="evaluation-scroll-region"
        >
          {loadingDashboard ? (
            <HStack py={3} color="text.secondary">
              <Spinner size="sm" />
              <Text>Loading evaluation analytics...</Text>
            </HStack>
          ) : null}
          {!loadingDashboard && loadingTab ? (
            <HStack py={2} color="text.secondary">
              <Spinner size="sm" />
              <Text>Loading selected analytics...</Text>
            </HStack>
          ) : null}
          {dashboardError ? (
            <Text py={2} color="red.500">
              {dashboardError}
            </Text>
          ) : null}
          <Suspense fallback={<Text py={4}>Loading evaluation view...</Text>}>
            <Tabs
              variant="enclosed"
              isLazy
              index={activeTabIndex}
              onChange={setActiveTabIndex}
            >
              <TabList overflowX="auto" overflowY="hidden" pb={1}>
                {dashboardTabs.map((tab) => (
                  <Tab key={tab.label} whiteSpace="nowrap">
                    {tab.label}
                  </Tab>
                ))}
              </TabList>

              <TabPanels>
                {dashboardTabs.map((tab) => (
                  <TabPanel key={tab.label} px={0} pt={4}>
                    {tab.component}
                  </TabPanel>
                ))}
              </TabPanels>
            </Tabs>
          </Suspense>
        </Box>
      </Flex>
      <Suspense fallback={null}>
        <EvaluationSetupDrawer isOpen={setupDrawer.isOpen} onClose={setupDrawer.onClose} />
      </Suspense>
    </Layout>
  );
}
