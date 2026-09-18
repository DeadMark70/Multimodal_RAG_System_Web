import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Box,
  Button,
  Flex,
  HStack,
  Heading,
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
import {
  asRecord,
  mapAgentRows,
  mapAgenticV9RunEvidence,
  mapClaims,
  mapQuestionRows,
  mapRetrieval,
  mapRouterData,
  numberValue,
  scalarString,
  stringValue,
} from './EvaluationCenter.mappers';
import type { DashboardApiData } from './EvaluationCenter.mappers';
import {
  getAblationAnalysis,
  getCampaignErrors,
  getCampaignStageWarnings,
  getCampaignResearchSummary,
  getCampaignReleaseMetrics,
  getAgentBehavior,
  getHumanEvalQueue,
  getHumanVsAuto,
  getResearchQuestionComparison,
  getRouterAnalysis,
  getCampaignRuns,
  getRunObservability,
  listCampaigns,
} from '../services/evaluationApi';
import type {
  EvaluationRunListResponse,
  EvaluationRunObservabilityDetail,
  CampaignStatus,
  EvaluationJob,
} from '../types/evaluation';
import EvaluationJobPanel from '../components/evaluation/EvaluationJobPanel';

const EvaluationSetupDrawer = lazy(() => import('../components/evaluation/EvaluationSetupDrawer'));
const CampaignOverviewTab = lazy(() => import('../components/evaluation/CampaignOverviewTab'));
const QuestionAnalysisTab = lazy(() => import('../components/evaluation/QuestionAnalysisTab'));
const RunTraceTab = lazy(() => import('../components/evaluation/RunTraceTab'));
const RetrievalEvidenceTab = lazy(() => import('../components/evaluation/RetrievalEvidenceTab'));
const AgentBehaviorTab = lazy(() => import('../components/evaluation/AgentBehaviorTab'));
const ClaimEvidenceTab = lazy(() => import('../components/evaluation/ClaimEvidenceTab'));
const RouterLabTab = lazy(() => import('../components/evaluation/RouterLabTab'));
const AblationDashboardTab = lazy(() => import('../components/evaluation/AblationDashboardTab'));

function mapRunOptions(runs?: EvaluationRunListResponse) {
  return (runs?.runs ?? []).map((run) => ({
    runId: run.run_id,
    campaignId: run.campaign_id,
    questionId: run.question_id,
    mode: run.mode,
    repeat: run.repeat_number ?? run.run_number,
    conditionId: run.condition_id,
    executionProfile: run.execution_profile,
    agenticExecutionVersion: run.agentic_execution_version,
    responseStatus: run.response_status,
  }));
}

function mapTraceEvents(detail?: EvaluationRunObservabilityDetail) {
  return (detail?.trace_events ?? []).map((event) => ({
    eventId: stringValue(event.event_id, stringValue(event.span_id, scalarString(event.sequence, 'event'))),
    spanId: stringValue(event.span_id),
    sequence: numberValue(event.sequence),
    stageName: stringValue(event.stage_name, 'unknown'),
    status: stringValue(event.status, 'unknown'),
    startedAt: stringValue(event.started_at),
    durationMs: typeof event.duration_ms === 'number' ? event.duration_ms : undefined,
    payload: asRecord(event.payload),
    error: asRecord(event.error),
  }));
}

function mapRetrievalSummary(detail?: EvaluationRunObservabilityDetail): string {
  if (!detail) return 'No selected run detail.';
  const queryCount = detail.retrieval_events?.length ?? 0;
  const chunkCount = detail.retrieval_chunks?.length ?? 0;
  return queryCount || chunkCount
    ? `${queryCount} retrieval event(s), ${chunkCount} chunk(s) recorded.`
    : 'No retrieval observability recorded.';
}

function mapClaimsSummary(detail?: EvaluationRunObservabilityDetail): string {
  if (!detail) return 'No selected run detail.';
  const claimCount = detail.claims?.length ?? 0;
  if (claimCount) return `${claimCount} claim(s) extracted.`;
  return detail.claim_extraction_status === 'empty'
    ? 'Claim extraction ran and recorded zero claims.'
    : 'Claim extraction telemetry was not recorded for this run.';
}

async function loadCampaignOverviewData(campaignId: string, hasBenchmark: boolean) {
  const [researchSummary, releaseMetrics] = await Promise.all([
    getCampaignResearchSummary(campaignId),
    // Historical deployments may not yet expose Wave 7. Do not make the
    // established research dashboard unavailable because of that.
    hasBenchmark
      ? getCampaignReleaseMetrics(campaignId).catch(() => undefined)
      : Promise.resolve(undefined),
  ]);
  return { researchSummary, releaseMetrics };
}

export default function EvaluationCenter() {
  const setupDrawer = useDisclosure();
  const [selectedCampaignId, setSelectedCampaignId] = useState('');
  const [dashboardData, setDashboardData] = useState<DashboardApiData>({ campaigns: [] });
  const [loadingDashboard, setLoadingDashboard] = useState(true);
  const [loadingTab, setLoadingTab] = useState(false);
  const [activeTabIndex, setActiveTabIndex] = useState(0);
  const [selectedRunId, setSelectedRunId] = useState('');
  const [tabRefreshToken, setTabRefreshToken] = useState(0);
  const [dashboardError, setDashboardError] = useState<string | null>(null);
  const [moreCampaigns, setMoreCampaigns] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const runsCache = useRef(new Map<string, Promise<EvaluationRunListResponse>>());
  const detailCache = useRef(new Map<string, Promise<EvaluationRunObservabilityDetail>>());
  const loadedTabsRef = useRef(new Set<string>());
  const requestGenerationRef = useRef(0);
  const overviewRequestRef = useRef(0);
  const runDetailRequestRef = useRef(0);
  const selectedCampaignIdRef = useRef('');
  const selectedCampaignHasBenchmarkRef = useRef(false);

  const loadRuns = useCallback((campaignId: string) => {
    let request = runsCache.current.get(campaignId);
    if (!request) {
      request = getCampaignRuns(campaignId).catch((error) => {
        runsCache.current.delete(campaignId);
        throw error;
      });
      runsCache.current.set(campaignId, request);
    }
    return request;
  }, []);

  const loadRunDetail = useCallback((campaignId: string, runId: string) => {
    const key = `${campaignId}:${runId}`;
    let request = detailCache.current.get(key);
    if (!request) {
      request = getRunObservability(campaignId, runId).catch((error) => {
        detailCache.current.delete(key);
        throw error;
      });
      detailCache.current.set(key, request);
    }
    return request;
  }, []);

  useEffect(() => {
    selectedCampaignIdRef.current = selectedCampaignId;
  }, [selectedCampaignId]);

  const loadCampaignInventory = useCallback(async (): Promise<CampaignStatus[]> => {
    const campaigns = await listCampaigns();
    setMoreCampaigns(campaigns.length === 50);
    setDashboardData((current) => ({ ...current, campaigns: [
      ...campaigns, ...current.campaigns.filter((old) => !campaigns.some((item) => item.id === old.id)),
    ] }));
    setSelectedCampaignId((current) => current || campaigns[0]?.id || '');
    return campaigns;
  }, []);

  useEffect(() => {
    let mounted = true;

    const loadCampaigns = async () => {
      setLoadingDashboard(true);
      try {
        await loadCampaignInventory();
        if (!mounted) {
          return;
        }
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
  }, [loadCampaignInventory]);

  const selectedCampaign = useMemo(
    () => dashboardData.campaigns.find((campaign) => campaign.id === selectedCampaignId) ?? null,
    [dashboardData.campaigns, selectedCampaignId]
  );
  const selectedCampaignHasBenchmark = Boolean(selectedCampaign?.config.benchmark_id);

  useEffect(() => {
    selectedCampaignHasBenchmarkRef.current = selectedCampaignHasBenchmark;
  }, [selectedCampaignHasBenchmark]);

  useEffect(() => {
    if (!selectedCampaignId) {
      return;
    }

    let mounted = true;
    const generation = requestGenerationRef.current + 1;
    requestGenerationRef.current = generation;
    const overviewRequest = overviewRequestRef.current + 1;
    overviewRequestRef.current = overviewRequest;
    runDetailRequestRef.current += 1;
    loadedTabsRef.current = new Set();
    runsCache.current.clear();
    detailCache.current.clear();
    setSelectedRunId('');
    setDashboardData((current) => ({ campaigns: current.campaigns }));
    const loadDashboard = async () => {
      setLoadingDashboard(true);
      try {
        const { researchSummary, releaseMetrics } = await loadCampaignOverviewData(
          selectedCampaignId,
          selectedCampaignHasBenchmarkRef.current,
        );
        if (
          !mounted
          || overviewRequest !== overviewRequestRef.current
          || generation !== requestGenerationRef.current
          || selectedCampaignId !== selectedCampaignIdRef.current
        ) {
          return;
        }
        setDashboardData((current) => ({ ...current, researchSummary, releaseMetrics }));
        setDashboardError(null);
        setLoadingDashboard(false);
      } catch (error) {
        if (mounted
          && overviewRequest === overviewRequestRef.current
          && generation === requestGenerationRef.current
          && selectedCampaignId === selectedCampaignIdRef.current) {
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
        return {};
      case 1:
        return { questionComparison: await getResearchQuestionComparison(campaignId) };
      case 2:
      case 3:
      case 5: {
        const runs = await loadRuns(campaignId);
        const effectiveRunId =
          (preferredRunId && runs.runs.some((run) => run.run_id === preferredRunId)
            ? preferredRunId
            : runs.runs[0]?.run_id) ?? '';
        const runDetail = effectiveRunId ? await loadRunDetail(campaignId, effectiveRunId) : undefined;
        return {
          runs,
          runDetail,
          selectedV9Evidence: mapAgenticV9RunEvidence(runDetail),
        };
      }
      case 4:
        return { agentBehavior: await getAgentBehavior(campaignId) };
      case 6: {
        const routerRequest = getRouterAnalysis(campaignId);
        const selectedRunRequest = loadRuns(campaignId).then(async (runs) => {
          const effectiveRunId =
            (preferredRunId && runs.runs.some((run) => run.run_id === preferredRunId)
              ? preferredRunId
              : runs.runs[0]?.run_id) ?? '';
          const runDetail = effectiveRunId
            ? await loadRunDetail(campaignId, effectiveRunId).catch(() => undefined)
            : undefined;
          return {
            runs,
            runDetail,
            selectedV9Evidence: mapAgenticV9RunEvidence(runDetail),
          };
        });
        const [routerResult, selectedRunResult] = await Promise.allSettled([
          routerRequest,
          selectedRunRequest,
        ]);
        const selectedRunData = selectedRunResult.status === 'fulfilled'
          ? selectedRunResult.value
          : { runs: undefined, runDetail: undefined, selectedV9Evidence: undefined };
        return {
          routerAnalysis: routerResult.status === 'fulfilled' ? routerResult.value : undefined,
          ...selectedRunData,
        };
      }
      case 7: {
        const [ablation, humanVsAuto, humanQueue, errors, stageWarnings] = await Promise.all([
          getAblationAnalysis(campaignId),
          getHumanVsAuto(campaignId),
          getHumanEvalQueue(campaignId),
          getCampaignErrors(campaignId),
          getCampaignStageWarnings(campaignId),
        ]);
        return { ablation, humanVsAuto, humanQueue, errors, stageWarnings };
      }
      default:
        return {};
    }
  }, [loadRuns, loadRunDetail]);

  useEffect(() => {
    if (!selectedCampaignId || !dashboardData.researchSummary) {
      setLoadingTab(false);
      return;
    }
    const tabKey = `${selectedCampaignId}:${activeTabIndex}`;
    if (loadedTabsRef.current.has(tabKey)) {
      setLoadingTab(false);
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
  }, [activeTabIndex, dashboardData.researchSummary, loadTabData, selectedCampaignId, selectedRunId, tabRefreshToken]);

  const handleJobTerminal = useCallback(
    (sourceCampaignId: string, job: EvaluationJob) => {
      let refreshedOverviewRequest: number | undefined;
      runsCache.current.delete(sourceCampaignId);
      detailCache.current.clear();
      if (
        sourceCampaignId !== selectedCampaignIdRef.current
        || (job.campaign_id && job.campaign_id !== sourceCampaignId)
      ) {
        return;
      }
      void loadCampaignInventory()
        .then(async (campaigns) => {
          if (sourceCampaignId !== selectedCampaignIdRef.current) {
            return;
          }
          if (activeTabIndex === 0) {
            const generation = requestGenerationRef.current;
            const refreshedCampaign = campaigns.find((campaign) => campaign.id === sourceCampaignId);
            const overviewRequest = overviewRequestRef.current + 1;
            refreshedOverviewRequest = overviewRequest;
            overviewRequestRef.current = overviewRequest;
            const overviewData = await loadCampaignOverviewData(
              sourceCampaignId,
              Boolean(refreshedCampaign?.config.benchmark_id),
            );
            if (
              overviewRequest !== overviewRequestRef.current
              || generation !== requestGenerationRef.current
              || sourceCampaignId !== selectedCampaignIdRef.current
            ) {
              return;
            }
            setDashboardData((current) => ({ ...current, ...overviewData }));
            setDashboardError(null);
            setLoadingDashboard(false);
            return;
          }
          loadedTabsRef.current.delete(`${sourceCampaignId}:${activeTabIndex}`);
          setTabRefreshToken((current) => current + 1);
        })
        .catch((error: unknown) => {
          if (sourceCampaignId === selectedCampaignIdRef.current) {
            if (refreshedOverviewRequest !== undefined) {
              if (refreshedOverviewRequest !== overviewRequestRef.current) return;
              setLoadingDashboard(false);
            }
            setDashboardError(error instanceof Error ? error.message : 'Failed to refresh evaluation campaigns');
          }
        });
    },
    [activeTabIndex, loadCampaignInventory],
  );

  const handleSelectedRunIdChange = useCallback(
    (runId: string) => {
      if (!selectedCampaignId || !runId || runId === selectedRunId) {
        return;
      }
      setSelectedRunId(runId);
      setDashboardData((current) => ({
        ...current,
        runDetail: undefined,
        selectedV9Evidence: undefined,
      }));
      const requestId = runDetailRequestRef.current + 1;
      const campaignGeneration = requestGenerationRef.current;
      runDetailRequestRef.current = requestId;
      void loadRunDetail(selectedCampaignId, runId)
        .then((runDetail) => {
          if (
            requestId === runDetailRequestRef.current &&
            campaignGeneration === requestGenerationRef.current
          ) {
            setDashboardData((current) => ({
              ...current,
              runDetail,
              selectedV9Evidence: mapAgenticV9RunEvidence(runDetail),
            }));
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
    [selectedCampaignId, selectedRunId, loadRunDetail]
  );

  useEffect(() => {
    if (!selectedCampaignId || !dashboardData.researchSummary) return;
    let cancelled = false;
    const updating = dashboardData.researchSummary.analysis_status === 'updating'
      || ['pending', 'running', 'evaluating'].includes(selectedCampaign?.status ?? '');
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'hidden') return;
      void getCampaignResearchSummary(selectedCampaignId).then((summary) => {
        if (cancelled || selectedCampaignIdRef.current !== selectedCampaignId) return;
        if (summary.analysis_updated_at && summary.analysis_updated_at !== dashboardData.researchSummary?.analysis_updated_at) {
          runsCache.current.clear();
          detailCache.current.clear();
          loadedTabsRef.current.clear();
          setTabRefreshToken((value) => value + 1);
        }
        setDashboardData((current) => ({ ...current, researchSummary: summary }));
      }).catch((error: unknown) => {
        if (!cancelled) setDashboardError(error instanceof Error ? error.message : 'Unable to refresh summary');
      });
    }, updating ? 4000 : 30000);
    return () => { cancelled = true; window.clearInterval(timer); };
  }, [selectedCampaignId, selectedCampaign?.status, dashboardData.researchSummary]);

  const analysisUpdating = (activeTabIndex === 1 && dashboardData.questionComparison?.analysis_status === 'updating')
    || (activeTabIndex === 4 && dashboardData.agentBehavior?.analysis_status === 'updating');

  useEffect(() => {
    if (!analysisUpdating) return;
    let cancelled = false;
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'hidden') return;
      void loadTabData(activeTabIndex, selectedCampaignId).then((partial) => {
        if (!cancelled && selectedCampaignId === selectedCampaignIdRef.current) {
          setDashboardData((current) => ({ ...current, ...partial }));
        }
      }).catch((error: unknown) => {
        if (!cancelled) setDashboardError(error instanceof Error ? error.message : 'Unable to refresh analysis');
      });
    }, 4000);
    return () => { cancelled = true; window.clearInterval(timer); };
  }, [analysisUpdating, activeTabIndex, selectedCampaignId, loadTabData]);

  const loadMoreCampaigns = async () => {
    setLoadingMore(true);
    try {
      const page = await listCampaigns(dashboardData.campaigns.length);
      setMoreCampaigns(page.length === 50);
      setDashboardData((current) => ({ ...current, campaigns: [
        ...current.campaigns, ...page.filter((item) => !current.campaigns.some((old) => old.id === item.id)),
      ] }));
    } catch (error) {
      setDashboardError(error instanceof Error ? error.message : 'Unable to load campaigns');
    } finally { setLoadingMore(false); }
  };

  const loadMoreRuns = async () => {
    const offset = dashboardData.runs?.next_offset;
    if (offset == null) return;
    const campaignId = selectedCampaignId;
    setLoadingMore(true);
    try {
      const page = await getCampaignRuns(campaignId, offset);
      if (campaignId !== selectedCampaignIdRef.current) return;
      const combined = { ...page, runs: [
        ...(dashboardData.runs?.runs ?? []),
        ...page.runs.filter((item) => !dashboardData.runs?.runs.some((old) => old.run_id === item.run_id)),
      ] };
      runsCache.current.set(campaignId, Promise.resolve(combined));
      setDashboardData((current) => ({ ...current, runs: combined }));
    } catch (error) {
      setDashboardError(error instanceof Error ? error.message : 'Unable to load runs');
    } finally { setLoadingMore(false); }
  };

  const loadMoreAnalysis = async () => {
    const campaignId = selectedCampaignId;
    setLoadingMore(true);
    try {
      if (activeTabIndex === 1 && dashboardData.questionComparison?.next_offset != null) {
        const previous = dashboardData.questionComparison;
        const page = await getResearchQuestionComparison(campaignId, previous.next_offset!);
        if (campaignId !== selectedCampaignIdRef.current) return;
        const changed = page.analysis_updated_at !== previous.analysis_updated_at;
        const next = changed ? await getResearchQuestionComparison(campaignId) : {
          ...page,
          rows: [...previous.rows, ...page.rows.filter((row) => !previous.rows.some((old) => old.question_id === row.question_id))],
          summaries: { ...previous.summaries, ...page.summaries },
        };
        if (campaignId === selectedCampaignIdRef.current) {
          setDashboardData((current) => ({ ...current, questionComparison: next }));
        }
      } else if (activeTabIndex === 4 && dashboardData.agentBehavior?.next_offset != null) {
        const previous = dashboardData.agentBehavior;
        const page = await getAgentBehavior(campaignId, previous.next_offset!);
        if (campaignId !== selectedCampaignIdRef.current) return;
        const changed = page.analysis_updated_at !== previous.analysis_updated_at;
        const next = changed ? await getAgentBehavior(campaignId) : {
          ...page,
          rows: [...previous.rows, ...page.rows.filter((row) => !previous.rows.some((old) => old.run_id === row.run_id))],
        };
        if (campaignId === selectedCampaignIdRef.current) {
          setDashboardData((current) => ({ ...current, agentBehavior: next }));
        }
      }
    } catch (error) {
      if (campaignId === selectedCampaignIdRef.current) {
        setDashboardError(error instanceof Error ? error.message : 'Unable to load analysis');
      }
    } finally { setLoadingMore(false); }
  };

  const runOptions = mapRunOptions(dashboardData.runs);
  const selectedRun = runOptions.find((run) => run.runId === selectedRunId) ?? runOptions[0];
  const selectedRunDetail =
    dashboardData.runDetail?.run_id === selectedRun?.runId ? dashboardData.runDetail : undefined;
  const selectedV9Evidence =
    dashboardData.selectedV9Evidence?.runId === selectedRun?.runId
      ? dashboardData.selectedV9Evidence
      : undefined;
  const executionContract = selectedV9Evidence?.queryContract;
  const executionDecision = executionContract?.route_decision;
  const executionRoute = executionContract ? {
    route: executionContract.route,
    decisionSource: executionDecision?.decision_source ?? null,
    routeReason: executionDecision?.route_reason ?? null,
    matchedRules: executionDecision?.matched_rules ?? [],
    candidateRoutes: executionDecision?.candidate_routes ?? [],
    fallbackReason: executionDecision?.fallback_reason ?? null,
  } : undefined;
  const retrievalData = mapRetrieval(selectedRunDetail);
  const claimData = mapClaims(selectedRunDetail);
  const dashboardTabs = [
    {
      label: '總覽',
      component: (
        <CampaignOverviewTab
          data={dashboardData.researchSummary}
          releaseMetrics={dashboardData.releaseMetrics}
          releaseMetricsNotApplicable={!selectedCampaign?.config.benchmark_id}
        />
      ),
    },
    { label: '題目分析', component: <QuestionAnalysisTab rows={mapQuestionRows(dashboardData)} /> },
    {
      label: '執行追蹤',
      component: (
        <RunTraceTab
          runOptions={runOptions}
          selectedRunId={selectedRun?.runId}
          onSelectedRunIdChange={handleSelectedRunIdChange}
          metadata={{
            questionId: selectedRun?.questionId ?? '',
            mode: selectedRun?.mode ?? '',
            repeat: selectedRun?.repeat ?? 1,
            finalAnswerPreview: selectedRunDetail?.run_summary?.answer_preview ?? undefined,
            retrievalSummary: mapRetrievalSummary(selectedRunDetail),
            claimsSummary: mapClaimsSummary(selectedRunDetail),
            totalTokens: selectedRunDetail?.run_summary?.total_tokens,
            accountingStatus: selectedRunDetail?.run_summary?.accounting_status,
            accountingDiagnostics: selectedRunDetail?.accounting_diagnostics,
          }}
          traceEvents={mapTraceEvents(selectedRunDetail)}
          agenticV9Evidence={selectedV9Evidence}
        />
      ),
    },
    {
      label: '檢索證據',
      component: (
        <RetrievalEvidenceTab
          runOptions={runOptions}
          selectedRunId={selectedRun?.runId}
          onSelectedRunIdChange={handleSelectedRunIdChange}
          retrievals={retrievalData.retrievals}
          chunks={retrievalData.chunks}
          coverage={retrievalData.coverage}
          coverageStatus={retrievalData.coverageStatus}
          graph={retrievalData.graph}
          agenticV9Evidence={selectedV9Evidence}
        />
      ),
    },
    { label: 'Agent 行為', component: <AgentBehaviorTab rows={mapAgentRows(dashboardData)} /> },
    {
      label: '陳述證據',
      component: (
        <ClaimEvidenceTab
          runOptions={runOptions}
          selectedRunId={selectedRun?.runId}
          onSelectedRunIdChange={handleSelectedRunIdChange}
          claims={claimData.claims}
          extractionStatus={claimData.extractionStatus}
          unsupportedReasons={claimData.unsupportedReasons}
          agenticV9Evidence={selectedV9Evidence}
        />
      ),
    },
    {
      label: '路由分析',
      component: <RouterLabTab
        data={mapRouterData(dashboardData)}
        executionRoute={executionRoute}
      />,
    },
    {
      label: '消融分析',
      component: (
        <AblationDashboardTab
          campaignId={selectedCampaignId}
          onExportError={setDashboardError}
          data={{
            ablation: dashboardData.ablation,
            humanVsAuto: dashboardData.humanVsAuto,
            humanQueue: dashboardData.humanQueue,
            errors: dashboardData.errors,
            stageWarnings: dashboardData.stageWarnings,
          }}
        />
      ),
    },
  ] as const;

  const visibleTabs = activeTabIndex < 3 ? dashboardTabs.slice(0, 3)
    : [...dashboardTabs.slice(0, 3), ...dashboardTabs.slice(activeTabIndex, activeTabIndex + 1)];

  return (
    <Layout>
      <Flex direction="column" flex={1} minH={0} overflow="hidden">
        <Flex flexShrink={0} align="center" justify="space-between" gap={3} wrap="wrap" mb={4}>
          <Heading size="lg" flexShrink={0}>評估中心</Heading>
          <Flex flex="0 1 780px" minW={0} gap={3} wrap="wrap" align="center">
            <Select
              size="sm"
              flex="1 1 220px"
              minW={0}
              width="auto"
              height={9}
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
            {moreCampaigns ? <Button size="sm" height={9} flexShrink={0} whiteSpace="nowrap" variant="outline" isLoading={loadingMore} onClick={() => void loadMoreCampaigns()}>載入較早的評估</Button> : null}
            <Button size="sm" height={9} flexShrink={0} whiteSpace="nowrap" onClick={setupDrawer.onOpen}>
              建立／設定評估
            </Button>
          </Flex>
        </Flex>

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
              <Text>正在載入評估摘要…</Text>
            </HStack>
          ) : null}
          {!loadingDashboard && loadingTab ? (
            <HStack py={2} color="text.secondary">
              <Spinner size="sm" />
              <Text>正在載入所選分析…</Text>
            </HStack>
          ) : null}
          {dashboardError ? (
            <Text py={2} color="red.500">
              {dashboardError}
            </Text>
          ) : null}
          {selectedCampaignId ? (
            <EvaluationJobPanel
              key={selectedCampaignId}
              campaignId={selectedCampaignId}
              summary={dashboardData.researchSummary}
              onJobTerminal={(job) => handleJobTerminal(selectedCampaignId, job)}
            />
          ) : null}
          {analysisUpdating ? <Text fontSize="sm">分析更新中，目前顯示上次計算結果。</Text> : null}
          {[2, 3, 5, 6].includes(activeTabIndex) && dashboardData.runs?.next_offset != null ? (
            <Button size="sm" my={2} isLoading={loadingMore} onClick={() => void loadMoreRuns()}>載入更多作答紀錄</Button>
          ) : null}
          {(activeTabIndex === 1 && dashboardData.questionComparison?.next_offset != null)
            || (activeTabIndex === 4 && dashboardData.agentBehavior?.next_offset != null) ? (
              <Button size="sm" my={2} isLoading={loadingMore} onClick={() => void loadMoreAnalysis()}>載入更多分析</Button>
            ) : null}
          <Suspense fallback={<Text py={4}>正在載入評估畫面…</Text>}>
            <Tabs
              variant="enclosed"
              isLazy
              index={Math.min(activeTabIndex, 3)}
              onChange={(index) => { if (index < 3) setActiveTabIndex(index); }}
            >
              <Flex align="center" gap={3} wrap="wrap">
                <TabList overflowX="auto" overflowY="hidden" pb={1} flex="1" minW={0}>
                  {visibleTabs.map((tab) => (
                    <Tab key={tab.label} whiteSpace="nowrap">{tab.label}</Tab>
                  ))}
                </TabList>
                <Select aria-label="進階分析" size="sm" width="auto" minW="160px"
                  value={activeTabIndex >= 3 ? String(activeTabIndex) : ''}
                  onChange={(event) => { if (event.target.value) setActiveTabIndex(Number(event.target.value)); }}>
                  <option value="" disabled>進階分析…</option>
                  {dashboardTabs.slice(3).map((tab, index) => <option key={tab.label} value={index + 3}>{tab.label}</option>)}
                </Select>
              </Flex>

              <TabPanels>
                {visibleTabs.map((tab) => (
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
