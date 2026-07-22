import { beforeEach, describe, expect, it, vi } from 'vitest';
import api from './api';
import {
  cancelCampaign,
  cancelEvaluationJob,
  createCampaign,
  createCampaignRerun,
  getCampaignResultTrace,
  getCampaignAnalyticsDashboard,
  getCampaignOverview,
  getCampaignResearchSummary,
  getCampaignRuns,
  getModeComparison,
  getQuestionComparison,
  getCostLatency,
  getRouterAnalysis,
  getAblationAnalysis,
  getCampaignErrors,
  exportCampaignAnalysis,
  getHumanEvalQueue,
  postRunHumanRating,
  preflightCampaign,
  getHumanVsAuto,
  getRunDetail,
  getRunTrace,
  getRunRetrieval,
  getRunContext,
  getRunLlmCalls,
  getRunClaims,
  getRunMetrics,
  getRunDiff,
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
  listCampaignJobs,
  listEvaluationJobItems,
  listWorkItemAttempts,
  listCampaignTraces,
  listModelConfigs,
  listTestCases,
  streamCampaign,
  getEvaluationJob,
  updateModelConfig,
  updateTestCase,
} from './evaluationApi';
import type { AvailableModel } from '../types/evaluation';

const researchSummaryFixture = {
  campaign_id: 'cmp-1',
  research_schema_version: '2' as const,
  completed_run_count: 2,
  total_run_count: 2,
  failed_run_count: 0,
  quality_status: 'complete' as const,
  token_accounting_status: 'complete' as const,
  pricing_status: 'complete' as const,
  phase_attribution_status: 'complete' as const,
  sample_count: 2,
  quality: {
    faithfulness: { value: 0.91, status: 'complete' as const, valid_samples: 2, missing_samples: 0, failed_samples: 0, evaluator_model: 'gemini-2.5-pro', metric_version: 'ragas-0.2' },
    answer_correctness: { value: 0.88, status: 'complete' as const, valid_samples: 2, missing_samples: 0, failed_samples: 0, evaluator_model: 'gemini-2.5-pro', metric_version: 'ragas-0.2' },
    answer_relevancy: { value: 0.86, status: 'complete' as const, valid_samples: 2, missing_samples: 0, failed_samples: 0, evaluator_model: 'gemini-2.5-pro', metric_version: 'ragas-0.2' },
  },
  latency: { mean_ms: 1000, p50_ms: 900, p95_ms: 1200, sample_count: 2, method: 'nearest_rank' as const, low_sample_size: true },
  tokens: { input_tokens: 120, output_text_tokens: 80, reasoning_tokens: 20, other_tokens: 0, total_tokens: 220, by_phase: { execution: 220 }, accounting_status: 'complete' as const, phase_attribution_status: 'complete' as const },
  execution_cost: { benchmark_usd: 0.02, operational_usd: 0.02, pricing_status: 'complete' as const, priced_call_count: 2, unpriced_call_count: 0 },
  modes: [{ mode: 'agentic', sample_count: 2, comparable: true, not_comparable_reasons: [], quality: {
    faithfulness: { value: 0.91, status: 'complete' as const, valid_samples: 2, missing_samples: 0, failed_samples: 0, evaluator_model: 'gemini-2.5-pro', metric_version: 'ragas-0.2' },
    answer_correctness: { value: 0.88, status: 'complete' as const, valid_samples: 2, missing_samples: 0, failed_samples: 0, evaluator_model: 'gemini-2.5-pro', metric_version: 'ragas-0.2' },
    answer_relevancy: { value: 0.86, status: 'complete' as const, valid_samples: 2, missing_samples: 0, failed_samples: 0, evaluator_model: 'gemini-2.5-pro', metric_version: 'ragas-0.2' },
  }, latency: { mean_ms: 1000, p50_ms: 900, p95_ms: 1200, sample_count: 2, method: 'nearest_rank' as const, low_sample_size: true }, tokens: { input_tokens: 120, output_text_tokens: 80, reasoning_tokens: 20, other_tokens: 0, total_tokens: 220, by_phase: { execution: 220 }, accounting_status: 'complete' as const, phase_attribution_status: 'complete' as const }, execution_cost: { benchmark_usd: 0.02, operational_usd: 0.02, pricing_status: 'complete' as const, priced_call_count: 2, unpriced_call_count: 0 } }],
  evaluation_overhead: { tokens: { input_tokens: 0, output_text_tokens: 0, reasoning_tokens: 0, other_tokens: 0, total_tokens: 0, by_phase: {}, accounting_status: 'complete' as const, phase_attribution_status: 'complete' as const }, cost_usd: 0, pricing_status: 'complete' as const, evaluator_models: ['gemini-2.5-pro'], metric_names: ['faithfulness', 'answer_correctness', 'answer_relevancy'], batch_count: 1, retry_count: 0 },
  warnings: [],
};

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

    await createTestCase({
      question: 'q',
      ground_truth: 'a',
      key_points: [],
      ragas_focus: [],
      source_docs: [],
      requires_multi_doc_reasoning: false,
    });
    expect(mockedApi.post).toHaveBeenCalledWith('/api/evaluation/test-cases', expect.any(Object));

    await updateTestCase('Q1', {
      question: 'updated',
      ground_truth: 'a',
      key_points: [],
      ragas_focus: [],
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


  it('preserves thinking capability metadata from available models', async () => {
    mockedApi.get.mockResolvedValueOnce({
      data: [
        {
          name: 'gemini-3.0-flash',
          display_name: 'Gemini 3.0 Flash',
          description: null,
          input_token_limit: 1048576,
          output_token_limit: 8192,
          supported_actions: ['generateContent'],
          thinking: {
            supported: true,
            control_type: 'level',
            levels: ['minimal', 'low', 'medium', 'high'],
            budget_min: null,
            budget_max: null,
            supports_disable: false,
            supports_dynamic: false,
            default_level: 'medium',
            default_budget: null,
            guidance: 'Gemini 3 models should use thinking_level rather than thinking_budget.',
          },
        } satisfies AvailableModel,
      ],
    });

    const models = await listAvailableModels();

    expect(models[0].thinking.control_type).toBe('level');
    expect(models[0].thinking.default_level).toBe('medium');
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
          available_metrics: [],
          summary_by_mode: {},
          summary_by_category: {},
          summary_by_focus: {},
          delta_by_category: {},
          delta_by_difficulty: {},
          delta_by_question: {},
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
      ragas_batch_size: 8,
      ragas_parallel_batches: 8,
      ragas_rpm_limit: 1000,
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
    expect(mockedApi.post).toHaveBeenNthCalledWith(
      2,
      '/api/evaluation/campaigns/cmp-1/evaluate',
      undefined
    );

    await cancelCampaign('cmp-1');
    expect(mockedApi.post).toHaveBeenNthCalledWith(3, '/api/evaluation/campaigns/cmp-1/cancel');
  });

  it('fetches the strict research summary', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: researchSummaryFixture });

    expect(await getCampaignResearchSummary('cmp-1')).toEqual(researchSummaryFixture);
    expect(mockedApi.get).toHaveBeenCalledWith('/api/evaluation/campaigns/cmp-1/research-summary');
  });

  it('passes question_ids payload when rerunning selected questions', async () => {
    mockedApi.post.mockResolvedValue({
      data: { id: 'cmp-1', status: 'evaluating' },
    });

    await evaluateCampaign('cmp-1', { question_ids: ['Q2', 'Q8'] });

    expect(mockedApi.post).toHaveBeenCalledWith(
      '/api/evaluation/campaigns/cmp-1/evaluate',
      { question_ids: ['Q2', 'Q8'] }
    );
  });

  it('posts the typed v9 preflight request without a client-supplied identity', async () => {
    const request = {
      test_case_ids: ['Q1'],
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
      },
      runtime_token_budget: 4096,
      max_llm_calls: 5,
    };
    mockedApi.post.mockReset();
    try {
      mockedApi.post.mockResolvedValueOnce({
        data: { questions: [{ question_id: 'Q1', status: 'feasible', issues: [] }] },
      });

      await expect(preflightCampaign(request)).resolves.toEqual({
        questions: [{ question_id: 'Q1', status: 'feasible', issues: [] }],
      });
      expect(mockedApi.post).toHaveBeenCalledWith('/api/evaluation/campaigns/preflight', request);
    } finally {
      mockedApi.post.mockReset();
    }
  });

  it('creates and inspects durable evaluation jobs', async () => {
    mockedApi.post
      .mockResolvedValueOnce({ data: { job_id: 'job-1', job_type: 'rerun' } })
      .mockResolvedValueOnce({ data: { job_id: 'job-1', status: 'cancelled' } });
    mockedApi.get
      .mockResolvedValueOnce({ data: [{ job_id: 'job-1', status: 'running' }] })
      .mockResolvedValueOnce({ data: { job_id: 'job-1', status: 'running' } })
      .mockResolvedValueOnce({ data: [{ attempt_id: 'attempt-1', status: 'failed' }] });

    const request = {
      scope: 'failed_only' as const,
      stages: 'execution_and_ragas' as const,
      question_ids: [],
      metric_names: [],
    };
    await createCampaignRerun('cmp-1', request);
    expect(mockedApi.post).toHaveBeenCalledWith(
      '/api/evaluation/campaigns/cmp-1/reruns',
      request,
    );

    await listCampaignJobs('cmp-1');
    expect(mockedApi.get).toHaveBeenCalledWith('/api/evaluation/campaigns/cmp-1/jobs');
    await getEvaluationJob('job-1');
    expect(mockedApi.get).toHaveBeenCalledWith('/api/evaluation/jobs/job-1');
    await listWorkItemAttempts('work-1');
    expect(mockedApi.get).toHaveBeenCalledWith('/api/evaluation/work-items/work-1/attempts');
    mockedApi.get.mockResolvedValueOnce({ data: { items: [{ job_item_id: 'item-1', work_item_id: 'work-1' }] } });
    await listEvaluationJobItems('job-1');
    expect(mockedApi.get).toHaveBeenCalledWith('/api/evaluation/jobs/job-1/items');
    await cancelEvaluationJob('job-1');
    expect(mockedApi.post).toHaveBeenCalledWith('/api/evaluation/jobs/job-1/cancel');
  });

  it('fetches campaign research analytics endpoints', async () => {
    mockedApi.get
      .mockResolvedValueOnce({
        data: {
          campaign_id: 'cmp-1',
          overview: { campaign_id: 'cmp-1', sample_count: 3 },
          runs: { campaign_id: 'cmp-1', runs: [{ run_id: 'run-1' }] },
          mode_comparison: { campaign_id: 'cmp-1', rows: [{ mode: 'naive' }] },
          question_comparison: { campaign_id: 'cmp-1', rows: [{ question_id: 'Q1' }] },
          cost_latency: { campaign_id: 'cmp-1', rows: [{ run_id: 'run-1' }] },
          router_analysis: {
            campaign_id: 'cmp-1',
            analysis_type: 'retrospective',
            rows: [{ selected_mode: 'naive' }],
          },
          ablation: { campaign_id: 'cmp-1', rows: [{ condition_id: 'baseline' }] },
          human_vs_auto: { campaign_id: 'cmp-1', rows: [{ run_id: 'run-1' }] },
          human_queue: { campaign_id: 'cmp-1', rows: [] },
          errors: { campaign_id: 'cmp-1', rows: [] },
        },
      })
      .mockResolvedValueOnce({ data: { campaign_id: 'cmp-1', sample_count: 3 } })
      .mockResolvedValueOnce({ data: { campaign_id: 'cmp-1', runs: [{ run_id: 'run-1' }] } })
      .mockResolvedValueOnce({ data: { campaign_id: 'cmp-1', rows: [{ mode: 'naive' }] } })
      .mockResolvedValueOnce({ data: { campaign_id: 'cmp-1', rows: [{ question_id: 'Q1' }] } })
      .mockResolvedValueOnce({ data: { campaign_id: 'cmp-1', rows: [{ run_id: 'run-1' }] } })
      .mockResolvedValueOnce({
        data: { campaign_id: 'cmp-1', analysis_type: 'retrospective', rows: [{ selected_mode: 'naive' }] },
      })
      .mockResolvedValueOnce({ data: { campaign_id: 'cmp-1', rows: [{ condition_id: 'baseline' }] } })
      .mockResolvedValueOnce({ data: { campaign_id: 'cmp-1', rows: [{ run_id: 'run-1' }] } });

    expect(await getCampaignAnalyticsDashboard('cmp-1')).toEqual(
      expect.objectContaining({
        campaign_id: 'cmp-1',
        overview: { campaign_id: 'cmp-1', sample_count: 3 },
        runs: { campaign_id: 'cmp-1', runs: [{ run_id: 'run-1' }] },
      })
    );
    expect(mockedApi.get).toHaveBeenNthCalledWith(1, '/api/evaluation/campaigns/cmp-1/analytics-dashboard');

    expect(await getCampaignOverview('cmp-1')).toEqual({ campaign_id: 'cmp-1', sample_count: 3 });
    expect(mockedApi.get).toHaveBeenNthCalledWith(2, '/api/evaluation/campaigns/cmp-1/overview');

    expect(await getCampaignRuns('cmp-1')).toEqual({
      campaign_id: 'cmp-1',
      runs: [{ run_id: 'run-1' }],
    });
    expect(mockedApi.get).toHaveBeenNthCalledWith(3, '/api/evaluation/campaigns/cmp-1/runs');

    expect(await getModeComparison('cmp-1')).toEqual({
      campaign_id: 'cmp-1',
      rows: [{ mode: 'naive' }],
    });
    expect(mockedApi.get).toHaveBeenNthCalledWith(4, '/api/evaluation/campaigns/cmp-1/mode-comparison');

    expect(await getQuestionComparison('cmp-1')).toEqual({
      campaign_id: 'cmp-1',
      rows: [{ question_id: 'Q1' }],
    });
    expect(mockedApi.get).toHaveBeenNthCalledWith(5, '/api/evaluation/campaigns/cmp-1/question-comparison');

    expect(await getCostLatency('cmp-1')).toEqual({
      campaign_id: 'cmp-1',
      rows: [{ run_id: 'run-1' }],
    });
    expect(mockedApi.get).toHaveBeenNthCalledWith(6, '/api/evaluation/campaigns/cmp-1/cost-latency');

    expect(await getRouterAnalysis('cmp-1')).toEqual({
      campaign_id: 'cmp-1',
      analysis_type: 'retrospective',
      rows: [{ selected_mode: 'naive' }],
    });
    expect(mockedApi.get).toHaveBeenNthCalledWith(7, '/api/evaluation/campaigns/cmp-1/router-analysis');

    expect(await getAblationAnalysis('cmp-1')).toEqual({
      campaign_id: 'cmp-1',
      rows: [{ condition_id: 'baseline' }],
    });
    expect(mockedApi.get).toHaveBeenNthCalledWith(8, '/api/evaluation/campaigns/cmp-1/ablation');

    expect(await getHumanVsAuto('cmp-1')).toEqual({
      campaign_id: 'cmp-1',
      rows: [{ run_id: 'run-1' }],
    });
    expect(mockedApi.get).toHaveBeenNthCalledWith(9, '/api/evaluation/campaigns/cmp-1/human-vs-auto');

    mockedApi.get.mockResolvedValueOnce({
      data: {
        campaign_id: 'cmp-1',
        rows: [{ run_id: 'run-1', message: 'Provider error details were redacted.' }],
      },
    });
    expect(await getCampaignErrors('cmp-1')).toEqual({
      campaign_id: 'cmp-1',
      rows: [{ run_id: 'run-1', message: 'Provider error details were redacted.' }],
    });
    expect(mockedApi.get).toHaveBeenNthCalledWith(10, '/api/evaluation/campaigns/cmp-1/errors');
  });

  it('posts export and human-evaluation requests to the new endpoints', async () => {
    mockedApi.post
      .mockResolvedValueOnce({
        data: {
          campaign_id: 'cmp-1',
          exported_at: '2026-07-08T00:00:00Z',
          export_options: { include_prompt_previews: true },
        },
      })
      .mockResolvedValueOnce({
        data: {
          run_id: 'run-1',
          rating_id: 'rating-1',
          rubric_version: 'v1',
        },
      });
    mockedApi.get.mockResolvedValueOnce({
      data: {
        campaign_id: 'cmp-1',
        rows: [{ run_id: 'run-1' }],
      },
    });

    expect(
      await exportCampaignAnalysis('cmp-1', {
        include_raw_trace_payloads: true,
        include_prompt_previews: false,
        include_full_prompts: false,
        include_answers: true,
        include_retrieved_excerpts: true,
        format: 'json',
      })
    ).toEqual({
      campaign_id: 'cmp-1',
      exported_at: '2026-07-08T00:00:00Z',
      export_options: { include_prompt_previews: true },
    });
    expect(mockedApi.post).toHaveBeenNthCalledWith(1, '/api/evaluation/campaigns/cmp-1/export', {
      include_raw_trace_payloads: true,
      include_prompt_previews: false,
      include_full_prompts: false,
      include_answers: true,
      include_retrieved_excerpts: true,
      format: 'json',
    });

    expect(await getHumanEvalQueue('cmp-1')).toEqual({
      campaign_id: 'cmp-1',
      rows: [{ run_id: 'run-1' }],
    });
    expect(mockedApi.get).toHaveBeenCalledWith('/api/evaluation/campaigns/cmp-1/human-eval-queue');

    expect(
      await postRunHumanRating('run-1', {
        rubric_version: 'v1',
        correctness_score: 0.9,
        faithfulness_score: 0.8,
        completeness_score: 0.7,
        citation_quality_score: 0.95,
        usefulness_score: 0.85,
        comments: 'Strong answer',
        is_blinded: true,
        shown_mode_label: false,
      })
    ).toEqual({
      run_id: 'run-1',
      rating_id: 'rating-1',
      rubric_version: 'v1',
    });
    expect(mockedApi.post).toHaveBeenNthCalledWith(2, '/api/evaluation/runs/run-1/human-ratings', {
      rubric_version: 'v1',
      correctness_score: 0.9,
      faithfulness_score: 0.8,
      completeness_score: 0.7,
      citation_quality_score: 0.95,
      usefulness_score: 0.85,
      comments: 'Strong answer',
      is_blinded: true,
      shown_mode_label: false,
    });
  });

  it('fetches run-level research detail endpoints', async () => {
    mockedApi.get
      .mockResolvedValueOnce({ data: { run_id: 'run-1', campaign_id: 'cmp-1', trace_events: [] } })
      .mockResolvedValueOnce({ data: { run_id: 'run-1', campaign_id: 'cmp-1', trace_events: [] } })
      .mockResolvedValueOnce({ data: { run_id: 'run-1', campaign_id: 'cmp-1', retrieval_events: [] } })
      .mockResolvedValueOnce({ data: { run_id: 'run-1', campaign_id: 'cmp-1', context_packs: [] } })
      .mockResolvedValueOnce({ data: { run_id: 'run-1', campaign_id: 'cmp-1', llm_calls: [] } })
      .mockResolvedValueOnce({ data: { run_id: 'run-1', campaign_id: 'cmp-1', claims: [] } })
      .mockResolvedValueOnce({
        data: { run_id: 'run-1', campaign_id: 'cmp-1', total_tokens: 21, latency_ms: 50, derived_metrics: {} },
      })
      .mockResolvedValueOnce({
        data: {
          run_id: 'run-1',
          baseline_run_id: 'run-0',
          campaign_id: 'cmp-1',
          baseline_campaign_id: 'cmp-1',
          token_delta: 3,
          latency_delta_ms: 4,
          comparable: true,
          comparison_scope: 'same_campaign_question',
          answer_changed: false,
          answer_change_status: 'unchanged',
          derived_metric_delta: {},
        },
      });

    expect(await getRunDetail('cmp-1', 'run-1')).toEqual({
      run_id: 'run-1',
      campaign_id: 'cmp-1',
      trace_events: [],
    });
    expect(mockedApi.get).toHaveBeenNthCalledWith(
      1,
      '/api/evaluation/campaigns/cmp-1/runs/run-1/observability'
    );

    expect(await getRunTrace('run-1')).toEqual({
      run_id: 'run-1',
      campaign_id: 'cmp-1',
      trace_events: [],
    });
    expect(mockedApi.get).toHaveBeenNthCalledWith(2, '/api/evaluation/runs/run-1/trace');

    expect(await getRunRetrieval('run-1')).toEqual({
      run_id: 'run-1',
      campaign_id: 'cmp-1',
      retrieval_events: [],
    });
    expect(mockedApi.get).toHaveBeenNthCalledWith(3, '/api/evaluation/runs/run-1/retrieval');

    expect(await getRunContext('run-1')).toEqual({
      run_id: 'run-1',
      campaign_id: 'cmp-1',
      context_packs: [],
    });
    expect(mockedApi.get).toHaveBeenNthCalledWith(4, '/api/evaluation/runs/run-1/context');

    expect(await getRunLlmCalls('run-1')).toEqual({
      run_id: 'run-1',
      campaign_id: 'cmp-1',
      llm_calls: [],
    });
    expect(mockedApi.get).toHaveBeenNthCalledWith(5, '/api/evaluation/runs/run-1/llm-calls');

    expect(await getRunClaims('run-1')).toEqual({
      run_id: 'run-1',
      campaign_id: 'cmp-1',
      claims: [],
    });
    expect(mockedApi.get).toHaveBeenNthCalledWith(6, '/api/evaluation/runs/run-1/claims');

    expect(await getRunMetrics('run-1')).toEqual({
      run_id: 'run-1',
      campaign_id: 'cmp-1',
      total_tokens: 21,
      latency_ms: 50,
      derived_metrics: {},
    });
    expect(mockedApi.get).toHaveBeenNthCalledWith(7, '/api/evaluation/runs/run-1/metrics');

    expect(await getRunDiff('run-1', 'run-0')).toEqual({
      run_id: 'run-1',
      baseline_run_id: 'run-0',
      campaign_id: 'cmp-1',
      baseline_campaign_id: 'cmp-1',
      token_delta: 3,
      latency_delta_ms: 4,
      comparable: true,
      comparison_scope: 'same_campaign_question',
      answer_changed: false,
      answer_change_status: 'unchanged',
      derived_metric_delta: {},
    });
    expect(mockedApi.get).toHaveBeenNthCalledWith(8, '/api/evaluation/runs/run-1/diff', {
      params: { baseline_run_id: 'run-0' },
    });
  });

  it('streams campaign SSE events via fetch', async () => {
    const encoder = new TextEncoder();
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(
          encoder.encode(
            'event: campaign_snapshot\n' +
              'data: {"id":"cmp-1","status":"running","phase":"execution","config":{"test_case_ids":["Q1"],"modes":["naive"],"model_config":{"id":"cfg-1","name":"Balanced","model_name":"gemini","temperature":0.7,"top_p":0.95,"top_k":40,"max_input_tokens":8192,"max_output_tokens":2048,"thinking_mode":false,"thinking_budget":8192},"repeat_count":1,"batch_size":1,"rpm_limit":60,"ragas_batch_size":8,"ragas_parallel_batches":8,"ragas_rpm_limit":1000},"completed_units":0,"total_units":1,"evaluation_completed_units":0,"evaluation_total_units":0,"cancel_requested":false,"created_at":"2026-03-07T00:00:00+00:00","updated_at":"2026-03-07T00:00:00+00:00"}\n\n' +
              'event: campaign_completed\n' +
              'data: {"id":"cmp-1","status":"completed","phase":"evaluation","config":{"test_case_ids":["Q1"],"modes":["naive"],"model_config":{"id":"cfg-1","name":"Balanced","model_name":"gemini","temperature":0.7,"top_p":0.95,"top_k":40,"max_input_tokens":8192,"max_output_tokens":2048,"thinking_mode":false,"thinking_budget":8192},"repeat_count":1,"batch_size":1,"rpm_limit":60,"ragas_batch_size":8,"ragas_parallel_batches":8,"ragas_rpm_limit":1000},"completed_units":1,"total_units":1,"evaluation_completed_units":1,"evaluation_total_units":1,"cancel_requested":false,"created_at":"2026-03-07T00:00:00+00:00","completed_at":"2026-03-07T00:00:10+00:00","updated_at":"2026-03-07T00:00:10+00:00"}\n\n'
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

  it('ignores malformed and empty SSE payloads while still parsing failure events', async () => {
    const encoder = new TextEncoder();
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(
          encoder.encode(
            'event: campaign_progress\n' +
              'data:\n\n' +
              'event: campaign_progress\n' +
              'data: not-json\n\n' +
              'event: unknown_event\n' +
              'data: {"ignored":true}\n\n' +
              'event: campaign_failed\n' +
              'data: {"id":"cmp-1","status":"failed","phase":"evaluation","config":{"test_case_ids":["Q1"],"modes":["naive"],"model_config":{"id":"cfg-1","name":"Balanced","model_name":"gemini","temperature":0.7,"top_p":0.95,"top_k":40,"max_input_tokens":8192,"max_output_tokens":2048,"thinking_mode":false,"thinking_budget":8192},"repeat_count":1,"batch_size":1,"rpm_limit":60,"ragas_batch_size":8,"ragas_parallel_batches":8,"ragas_rpm_limit":1000},"completed_units":1,"total_units":1,"evaluation_completed_units":0,"evaluation_total_units":1,"cancel_requested":false,"error_message":"RAGAS failed","created_at":"2026-03-07T00:00:00+00:00","updated_at":"2026-03-07T00:00:10+00:00"}'
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

    expect(events).toEqual(['campaign_failed']);
  });

  it('parses granular SSE events with CRLF, preserves sequence metadata, and flushes EOF payloads', async () => {
    const encoder = new TextEncoder();
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(
          encoder.encode(
            'event: run_started\r\n' +
              'data: {"event_schema_version":"1.0","sequence":2,"campaign_id":"cmp-1","run_id":"run-1","span_id":"span-root","parent_span_id":null,"stage_type":"routing","stage_name":"Run started","status":"running","created_at":"2026-07-08T00:00:00Z","payload":{"question_id":"Q1"}}\r\n\r\n' +
              'event: unknown_event\r\n' +
              'data: {"ignored":true}\r\n\r\n' +
              'event: retrieval_completed\r\n' +
              'data: {"event_schema_version":"1.0","sequence":3,"campaign_id":"cmp-1","run_id":"run-1","span_id":"span-retrieval","parent_span_id":"span-root","stage_type":"retrieval","stage_name":"Retrieval","status":"success","created_at":"2026-07-08T00:00:01Z","payload":{"retrieval_count":4}}'
          )
        );
        controller.close();
      },
    });
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response(body, { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    const events: Array<{ type: string; sequence?: number }> = [];
    await streamCampaign('cmp-1', (event) => {
      events.push({
        type: event.type,
        sequence: 'sequence' in event.data ? Number(event.data.sequence) : undefined,
      });
    });

    expect(events).toEqual([
      { type: 'run_started', sequence: 2 },
      { type: 'retrieval_completed', sequence: 3 },
    ]);
  });
});

