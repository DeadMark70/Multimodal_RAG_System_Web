import { describe, expect, it } from 'vitest';
import * as requirementGuidedAblation from './requirementGuidedAblation';
import {
  buildRequirementGuidedConditions,
  getExpectedExecutionUnits,
} from './requirementGuidedAblation';

describe('requirement-guided ablation helpers', () => {
  it('builds exactly the off/on agentic-v9 conditions', () => {
    expect(buildRequirementGuidedConditions()).toEqual([
      expect.objectContaining({
        condition_id: 'v9-baseline',
        mode: 'agentic-v9',
        ablation_flags: { requirement_guided_runtime: false },
      }),
      expect.objectContaining({
        condition_id: 'v9-guided',
        mode: 'agentic-v9',
        ablation_flags: { requirement_guided_runtime: true },
      }),
    ]);
  });

  it('does not expose mutable preset objects', () => {
    const first = buildRequirementGuidedConditions();
    first[0].ablation_flags!.requirement_guided_runtime = true;

    expect(buildRequirementGuidedConditions()[0].ablation_flags!.requirement_guided_runtime).toBe(false);
  });

  it('keeps the preset definitions private to the helper module', () => {
    expect(requirementGuidedAblation).not.toHaveProperty('REQUIREMENT_GUIDED_CONDITIONS');
  });

  it('counts two condition arms instead of selected modes', () => {
    expect(getExpectedExecutionUnits(16, 2, 4, true)).toBe(64);
    expect(getExpectedExecutionUnits(16, 2, 4, false)).toBe(128);
  });
});
