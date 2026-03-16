import { beforeEach, describe, expect, it, vi } from 'vitest';
import api from './api';
import {
  cancelCampaign,
  createCampaign,
  getCampaignResultTrace,
  createModelConfig,
  createTestCase,
  deleteModelConfig,
  deleteTestCase,
  evaluateCampaign,
  getCampaignMetrics,
  getCampaignResults,
  importTestCases,
  listAvailableModels,
  listCampaigns,
  listCampaignTraces,
  listModelConfigs,
  listTestCases,
  streamCampaign,
  updateModelConfig,
  updateTestCase,
} from './evaluationApi';

vi.mock('./api', () => ({
  default: {
    defaults: {
      baseURL: 'http://127.0.0.1:8000',
    },
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('./networkPolicy', () => ({
  assertAllowedApiTarget: vi.fn(),
  resolveApiUrl: vi.fn((baseUrl: string, path: string) => `${baseUrl}${path}`),
}));

vi.mock('./supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: {
          session: {
            access_token: 'test-token',
          },
        },
      }),
    },
  },
}));

describe('evaluationApi', () => {
  const mockedApi = api as unknown as {
    get: ReturnType<typeof vi.fn>;
    post: ReturnType<typeof vi.fn>;
    put: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('lists test cases', async () => {
    mockedApi.get.mockResolvedValue({ data: [{ id: 'Q1' }] });
    const result = await listTestCases();
    expect(mockedApi.get).toHaveBeenCalledWith('/api/evaluation/test-cases');
    expect(result).toEqual([{ id: 'Q1' }]);
  });

  it('creates and updates test case', async () => {
    mockedApi.post.mockResolvedValue({ data: { id: 'Q1' } });
    mockedApi.put.mockResolvedValue({ data: { id: 'Q1', question: 'updated' } });

    await createTestCase({ question: 'q', ground_truth: 'a', source_docs: [], requires_multi_doc_reasoning: false });
    expect(mockedApi.post).toHaveBeenCalledWith('/api/evaluation/test-cases', expect.any(Object));

    await updateTestCase('Q1', {
      question: 'updated',
      ground_truth: 'a',
      source_docs: [],
      requires_multi_doc_reasoning: false,
    });
    expect(mockedApi.put).toHaveBeenCalledWith('/api/evaluation/test-cases/Q1', expect.any(Object));
  });

  it('imports and deletes test cases', async () => {
    mockedApi.post.mockResolvedValue({ data: { imported: 8, total: 8 } });
    mockedApi.delete.mockResolvedValue({ data: { deleted_id: 'Q1', total: 7 } });

    const imported = await importTestCases({ metadata: {}, questions: [] });
    expect(imported.total).toBe(8);
    expect(mockedApi.post).toHaveBeenCalledWith('/api/evaluation/test-cases', { metadata: {}, questions: [] });

    await deleteTestCase('Q1');
    expect(mockedApi.delete).toHaveBeenCalledWith('/api/evaluation/test-cases/Q1');
  });

  it('lists models and model configs', async () => {
    mockedApi.get
      .mockResolvedValueOnce({ data: [{ name: 'gemini-2.5-flash' }] })
      .mockResolvedValueOnce({ data: [{ id: 'cfg-1' }] });

    const models = await listAvailableModels(true);
    const configs = await listModelConfigs();
    expect(mockedApi.get).toHaveBeenNthCalledWith(1, '/api/evaluation/models', {
      params: { force_refresh: true },
    });
    expect(models[0].name).toBe('gemini-2.5-flash');
    expect(configs[0].id).toBe('cfg-1');
  });

  it('creates, updates and deletes model config', async () => {
    mockedApi.post.mockResolvedValue({ data: { id: 'cfg-1' } });
    mockedApi.put.mockResolvedValue({ data: { id: 'cfg-1', name: 'updated' } });
    mockedApi.delete.mockResolvedValue({ data: { deleted_id: 'cfg-1', total: 0 } });

    await createModelConfig({
      name: 'Balanced',
      model_name: 'gemini-2.5-flash',
      temperature: 0.7,
      top_p: 0.95,
      top_k: 40,
      max_input_tokens: 8192,
      max_output_tokens: 2048,
      thinking_mode: false,
      thinking_budget: 8192,
    });
    expect(mockedApi.post).toHaveBeenCalledWith('/api/evaluation/model-configs', expect.any(Object));

    await updateModelConfig('cfg-1', {
      name: 'updated',
      model_name: 'gemini-2.5-flash',
      temperature: 0.2,
      top_p: 0.9,
      top_k: 20,
      max_input_tokens: 4096,
      max_output_tokens: 1024,
      thinking_mode: true,
      thinking_budget: 4096,
    });
    expect(mockedApi.put).toHaveBeenCalledWith('/api/evaluation/model-configs/cfg-1', expect.any(Object));

    await deleteModelConfig('cfg-1');
    expect(mockedApi.delete).toHaveBeenCalledWith('/api/evaluation/model-configs/cfg-1');
  });

  it('creates, lists, fetches results, evaluates, loads metrics, and cancels campaigns', async () => {
    mockedApi.post
      .mockResolvedValueOnce({ data: { campaign_id: 'cmp-1', status: 'pending' } })
      .mockResolvedValueOnce({
        data: {
          id: 'cmp-1',
          status: 'evaluating',
          phase: 'evaluation',
          config: {},
          completed_units: 1,
          total_units: 1,
          evaluation_completed_units: 0,
          evaluation_total_units: 1,
          cancel_requested: false,
          created_at: '2026-03-07T00:00:00+00:00',
          updated_at: '2026-03-07T00:00:00+00:00',
        },
      })
      .mockResolvedValueOnce({ data: { id: 'cmp-1', status: 'cancelled' } });
    mockedApi.get
      .mockResolvedValueOnce([{ data: [{ id: 'cmp-1', status: 'running' }] }][0])
      .mockResolvedValueOnce({ data: { campaign: { id: 'cmp-1' }, results: [] } })
      .mockResolvedValueOnce({ data: [{ trace_id: 'trace-1', campaign_result_id: 'r1' }] })
      .mockResolvedValueOnce({ data: { trace_id: 'trace-1', campaign_result_id: 'r1', steps: [] } })
      .mockResolvedValueOnce({
        data: {
          campaign: { id: 'cmp-1' },
          evaluator_model: 'gemini-2.5-pro',
          summary_by_mode: {},
          rows: [],
        },
      });

    await createCampaign({
      name: 'Smoke',
      test_case_ids: ['Q1'],
      modes: ['naive'],
      model_config: {
        id: 'cfg-1',
        name: 'Balanced',
        model_name: 'gemini-2.5-flash',
        temperature: 0.7,
        top_p: 0.95,
        top_k: 40,
        max_input_tokens: 8192,
        max_output_tokens: 2048,
        thinking_mode: false,
        thinking_budget: 8192,
      },
      model_config_id: 'cfg-1',
      repeat_count: 1,
      batch_size: 1,
      rpm_limit: 60,
    });
    expect(mockedApi.post).toHaveBeenNthCalledWith(1, '/api/evaluation/campaigns', expect.any(Object));

    await listCampaigns();
    expect(mockedApi.get).toHaveBeenNthCalledWith(1, '/api/evaluation/campaigns');

    await getCampaignResults('cmp-1');
    expect(mockedApi.get).toHaveBeenNthCalledWith(2, '/api/evaluation/campaigns/cmp-1/results');

    await listCampaignTraces('cmp-1');
    expect(mockedApi.get).toHaveBeenNthCalledWith(3, '/api/evaluation/campaigns/cmp-1/traces');

    await getCampaignResultTrace('cmp-1', 'r1');
    expect(mockedApi.get).toHaveBeenNthCalledWith(4, '/api/evaluation/campaigns/cmp-1/results/r1/trace');

    await getCampaignMetrics('cmp-1');
    expect(mockedApi.get).toHaveBeenNthCalledWith(5, '/api/evaluation/campaigns/cmp-1/metrics');

    await evaluateCampaign('cmp-1');
    expect(mockedApi.post).toHaveBeenNthCalledWith(2, '/api/evaluation/campaigns/cmp-1/evaluate');

    await cancelCampaign('cmp-1');
    expect(mockedApi.post).toHaveBeenNthCalledWith(3, '/api/evaluation/campaigns/cmp-1/cancel');
  });

  it('streams campaign SSE events via fetch', async () => {
    const encoder = new TextEncoder();
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(
          encoder.encode(
            'event: campaign_snapshot\n' +
              'data: {"id":"cmp-1","status":"running","phase":"execution","config":{"test_case_ids":["Q1"],"modes":["naive"],"model_config":{"id":"cfg-1","name":"Balanced","model_name":"gemini","temperature":0.7,"top_p":0.95,"top_k":40,"max_input_tokens":8192,"max_output_tokens":2048,"thinking_mode":false,"thinking_budget":8192},"repeat_count":1,"batch_size":1,"rpm_limit":60},"completed_units":0,"total_units":1,"evaluation_completed_units":0,"evaluation_total_units":0,"cancel_requested":false,"created_at":"2026-03-07T00:00:00+00:00","updated_at":"2026-03-07T00:00:00+00:00"}\n\n' +
              'event: campaign_completed\n' +
              'data: {"id":"cmp-1","status":"completed","phase":"evaluation","config":{"test_case_ids":["Q1"],"modes":["naive"],"model_config":{"id":"cfg-1","name":"Balanced","model_name":"gemini","temperature":0.7,"top_p":0.95,"top_k":40,"max_input_tokens":8192,"max_output_tokens":2048,"thinking_mode":false,"thinking_budget":8192},"repeat_count":1,"batch_size":1,"rpm_limit":60},"completed_units":1,"total_units":1,"evaluation_completed_units":1,"evaluation_total_units":1,"cancel_requested":false,"created_at":"2026-03-07T00:00:00+00:00","completed_at":"2026-03-07T00:00:10+00:00","updated_at":"2026-03-07T00:00:10+00:00"}\n\n'
          )
        );
        controller.close();
      },
    });
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response(body, { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    const events: string[] = [];
    await streamCampaign('cmp-1', (event) => {
      events.push(event.type);
    });

    const [, init] = fetchMock.mock.calls[0] ?? [];
    expect(fetchMock).toHaveBeenCalledWith(
      'http://127.0.0.1:8000/api/evaluation/campaigns/cmp-1/stream',
      expect.any(Object)
    );
    expect(init).toMatchObject({
      method: 'GET',
      headers: {
        Authorization: 'Bearer test-token',
      },
    });
    expect(events).toEqual(['campaign_snapshot', 'campaign_completed']);
  });
});
