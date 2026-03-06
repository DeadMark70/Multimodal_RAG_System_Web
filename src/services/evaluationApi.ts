import api from './api';
import type {
  AvailableModel,
  DeleteResult,
  GoldenDatasetImportRequest,
  ImportResult,
  ModelConfig,
  ModelConfigInput,
  TestCase,
} from '../types/evaluation';

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
