import type { AblationCondition } from '../../types/evaluation';

const REQUIREMENT_GUIDED_CONDITIONS: readonly AblationCondition[] = [
  {
    condition_id: 'v9-baseline',
    label: 'Requirement guidance off',
    mode: 'agentic-v9',
    ablation_flags: { requirement_guided_runtime: false },
  },
  {
    condition_id: 'v9-guided',
    label: 'Requirement guidance on',
    mode: 'agentic-v9',
    ablation_flags: { requirement_guided_runtime: true },
  },
];

export function buildRequirementGuidedConditions(): AblationCondition[] {
  return REQUIREMENT_GUIDED_CONDITIONS.map((condition) => ({
    ...condition,
    ablation_flags: condition.ablation_flags ? { ...condition.ablation_flags } : undefined,
  }));
}

export function getExpectedExecutionUnits(
  caseCount: number,
  repeatCount: number,
  modeCount: number,
  requirementGuided: boolean,
): number {
  const armCount = requirementGuided ? REQUIREMENT_GUIDED_CONDITIONS.length : modeCount;
  return Math.max(0, caseCount) * Math.max(0, repeatCount) * Math.max(0, armCount);
}
