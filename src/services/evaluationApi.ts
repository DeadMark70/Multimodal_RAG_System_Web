import api from './api';
import type {
  AgentTraceDetail,
  AgentTraceSummary,
  AvailableModel,
  CampaignCreateRequest,
  CampaignCreateResponse,
  CampaignEvaluateRequest,
  CampaignMetricsResponse,
  CampaignProgressEvent,
  CampaignResultsResponse,
  CampaignStatus,
  CampaignStreamEvent,
  DeleteResult,
  GoldenDatasetImportRequest,
  ImportResult,
  ModelConfig,
  ModelConfigInput,
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
    'campaign_failed',
    'campaign_cancelled',
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
    case 'campaign_failed':
      return { type: 'campaign_failed', data: data as CampaignStatus };
    case 'campaign_cancelled':
      return { type: 'campaign_cancelled', data: data as CampaignStatus };
    default:
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
  let currentData = '';

  const processLine = (line: string) => {
    if (line.startsWith('event:')) {
      const nextEvent = line.slice(6).trim();
      currentEvent = isCampaignStreamEventType(nextEvent) ? nextEvent : '';
      return;
    }

    if (line.startsWith('data:')) {
      currentData = line.slice(5).trim();
      return;
    }

    if (line === '') {
      if (currentEvent && currentData) {
        const event = toCampaignStreamEvent(currentEvent, currentData);
        if (event) {
          onEvent(event);
        }
      }
      currentEvent = '';
      currentData = '';
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

  if (currentEvent && currentData) {
    const event = toCampaignStreamEvent(currentEvent, currentData);
    if (event) {
      onEvent(event);
    }
  }
}
