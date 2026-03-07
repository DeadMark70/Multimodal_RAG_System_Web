import api from './api';
import type {
  AvailableModel,
  CampaignCreateRequest,
  CampaignCreateResponse,
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
  let currentEvent = '';
  let currentData = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (line.startsWith('event:')) {
        currentEvent = line.slice(6).trim();
      } else if (line.startsWith('data:')) {
        currentData = line.slice(5).trim();
      } else if (line === '') {
        if (currentEvent && currentData) {
          onEvent({
            type: currentEvent as CampaignStreamEvent['type'],
            data: JSON.parse(currentData),
          } as CampaignStreamEvent);
        }
        currentEvent = '';
        currentData = '';
      }
    }
  }

  if (currentEvent && currentData) {
    onEvent({
      type: currentEvent as CampaignStreamEvent['type'],
      data: JSON.parse(currentData),
    } as CampaignStreamEvent);
  }
}
