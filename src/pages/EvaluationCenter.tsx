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
  EvaluationRunListResponse,
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

function mapRetrievalSummary(detail?: RunDetailResponse): string {
  if (!detail) return 'No selected run detail.';
  const queryCount = detail.retrieval_events?.length ?? 0;
  const chunkCount = detail.retrieval_chunks?.length ?? 0;
  return queryCount || chunkCount
    ? `${queryCount} retrieval event(s), ${chunkCount} chunk(s) recorded.`
    : 'No retrieval observability recorded.';
}

function mapClaimsSummary(detail?: RunDetailResponse): string {
  if (!detail) return 'No selected run detail.';
  const claimCount = detail.claims?.length ?? 0;
  return claimCount ? `${claimCount} claim(s) extracted.` : 'No claim extraction recorded.';
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
      setDashboardData((current) => ({ ...current, runDetail: undefined }));
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
  const selectedRunDetail =
    dashboardData.runDetail?.run_id === selectedRun?.runId ? dashboardData.runDetail : undefined;
  const retrievalData = mapRetrieval(selectedRunDetail);
  const claimData = mapClaims(selectedRunDetail);
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
            finalAnswerPreview: selectedRunDetail?.run_summary?.answer_preview ?? undefined,
            retrievalSummary: mapRetrievalSummary(selectedRunDetail),
            claimsSummary: mapClaimsSummary(selectedRunDetail),
            totalTokens: selectedRunDetail?.run_summary?.total_tokens,
            accountingStatus: selectedRunDetail?.run_summary?.accounting_status,
            accountingDiagnostics: selectedRunDetail?.accounting_diagnostics,
          }}
          traceEvents={mapTraceEvents(selectedRunDetail)}
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
          unsupportedReasons={claimData.unsupportedReasons}
        />
      ),
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
