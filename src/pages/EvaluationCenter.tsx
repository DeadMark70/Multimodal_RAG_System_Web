import { useEffect, useMemo, useState } from 'react';
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
import EvaluationSetupDrawer from '../components/evaluation/EvaluationSetupDrawer';
import CampaignOverviewTab from '../components/evaluation/CampaignOverviewTab';
import QuestionAnalysisTab from '../components/evaluation/QuestionAnalysisTab';
import RunTraceTab from '../components/evaluation/RunTraceTab';
import RetrievalEvidenceTab from '../components/evaluation/RetrievalEvidenceTab';
import AgentBehaviorTab from '../components/evaluation/AgentBehaviorTab';
import ClaimEvidenceTab from '../components/evaluation/ClaimEvidenceTab';
import RouterLabTab from '../components/evaluation/RouterLabTab';
import AblationDashboardTab from '../components/evaluation/AblationDashboardTab';
import {
  getAblationAnalysis,
  getCampaignErrors,
  getCampaignOverview,
  getCampaignResults,
  getCampaignRuns,
  getCostLatency,
  getHumanEvalQueue,
  getHumanVsAuto,
  getModeComparison,
  getQuestionComparison,
  getRouterAnalysis,
  getRunDetail,
  listCampaigns,
} from '../services/evaluationApi';
import type {
  AblationResponse,
  CampaignErrorsResponse,
  CampaignOverviewResponse,
  CampaignResultsResponse,
  CampaignStatus,
  CostLatencyResponse,
  EvaluationRunListResponse,
  ExportCampaignResponse,
  HumanEvalQueueResponse,
  HumanVsAutoResponse,
  ModeComparisonResponse,
  QuestionComparisonResponse,
  RouterAnalysisResponse,
  RunDetailResponse,
} from '../types/evaluation';

interface DashboardApiData {
  campaigns: CampaignStatus[];
  overview?: CampaignOverviewResponse;
  results?: CampaignResultsResponse;
  runs?: EvaluationRunListResponse;
  modeComparison?: ModeComparisonResponse;
  questionComparison?: QuestionComparisonResponse;
  costLatency?: CostLatencyResponse;
  routerAnalysis?: RouterAnalysisResponse;
  ablation?: AblationResponse;
  humanVsAuto?: HumanVsAutoResponse;
  humanQueue?: HumanEvalQueueResponse;
  errors?: CampaignErrorsResponse;
  exportPreview?: ExportCampaignResponse;
  runDetail?: RunDetailResponse;
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

function stringValue(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function scalarString(value: unknown, fallback: string): string {
  return typeof value === 'string' || typeof value === 'number' ? String(value) : fallback;
}

function modeLabel(mode: string): string {
  return mode.charAt(0).toUpperCase() + mode.slice(1);
}

function mapOverviewData(data: DashboardApiData) {
  const overview = data.overview;
  if (!overview) {
    return undefined;
  }
  const modeSummaries = asRecord(data.modeComparison?.summaries);
  const totalRuns = Math.max(overview.sample_count, 1);
  const modes = Object.entries(modeSummaries).map(([mode, raw]) => {
    const summary = asRecord(raw);
    const unsupportedRatio = numberValue(summary.unsupported_claim_ratio_mean);
    return {
      mode: modeLabel(mode),
      correctness: Math.max(0, 1 - unsupportedRatio),
      faithfulness: Math.max(0, 1 - unsupportedRatio),
      relevancy: numberValue(summary.evidence_coverage_mean),
      runs: numberValue(summary.sample_count),
      avgLatencyMs: numberValue(summary.latency_ms_mean),
    };
  });
  return {
    summary: {
      completedRuns: overview.sample_count,
      totalRuns,
      avgCorrectness: modes.length ? modes.reduce((sum, row) => sum + row.correctness, 0) / modes.length : 0,
      avgFaithfulness: modes.length ? modes.reduce((sum, row) => sum + row.faithfulness, 0) / modes.length : 0,
      avgRelevancy: modes.length ? modes.reduce((sum, row) => sum + row.relevancy, 0) / modes.length : 0,
      avgTokens: overview.sample_count ? overview.total_tokens / overview.sample_count : 0,
      avgCostUsd: overview.total_cost_usd ?? 0,
      avgLatencyMs: overview.avg_latency_ms ?? 0,
      errorRate: data.errors?.rows?.length ? data.errors.rows.length / totalRuns : 0,
    },
    modes,
    costQuality: modes.map((row) => ({
      mode: row.mode,
      correctness: row.correctness,
      faithfulness: row.faithfulness,
      costUsd: overview.sample_count ? (overview.total_cost_usd ?? 0) / overview.sample_count : 0,
      tokens: Math.round(overview.sample_count ? overview.total_tokens / overview.sample_count : 0),
    })),
    latency: [
      {
        stage: 'Campaign',
        p50Ms: overview.avg_latency_ms ?? 0,
        p95Ms: overview.avg_latency_ms ?? 0,
      },
    ],
    tokens: Object.entries(modeSummaries).map(([mode, raw]) => ({
      mode: modeLabel(mode),
      promptTokens: Math.round(numberValue(asRecord(raw).total_tokens_mean)),
      completionTokens: 0,
      retrievalTokens: 0,
      reasoningTokens: 0,
    })),
  };
}

function mapQuestionRows(data: DashboardApiData) {
  return Object.entries(asRecord(data.questionComparison?.summaries)).map(([questionId, raw]) => {
    const summary = asRecord(raw);
    const modes = Array.isArray(summary.modes) ? summary.modes.map(String) : [];
    return {
      questionId,
      category: 'all',
      difficulty: 'n/a',
      requiredModalities: [],
      deltaCorrectness: 0,
      deltaFaithfulness: 0,
      deltaTokens: numberValue(summary.total_tokens_mean),
      deltaLatencyMs: 0,
      ecrCorrectness: 0,
      bestMode: modes[0] ?? 'n/a',
      routerSelectedMode: modes.includes('router') ? 'router' : 'n/a',
      evidenceCoverage: 0,
      unsupportedClaimRatio: 0,
      risks: [],
      status: 'observed',
      ablationFlags: [],
    };
  });
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
        denseScore: numberValue(chunk.dense_score),
        bm25Score: numberValue(chunk.bm25_score),
        rerankScore: numberValue(chunk.rerank_score),
        inContext: Boolean(chunk.used_in_context),
        usedInAnswer: Boolean(chunk.used_in_answer),
        goldMatch: Boolean(chunk.expected_evidence_match),
        excerpt: stringValue(chunk.excerpt),
      };
    }),
    coverage: [],
  };
}

function mapAgentRows(data: DashboardApiData) {
  return (data.results?.results ?? []).map((result) => {
    const metrics = asRecord(result.derived_metrics);
    const detail = data.runDetail?.run_id === result.id ? data.runDetail : undefined;
    return {
      questionId: result.question_id,
      subtasks: 0,
      toolCalls: detail?.tool_calls?.length ?? 0,
      visualCalls: (detail?.tool_calls ?? []).filter((call) => JSON.stringify(call).toLowerCase().includes('visual')).length,
      graphCalls: (detail?.tool_calls ?? []).filter((call) => JSON.stringify(call).toLowerCase().includes('graph')).length,
      drilldownDepth: numberValue(metrics.max_drilldown_depth),
      correctness: Math.max(0, 1 - numberValue(metrics.unsupported_claim_ratio)),
      faithfulness: numberValue(metrics.supported_claim_ratio),
      tokens: result.total_tokens ?? result.token_usage.total_tokens ?? 0,
    };
  });
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
  return {
    analysisType: data.routerAnalysis?.analysis_type ?? 'retrospective',
    oracleLabelSource: 'utility_best_mode' as const,
    hasActualRouterRuns: rows.some((row) => row.analysis_type === 'actual'),
    utilityFormula: stringValue(summaries.utility_formula, 'Retrospective utility summary from recorded routing decisions.'),
    selectedDecision: {
      selectedMode: stringValue(firstDecision.selected_mode, 'n/a'),
      tier: stringValue(firstDecision.tier, 'n/a'),
      complexity: stringValue(firstDecision.complexity, 'n/a'),
      routingReason: stringValue(firstDecision.reason, 'No routing reason recorded.'),
    },
    comparisonRows: rows.map((row, index) => ({
      label: stringValue(row.selected_mode, `Decision ${index + 1}`),
      qualityScore: numberValue(row.quality_score),
      avgCostUsd: numberValue(row.estimated_cost_usd),
      avgLatencyMs: numberValue(row.latency_ms),
      tokens: numberValue(row.total_tokens),
      regret: numberValue(row.regret),
      policyType: stringValue(row.analysis_type, 'retrospective'),
    })),
    savedTokens: numberValue(summaries.saved_tokens),
    qualityLossVsAgentic: numberValue(summaries.quality_loss_vs_agentic),
    qualityGainVsNaive: numberValue(summaries.quality_gain_vs_naive),
    routerRegret: numberValue(summaries.router_regret),
    confusionMatrix: [],
  };
}

export default function EvaluationCenter() {
  const setupDrawer = useDisclosure();
  const [selectedCampaignId, setSelectedCampaignId] = useState('');
  const [dashboardData, setDashboardData] = useState<DashboardApiData>({ campaigns: [] });
  const [loadingDashboard, setLoadingDashboard] = useState(true);
  const [dashboardError, setDashboardError] = useState<string | null>(null);

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
    const loadDashboard = async () => {
      setLoadingDashboard(true);
      try {
        const [campaigns, overview, modeComparison, errors] = await Promise.all([
          listCampaigns(),
          getCampaignOverview(selectedCampaignId),
          getModeComparison(selectedCampaignId),
          getCampaignErrors(selectedCampaignId),
        ]);
        if (!mounted) {
          return;
        }
        setDashboardData({
          campaigns,
          overview,
          modeComparison,
          errors,
        });
        setDashboardError(null);
        setLoadingDashboard(false);

        const updateDeferredData = <K extends keyof DashboardApiData>(
          key: K,
          loader: () => Promise<Exclude<DashboardApiData[K], undefined>>
        ) => {
          void loader()
            .then((value) => {
              if (mounted) {
                setDashboardData((current) => ({ ...current, [key]: value }));
              }
            })
            .catch(() => undefined);
        };

        updateDeferredData('results', () => getCampaignResults(selectedCampaignId));
        updateDeferredData('questionComparison', () => getQuestionComparison(selectedCampaignId));
        updateDeferredData('costLatency', () => getCostLatency(selectedCampaignId));
        updateDeferredData('routerAnalysis', () => getRouterAnalysis(selectedCampaignId));
        updateDeferredData('ablation', () => getAblationAnalysis(selectedCampaignId));
        updateDeferredData('humanVsAuto', () => getHumanVsAuto(selectedCampaignId));
        updateDeferredData('humanQueue', () => getHumanEvalQueue(selectedCampaignId));

        void getCampaignRuns(selectedCampaignId)
          .then(async (runs) => {
            if (!mounted) {
              return;
            }
            setDashboardData((current) => ({ ...current, runs }));
            const firstRunId = runs.runs[0]?.run_id;
            if (!firstRunId) {
              return;
            }
            const runDetail = await getRunDetail(selectedCampaignId, firstRunId);
            if (mounted) {
              setDashboardData((current) => ({ ...current, runDetail }));
            }
          })
          .catch(() => undefined);
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

  const selectedCampaign = useMemo(
    () => dashboardData.campaigns.find((campaign) => campaign.id === selectedCampaignId) ?? null,
    [dashboardData.campaigns, selectedCampaignId]
  );
  const runOptions = mapRunOptions(dashboardData.runs);
  const selectedRun = runOptions[0];
  const retrievalData = mapRetrieval(dashboardData.runDetail);
  const claimData = mapClaims(dashboardData.runDetail);
  const dashboardTabs = [
    { label: 'Campaign Overview', component: <CampaignOverviewTab data={mapOverviewData(dashboardData)} /> },
    { label: 'Question Analysis', component: <QuestionAnalysisTab rows={mapQuestionRows(dashboardData)} /> },
    {
      label: 'Run Trace',
      component: (
        <RunTraceTab
          runOptions={runOptions}
          selectedRunId={selectedRun?.runId}
          metadata={{
            questionId: selectedRun?.questionId ?? '',
            mode: selectedRun?.mode ?? '',
            repeat: selectedRun?.repeat ?? 1,
            finalAnswerPreview: dashboardData.results?.results?.[0]?.answer,
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
          {dashboardError ? (
            <Text py={2} color="red.500">
              {dashboardError}
            </Text>
          ) : null}
          <Tabs variant="enclosed" isLazy>
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
        </Box>
      </Flex>
      <EvaluationSetupDrawer isOpen={setupDrawer.isOpen} onClose={setupDrawer.onClose} />
    </Layout>
  );
}
