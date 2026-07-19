import api from './api';
import type {
  AgentBehaviorResponse,
  AgentTraceDetail,
  AgentTraceSummary,
  AblationResponse,
  AvailableModel,
  CampaignGranularStreamEventData,
  CampaignErrorsResponse,
  CampaignAnalyticsDashboardResponse,
  CampaignCreateRequest,
  CampaignCreateResponse,
  CampaignEvaluateRequest,
  CampaignOverviewResponse,
  CampaignResearchSummaryResponse,
  CampaignMetricsResponse,
  CampaignProgressEvent,
  CampaignResultsResponse,
  CampaignStatus,
  EvaluationAttempt,
  EvaluationJob,
  EvaluationJobItemSummary,
  EvaluationRerunRequest,
  CostLatencyResponse,
  CampaignStreamEvent,
  DeleteResult,
  EvaluationRunListResponse,
  ExportCampaignRequest,
  ExportCampaignResponse,
  GoldenDatasetImportRequest,
  HumanEvalQueueResponse,
  HumanRatingRequest,
  HumanRatingResponse,
  ImportResult,
  ModelConfig,
  ModelConfigInput,
  ModeComparisonResponse,
  QuestionComparisonResponse,
  ResearchQuestionComparisonResponse,
  HumanVsAutoResponse,
  RouterAnalysisResponse,
  RunClaimsResponse,
  RunContextResponse,
  RunDetailResponse,
  RunDiffResponse,
  RunLlmCallsResponse,
  RunMetricsResponse,
  RunRetrievalResponse,
  RunTraceResponse,
  TestCase,
} from '../types/evaluation';
import { assertAllowedApiTarget, resolveApiUrl } from './networkPolicy';
import { supabase } from './supabase';

type CampaignStreamEventType = CampaignStreamEvent['type'];

function isCampaignStreamEventType(eventType: string): eventType is CampaignStreamEventType {
  return [
    'campaign_snapshot',
    'campaign_progress',
    'campaign_completed',
    'campaign_completed_with_errors',
    'campaign_failed',
    'campaign_cancelled',
    'run_started',
    'routing_completed',
    'retrieval_completed',
    'generation_completed',
    'metric_completed',
    'run_completed',
    'run_failed',
  ].includes(eventType);
}

function parseCampaignStreamEventData(raw: string): unknown {
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
}

function isGranularStreamEventType(
  eventType: CampaignStreamEventType
): eventType is Extract<
  CampaignStreamEventType,
  | 'run_started'
  | 'routing_completed'
  | 'retrieval_completed'
  | 'generation_completed'
  | 'metric_completed'
  | 'run_completed'
  | 'run_failed'
> {
  return [
    'run_started',
    'routing_completed',
    'retrieval_completed',
    'generation_completed',
    'metric_completed',
    'run_completed',
    'run_failed',
  ].includes(eventType);
}

function toCampaignStreamEvent(eventType: string, rawData: string): CampaignStreamEvent | null {
  const data = parseCampaignStreamEventData(rawData);
  if (data == null) {
    return null;
  }

  switch (eventType) {
    case 'campaign_snapshot':
      return { type: 'campaign_snapshot', data: data as CampaignStatus };
    case 'campaign_progress':
      return { type: 'campaign_progress', data: data as CampaignProgressEvent };
    case 'campaign_completed':
      return { type: 'campaign_completed', data: data as CampaignStatus };
    case 'campaign_completed_with_errors':
      return { type: 'campaign_completed_with_errors', data: data as CampaignStatus };
    case 'campaign_failed':
      return { type: 'campaign_failed', data: data as CampaignStatus };
    case 'campaign_cancelled':
      return { type: 'campaign_cancelled', data: data as CampaignStatus };
    default:
      if (isCampaignStreamEventType(eventType) && isGranularStreamEventType(eventType)) {
        return {
          type: eventType,
          data: data as CampaignGranularStreamEventData,
        };
      }
      return null;
  }
}

export async function listTestCases(): Promise<TestCase[]> {
  const response = await api.get<TestCase[]>('/api/evaluation/test-cases');
  return response.data;
}

export async function createTestCase(payload: Omit<TestCase, 'id'> & { id?: string }): Promise<TestCase> {
  const response = await api.post<TestCase>('/api/evaluation/test-cases', payload);
  return response.data;
}

export async function importTestCases(payload: GoldenDatasetImportRequest): Promise<ImportResult> {
  const response = await api.post<ImportResult>('/api/evaluation/test-cases', payload);
  return response.data;
}

export async function updateTestCase(testCaseId: string, payload: Omit<TestCase, 'id'> & { id?: string }): Promise<TestCase> {
  const response = await api.put<TestCase>(`/api/evaluation/test-cases/${testCaseId}`, payload);
  return response.data;
}

export async function deleteTestCase(testCaseId: string): Promise<DeleteResult> {
  const response = await api.delete<DeleteResult>(`/api/evaluation/test-cases/${testCaseId}`);
  return response.data;
}

export async function listAvailableModels(forceRefresh = false): Promise<AvailableModel[]> {
  const response = await api.get<AvailableModel[]>('/api/evaluation/models', {
    params: forceRefresh ? { force_refresh: true } : undefined,
  });
  return response.data;
}

export async function listModelConfigs(): Promise<ModelConfig[]> {
  const response = await api.get<ModelConfig[]>('/api/evaluation/model-configs');
  return response.data;
}

export async function createModelConfig(payload: ModelConfigInput): Promise<ModelConfig> {
  const response = await api.post<ModelConfig>('/api/evaluation/model-configs', payload);
  return response.data;
}

export async function updateModelConfig(configId: string, payload: ModelConfigInput): Promise<ModelConfig> {
  const response = await api.put<ModelConfig>(`/api/evaluation/model-configs/${configId}`, payload);
  return response.data;
}

export async function deleteModelConfig(configId: string): Promise<DeleteResult> {
  const response = await api.delete<DeleteResult>(`/api/evaluation/model-configs/${configId}`);
  return response.data;
}

export async function createCampaign(payload: CampaignCreateRequest): Promise<CampaignCreateResponse> {
  const response = await api.post<CampaignCreateResponse>('/api/evaluation/campaigns', payload);
  return response.data;
}

export async function listCampaigns(): Promise<CampaignStatus[]> {
  const response = await api.get<CampaignStatus[]>('/api/evaluation/campaigns');
  return response.data;
}

export async function getCampaignResults(campaignId: string): Promise<CampaignResultsResponse> {
  const response = await api.get<CampaignResultsResponse>(`/api/evaluation/campaigns/${campaignId}/results`);
  return response.data;
}

export async function listCampaignTraces(campaignId: string): Promise<AgentTraceSummary[]> {
  const response = await api.get<AgentTraceSummary[]>(`/api/evaluation/campaigns/${campaignId}/traces`);
  return response.data;
}

export async function getCampaignResultTrace(
  campaignId: string,
  campaignResultId: string
): Promise<AgentTraceDetail> {
  const response = await api.get<AgentTraceDetail>(
    `/api/evaluation/campaigns/${campaignId}/results/${campaignResultId}/trace`
  );
  return response.data;
}

export async function getCampaignMetrics(campaignId: string): Promise<CampaignMetricsResponse> {
  const response = await api.get<CampaignMetricsResponse>(`/api/evaluation/campaigns/${campaignId}/metrics`);
  return response.data;
}

export async function createCampaignRerun(
  campaignId: string,
  payload: EvaluationRerunRequest,
): Promise<EvaluationJob> {
  const response = await api.post<EvaluationJob>(
    `/api/evaluation/campaigns/${campaignId}/reruns`,
    payload,
  );
  return response.data;
}

export async function listCampaignJobs(campaignId: string): Promise<EvaluationJob[]> {
  const response = await api.get<EvaluationJob[]>(`/api/evaluation/campaigns/${campaignId}/jobs`);
  return response.data;
}

export async function getEvaluationJob(jobId: string): Promise<EvaluationJob> {
  const response = await api.get<EvaluationJob>(`/api/evaluation/jobs/${jobId}`);
  return response.data;
}

export async function cancelEvaluationJob(jobId: string): Promise<EvaluationJob> {
  const response = await api.post<EvaluationJob>(`/api/evaluation/jobs/${jobId}/cancel`);
  return response.data;
}

export async function listWorkItemAttempts(workItemId: string): Promise<EvaluationAttempt[]> {
  const response = await api.get<EvaluationAttempt[]>(
    `/api/evaluation/work-items/${workItemId}/attempts`,
  );
  return response.data;
}

export async function listEvaluationJobItems(jobId: string): Promise<EvaluationJobItemSummary[]> {
  const response = await api.get<EvaluationJobItemSummary[] | { items: EvaluationJobItemSummary[] }>(
    `/api/evaluation/jobs/${jobId}/items`,
  );
  return Array.isArray(response.data) ? response.data : response.data.items;
}

export async function getCampaignOverview(campaignId: string): Promise<CampaignOverviewResponse> {
  const response = await api.get<CampaignOverviewResponse>(`/api/evaluation/campaigns/${campaignId}/overview`);
  return response.data;
}

export async function getCampaignResearchSummary(
  campaignId: string,
): Promise<CampaignResearchSummaryResponse> {
  const response = await api.get<CampaignResearchSummaryResponse>(
    `/api/evaluation/campaigns/${campaignId}/research-summary`,
  );
  return response.data;
}

export async function getCampaignRuns(campaignId: string): Promise<EvaluationRunListResponse> {
  const response = await api.get<EvaluationRunListResponse>(`/api/evaluation/campaigns/${campaignId}/runs`);
  return response.data;
}

export async function getCampaignAnalyticsDashboard(campaignId: string): Promise<CampaignAnalyticsDashboardResponse> {
  const response = await api.get<CampaignAnalyticsDashboardResponse>(
    `/api/evaluation/campaigns/${campaignId}/analytics-dashboard`
  );
  return response.data;
}

export async function getModeComparison(campaignId: string): Promise<ModeComparisonResponse> {
  const response = await api.get<ModeComparisonResponse>(
    `/api/evaluation/campaigns/${campaignId}/mode-comparison`
  );
  return response.data;
}

export async function getQuestionComparison(campaignId: string): Promise<QuestionComparisonResponse> {
  const response = await api.get<QuestionComparisonResponse>(
    `/api/evaluation/campaigns/${campaignId}/question-comparison`
  );
  return response.data;
}

export async function getResearchQuestionComparison(campaignId: string): Promise<ResearchQuestionComparisonResponse> {
  const response = await api.get<ResearchQuestionComparisonResponse>(
    `/api/evaluation/campaigns/${campaignId}/research-question-comparison`,
  );
  return response.data;
}

export async function getAgentBehavior(campaignId: string): Promise<AgentBehaviorResponse> {
  const response = await api.get<AgentBehaviorResponse>(
    `/api/evaluation/campaigns/${campaignId}/agent-behavior`
  );
  return response.data;
}

export async function getCostLatency(campaignId: string): Promise<CostLatencyResponse> {
  const response = await api.get<CostLatencyResponse>(`/api/evaluation/campaigns/${campaignId}/cost-latency`);
  return response.data;
}

export async function getRouterAnalysis(campaignId: string): Promise<RouterAnalysisResponse> {
  const response = await api.get<RouterAnalysisResponse>(
    `/api/evaluation/campaigns/${campaignId}/router-analysis`
  );
  return response.data;
}

export async function getAblationAnalysis(campaignId: string): Promise<AblationResponse> {
  const response = await api.get<AblationResponse>(`/api/evaluation/campaigns/${campaignId}/ablation`);
  return response.data;
}

export async function exportCampaignAnalysis(
  campaignId: string,
  payload: ExportCampaignRequest
): Promise<ExportCampaignResponse> {
  const response = await api.post<ExportCampaignResponse>(`/api/evaluation/campaigns/${campaignId}/export`, payload);
  return response.data;
}

export async function getHumanEvalQueue(campaignId: string): Promise<HumanEvalQueueResponse> {
  const response = await api.get<HumanEvalQueueResponse>(
    `/api/evaluation/campaigns/${campaignId}/human-eval-queue`
  );
  return response.data;
}

export async function postRunHumanRating(
  runId: string,
  payload: HumanRatingRequest
): Promise<HumanRatingResponse> {
  const response = await api.post<HumanRatingResponse>(`/api/evaluation/runs/${runId}/human-ratings`, payload);
  return response.data;
}

export async function getHumanVsAuto(campaignId: string): Promise<HumanVsAutoResponse> {
  const response = await api.get<HumanVsAutoResponse>(`/api/evaluation/campaigns/${campaignId}/human-vs-auto`);
  return response.data;
}

export async function getCampaignErrors(campaignId: string): Promise<CampaignErrorsResponse> {
  const response = await api.get<CampaignErrorsResponse>(`/api/evaluation/campaigns/${campaignId}/errors`);
  return response.data;
}

export async function getRunDetail(campaignId: string, runId: string): Promise<RunDetailResponse> {
  const response = await api.get<RunDetailResponse>(
    `/api/evaluation/campaigns/${campaignId}/runs/${runId}/observability`
  );
  return response.data;
}

export async function getRunTrace(runId: string): Promise<RunTraceResponse> {
  const response = await api.get<RunTraceResponse>(`/api/evaluation/runs/${runId}/trace`);
  return response.data;
}

export async function getRunRetrieval(runId: string): Promise<RunRetrievalResponse> {
  const response = await api.get<RunRetrievalResponse>(`/api/evaluation/runs/${runId}/retrieval`);
  return response.data;
}

export async function getRunContext(runId: string): Promise<RunContextResponse> {
  const response = await api.get<RunContextResponse>(`/api/evaluation/runs/${runId}/context`);
  return response.data;
}

export async function getRunLlmCalls(runId: string): Promise<RunLlmCallsResponse> {
  const response = await api.get<RunLlmCallsResponse>(`/api/evaluation/runs/${runId}/llm-calls`);
  return response.data;
}

export async function getRunClaims(runId: string): Promise<RunClaimsResponse> {
  const response = await api.get<RunClaimsResponse>(`/api/evaluation/runs/${runId}/claims`);
  return response.data;
}

export async function getRunMetrics(runId: string): Promise<RunMetricsResponse> {
  const response = await api.get<RunMetricsResponse>(`/api/evaluation/runs/${runId}/metrics`);
  return response.data;
}

export async function getRunDiff(runId: string, baselineRunId: string): Promise<RunDiffResponse> {
  const response = await api.get<RunDiffResponse>(`/api/evaluation/runs/${runId}/diff`, {
    params: { baseline_run_id: baselineRunId },
  });
  return response.data;
}

export async function evaluateCampaign(
  campaignId: string,
  payload?: CampaignEvaluateRequest
): Promise<CampaignStatus> {
  const normalizedPayload =
    payload?.question_ids && payload.question_ids.length > 0
      ? { question_ids: payload.question_ids }
      : undefined;
  const response = await api.post<CampaignStatus>(
    `/api/evaluation/campaigns/${campaignId}/evaluate`,
    normalizedPayload
  );
  return response.data;
}

export async function cancelCampaign(campaignId: string): Promise<CampaignStatus> {
  const response = await api.post<CampaignStatus>(`/api/evaluation/campaigns/${campaignId}/cancel`);
  return response.data;
}

export async function streamCampaign(
  campaignId: string,
  onEvent: (event: CampaignStreamEvent) => void,
  signal?: AbortSignal
): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error('未登入，請重新登入');
  }

  const streamUrl = resolveApiUrl(api.defaults.baseURL, `/api/evaluation/campaigns/${campaignId}/stream`);
  assertAllowedApiTarget(streamUrl);

  const response = await fetch(streamUrl, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${session.access_token}`,
    },
    signal,
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('Response body is not readable');
  }

  const decoder = new TextDecoder();
  let buffer = '';
  let currentEvent: CampaignStreamEventType | '' = '';
  let currentDataLines: string[] = [];

  const flushEvent = () => {
    if (!currentEvent || currentDataLines.length === 0) {
      currentEvent = '';
      currentDataLines = [];
      return;
    }

    const event = toCampaignStreamEvent(currentEvent, currentDataLines.join('\n'));
    if (event) {
      onEvent(event);
    }
    currentEvent = '';
    currentDataLines = [];
  };

  const processLine = (line: string) => {
    const normalizedLine = line.endsWith('\r') ? line.slice(0, -1) : line;

    if (normalizedLine.startsWith('event:')) {
      const nextEvent = normalizedLine.slice(6).trim();
      currentEvent = isCampaignStreamEventType(nextEvent) ? nextEvent : '';
      return;
    }

    if (normalizedLine.startsWith('data:')) {
      currentDataLines.push(normalizedLine.slice(5).trim());
      return;
    }

    if (normalizedLine === '') {
      flushEvent();
    }
  };

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      processLine(line);
    }
  }

  if (buffer) {
    for (const line of buffer.split('\n')) {
      processLine(line);
    }
  }

  flushEvent();
}
