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
  const loadedTabsRef = useRef(new Set<string>());
  const requestGenerationRef = useRef(0);
  const runDetailRequestRef = useRef(0);
  const selectedCampaignIdRef = useRef('');

  useEffect(() => {
    selectedCampaignIdRef.current = selectedCampaignId;
  }, [selectedCampaignId]);

  const loadCampaignInventory = useCallback(async (): Promise<CampaignStatus[]> => {
    const campaigns = await listCampaigns();
    setDashboardData((current) => ({ ...current, campaigns }));
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
    if (!selectedCampaignId) {
      return;
    }

    let mounted = true;
    const generation = requestGenerationRef.current + 1;
    requestGenerationRef.current = generation;
    runDetailRequestRef.current += 1;
    loadedTabsRef.current = new Set();
    setSelectedRunId('');
    setDashboardData((current) => ({ campaigns: current.campaigns }));
    const loadDashboard = async () => {
      setLoadingDashboard(true);
      try {
        const { researchSummary, releaseMetrics } = await loadCampaignOverviewData(
          selectedCampaignId,
          selectedCampaignHasBenchmark,
        );
        if (!mounted) {
          return;
        }
        setDashboardData((current) => ({ ...current, researchSummary, releaseMetrics }));
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
  }, [selectedCampaignHasBenchmark, selectedCampaignId]);

  const loadTabData = useCallback(async (tabIndex: number, campaignId: string, preferredRunId?: string) => {
    switch (tabIndex) {
      case 0:
        return {};
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
        const runDetail = effectiveRunId ? await getRunObservability(campaignId, effectiveRunId) : undefined;
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
        const selectedRunRequest = getCampaignRuns(campaignId).then(async (runs) => {
          const effectiveRunId =
            (preferredRunId && runs.runs.some((run) => run.run_id === preferredRunId)
              ? preferredRunId
              : runs.runs[0]?.run_id) ?? '';
          const runDetail = effectiveRunId
            ? await getRunObservability(campaignId, effectiveRunId).catch(() => undefined)
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
  }, [activeTabIndex, dashboardData.researchSummary, loadTabData, selectedCampaignId, selectedRunId, tabRefreshToken]);

  const handleJobTerminal = useCallback(
    (sourceCampaignId: string, job: EvaluationJob) => {
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
            const overviewData = await loadCampaignOverviewData(
              sourceCampaignId,
              Boolean(refreshedCampaign?.config.benchmark_id),
            );
            if (
              sourceCampaignId !== selectedCampaignIdRef.current
              || generation !== requestGenerationRef.current
            ) {
              return;
            }
            setDashboardData((current) => ({ ...current, ...overviewData }));
            setDashboardError(null);
            return;
          }
          loadedTabsRef.current.delete(`${sourceCampaignId}:${activeTabIndex}`);
          setTabRefreshToken((current) => current + 1);
        })
        .catch((error: unknown) => {
          if (sourceCampaignId === selectedCampaignIdRef.current) {
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
      void getRunObservability(selectedCampaignId, runId)
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
    [selectedCampaignId, selectedRunId]
  );

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
      label: 'Campaign Overview',
      component: (
        <CampaignOverviewTab
          data={dashboardData.researchSummary}
          releaseMetrics={dashboardData.releaseMetrics}
          releaseMetricsNotApplicable={!selectedCampaign?.config.benchmark_id}
        />
      ),
    },
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
      label: 'Retrieval Evidence',
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
    { label: 'Agent Behavior', component: <AgentBehaviorTab rows={mapAgentRows(dashboardData)} /> },
    {
      label: 'Claim Evidence',
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
      label: 'Router Lab',
      component: <RouterLabTab
        data={mapRouterData(dashboardData)}
        executionRoute={executionRoute}
      />,
    },
    {
      label: 'Ablation',
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
          {selectedCampaignId ? (
            <EvaluationJobPanel
              key={selectedCampaignId}
              campaignId={selectedCampaignId}
              onJobTerminal={(job) => handleJobTerminal(selectedCampaignId, job)}
            />
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
