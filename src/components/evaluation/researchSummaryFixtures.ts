import type { CampaignResearchSummaryResponse } from '../../types/evaluation';

export const completeFixture: CampaignResearchSummaryResponse = {
  campaign_id: 'campaign-complete', research_schema_version: '2', completed_run_count: 4, total_run_count: 4, failed_run_count: 0,
  quality_status: 'complete', token_accounting_status: 'complete', pricing_status: 'complete', phase_attribution_status: 'complete', sample_count: 4,
  quality: {
    faithfulness: { value: 0.82, status: 'complete', valid_samples: 4, missing_samples: 0, failed_samples: 0, evaluator_model: 'ragas', metric_version: '0.2' },
    answer_correctness: { value: 0.9, status: 'complete', valid_samples: 4, missing_samples: 0, failed_samples: 0, evaluator_model: 'ragas', metric_version: '0.2' },
    answer_relevancy: { value: 0.88, status: 'complete', valid_samples: 4, missing_samples: 0, failed_samples: 0, evaluator_model: 'ragas', metric_version: '0.2' },
  },
  latency: { mean_ms: 4800, p50_ms: 3900, p95_ms: 7100, sample_count: 4, method: 'nearest_rank', low_sample_size: true },
  tokens: { input_tokens: 100, output_text_tokens: 40, reasoning_tokens: 20, other_tokens: 10, total_tokens: 170, by_phase: { execution: 150 }, accounting_status: 'complete', phase_attribution_status: 'partial' },
  execution_cost: { benchmark_usd: 0.12, operational_usd: 0.18, pricing_status: 'complete', priced_call_count: 4, unpriced_call_count: 0 },
  modes: [{ mode: 'agentic', sample_count: 4, comparable: true, not_comparable_reasons: [], quality: {
    faithfulness: { value: 0.82, status: 'complete', valid_samples: 4, missing_samples: 0, failed_samples: 0, evaluator_model: 'ragas', metric_version: '0.2' },
    answer_correctness: { value: 0.9, status: 'complete', valid_samples: 4, missing_samples: 0, failed_samples: 0, evaluator_model: 'ragas', metric_version: '0.2' },
    answer_relevancy: { value: 0.88, status: 'complete', valid_samples: 4, missing_samples: 0, failed_samples: 0, evaluator_model: 'ragas', metric_version: '0.2' },
  }, latency: { mean_ms: 4800, p50_ms: 3900, p95_ms: 7100, sample_count: 4, method: 'nearest_rank', low_sample_size: true }, tokens: { input_tokens: 100, output_text_tokens: 40, reasoning_tokens: 20, other_tokens: 10, total_tokens: 170, by_phase: { execution: 150 }, accounting_status: 'complete', phase_attribution_status: 'partial' }, execution_cost: { benchmark_usd: 0.12, operational_usd: 0.18, pricing_status: 'complete', priced_call_count: 4, unpriced_call_count: 0 } }],
  evaluation_overhead: { tokens: { input_tokens: 20, output_text_tokens: 10, reasoning_tokens: 5, other_tokens: 0, total_tokens: 35, by_phase: { ragas: 35 }, accounting_status: 'complete', phase_attribution_status: 'complete' }, cost_usd: 0.03, pricing_status: 'complete', evaluator_models: ['ragas'], metric_names: ['faithfulness'], batch_count: 1, retry_count: 2 }, warnings: [],
};

export const partialFixture: CampaignResearchSummaryResponse = {
  ...completeFixture,
  campaign_id: 'campaign-partial', quality_status: 'partial', token_accounting_status: 'partial', pricing_status: 'unknown', phase_attribution_status: 'not_available',
  quality: { ...completeFixture.quality, faithfulness: { ...completeFixture.quality.faithfulness, value: null, status: 'partial', valid_samples: 0, missing_samples: 4 } },
  tokens: { ...completeFixture.tokens, input_tokens: null, output_text_tokens: null, reasoning_tokens: null, other_tokens: null, total_tokens: null, by_phase: {}, accounting_status: 'partial', phase_attribution_status: 'not_available' },
  execution_cost: { ...completeFixture.execution_cost, benchmark_usd: null, operational_usd: null, pricing_status: 'unknown', priced_call_count: 0, unpriced_call_count: 4 },
  evaluation_overhead: { ...completeFixture.evaluation_overhead, cost_usd: null, pricing_status: 'unknown', retry_count: null },
};

export const mixedFixture: CampaignResearchSummaryResponse = {
  ...completeFixture,
  campaign_id: 'campaign-mixed',
  modes: [...completeFixture.modes, { ...completeFixture.modes[0], mode: 'graph', comparable: false, not_comparable_reasons: ['incomplete_quality'], execution_cost: { ...completeFixture.modes[0].execution_cost, benchmark_usd: null, operational_usd: null, pricing_status: 'unknown' } }],
};
