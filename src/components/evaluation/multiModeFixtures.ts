import type { CampaignMode, QuestionModeComparison } from '../../types/evaluation';
import type { QuestionDeltaRow } from './QuestionAnalysisTab';
import type { EvaluationRunOption } from './RunContextSelector';
import { completeFixture } from './researchSummaryFixtures';

export const fourModes: CampaignMode[] = ['naive', 'advanced', 'graph', 'agentic'];
export const fourModeRuns: EvaluationRunOption[] = ['Q1', 'Q2', 'Q10'].flatMap((questionId) =>
  fourModes.flatMap((mode) => [1, 2, 3].map((repeat) => ({
    runId: `${questionId}-${mode}-${repeat}`, campaignId: 'four-modes', questionId, mode, repeat,
  }))),
);
export function modeSample(mode: CampaignMode, overrides: Partial<QuestionModeComparison> = {}): QuestionModeComparison {
  return { mode, sample_count: 3, answer_correctness: 0.5, faithfulness: 0.8, answer_relevancy: 0.7,
    mean_latency_ms: 2000, mean_tokens: 1000, quality_status: 'complete', accounting_status: 'complete', ...overrides };
}
export const fourModeQuestions: QuestionDeltaRow[] = ['Q1', 'Q2', 'Q10'].map((questionId) => ({
  questionId, category: '跨文件比較', difficulty: 'hard', requiredModalities: ['text'],
  byMode: fourModes.map((mode, index) => modeSample(mode, {
    answer_correctness: questionId === 'Q2' && mode === 'graph' ? null : 0.5 + index * 0.1,
    quality_status: questionId === 'Q2' && mode === 'graph' ? 'partial' : 'complete',
    mean_latency_ms: 2000 + index * 1000,
  })),
  deltaCorrectness: 0.3, deltaFaithfulness: 0, deltaLatencyMs: 3000, deltaTokens: 0,
  ecrCorrectness: null, bestMode: 'agentic', evidenceCoverage: null, unsupportedClaimRatio: null,
}));
export const fourModeSummary = {
  ...completeFixture, campaign_id: 'four-modes', completed_run_count: 384, total_run_count: 384,
  sample_count: 384,
  modes: fourModes.map((mode) => ({ ...completeFixture.modes[0], mode, sample_count: 96,
    quality: Object.fromEntries(Object.entries(completeFixture.quality).map(([key, value]) => [key, { ...value, valid_samples: 96 }])),
  })),
};
