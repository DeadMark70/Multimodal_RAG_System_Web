# Requirement-guided v9 ablation UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a safe, fixed off/on requirement-guided A/B control to Evaluation Setup and submit reproducible `ablation_conditions` without changing backend runtime behavior.

**Architecture:** Keep the existing `CampaignRunner` flow and backend contract. Put the two immutable condition definitions and unit-count calculation in a small pure helper so request mapping and tests share one source of truth; the UI only toggles that preset and never edits arbitrary JSON.

**Tech Stack:** React, TypeScript, Chakra UI, Vitest, React Testing Library.

## Global Constraints

- Keep the existing baseline behavior unchanged when the toggle is off.
- Only support the fixed `agentic-v9` requirement-guided off/on pair.
- Do not modify backend schema, campaign engine, v9 runtime, or environment-variable parsing.
- Do not allow Naive k=4 or v9 shadow to be combined with this ablation.
- Do not add an LLM call or network request in the frontend.

---

### Task 1: Add pure ablation preset and unit-count helpers

**Files:**
- Create: `src/components/evaluation/requirementGuidedAblation.ts`
- Test: `src/components/evaluation/requirementGuidedAblation.test.ts`

**Interfaces:**
- Produces `REQUIREMENT_GUIDED_CONDITIONS: readonly AblationCondition[]` with `v9-baseline` false and `v9-guided` true.
- Produces `buildRequirementGuidedConditions(): AblationCondition[]`, returning fresh objects so UI state cannot mutate the preset.
- Produces `getExpectedExecutionUnits(caseCount: number, repeatCount: number, modeCount: number, requirementGuided: boolean): number`.

- [ ] **Step 1: Write failing tests**

```ts
it('builds exactly the off/on agentic-v9 conditions', () => {
  expect(buildRequirementGuidedConditions()).toEqual([
    expect.objectContaining({ condition_id: 'v9-baseline', mode: 'agentic-v9', ablation_flags: { requirement_guided_runtime: false } }),
    expect.objectContaining({ condition_id: 'v9-guided', mode: 'agentic-v9', ablation_flags: { requirement_guided_runtime: true } }),
  ]);
});

it('does not expose mutable preset objects', () => {
  const first = buildRequirementGuidedConditions();
  first[0].ablation_flags!.requirement_guided_runtime = true;
  expect(buildRequirementGuidedConditions()[0].ablation_flags!.requirement_guided_runtime).toBe(false);
});

it('counts two condition arms instead of selected modes', () => {
  expect(getExpectedExecutionUnits(16, 2, 4, true)).toBe(64);
  expect(getExpectedExecutionUnits(16, 2, 4, false)).toBe(128);
});
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run: `npm test -- --run src/components/evaluation/requirementGuidedAblation.test.ts`

Expected: FAIL because the helper module does not exist.

- [ ] **Step 3: Implement the minimal pure helpers**

Use the existing `AblationCondition` and `CampaignMode` types. `buildRequirementGuidedConditions` must deep-copy the two `ablation_flags` objects. `getExpectedExecutionUnits` must use `2` as the arm count when enabled and `modeCount` otherwise, then multiply by `caseCount` and `repeatCount`.

- [ ] **Step 4: Run the focused test and verify it passes**

Run: `npm test -- --run src/components/evaluation/requirementGuidedAblation.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/evaluation/requirementGuidedAblation.ts src/components/evaluation/requirementGuidedAblation.test.ts
git commit -m "feat(evaluation-ui): add requirement ablation preset"
```

### Task 2: Wire the preset into CampaignRunner state, UI, and payload

**Files:**
- Modify: `src/components/evaluation/CampaignRunner.tsx:214-240, 471-615, 688-860`
- Test: `src/components/evaluation/CampaignRunner.test.tsx`

**Interfaces:**
- Consumes `buildRequirementGuidedConditions` and `getExpectedExecutionUnits` from Task 1.
- Produces `CampaignCreateRequest.modes === ['agentic-v9']` and exactly two `ablation_conditions` when the toggle is enabled.

- [ ] **Step 1: Write failing UI/request tests**

Add tests that select the new `Requirement-guided v9 A/B` checkbox, submit the existing setup form, and assert:

```ts
expect(request.modes).toEqual(['agentic-v9']);
expect(request.ablation_conditions).toEqual([
  expect.objectContaining({ condition_id: 'v9-baseline', ablation_flags: { requirement_guided_runtime: false } }),
  expect.objectContaining({ condition_id: 'v9-guided', ablation_flags: { requirement_guided_runtime: true } }),
]);
```

Also assert that the default path omits `ablation_conditions`, the preview displays `2 × selected questions × repeat`, and Naive k=4 cannot be submitted with the new toggle.

- [ ] **Step 2: Run the focused tests and verify the new assertions fail**

Run: `npm test -- --run src/components/evaluation/CampaignRunner.test.tsx`

Expected: existing tests pass, new tests fail because the control and payload mapping are absent.

- [ ] **Step 3: Add state and toggle behavior**

Add `requirementGuidedAblation` defaulting to `false`. When enabled, set the selected mode to the agentic checkbox, set execution version to `v9`, clear Naive k=4, and render the two read-only condition rows. Keep the toggle off by default.

- [ ] **Step 4: Add validation and request mapping**

Before preflight, reject the toggle unless Agentic v9 is selected and reject any incompatible shadow/Naive k=4 combination with the existing toast path. Build `authoritativeModes` as `['agentic-v9']` for this experiment and spread `ablation_conditions` only when enabled. Keep the existing normal and Naive k=4 mapping unchanged when disabled.

- [ ] **Step 5: Add the expected-unit preview**

Render a small setup hint near repeat/batch controls using `getExpectedExecutionUnits(selectedCaseIds.length, repeatCount, selectedModes.length, requirementGuidedAblation)`. The hint must say which arm count is being used and must not alter the submitted `repeat_count`.

- [ ] **Step 6: Run the focused tests and verify they pass**

Run: `npm test -- --run src/components/evaluation/CampaignRunner.test.tsx`

Expected: PASS, including existing v9, shadow, and Naive k=4 tests.

- [ ] **Step 7: Commit**

```bash
git add src/components/evaluation/CampaignRunner.tsx src/components/evaluation/CampaignRunner.test.tsx
git commit -m "feat(evaluation-ui): expose requirement guided ablation"
```

### Task 3: Typecheck, lint, and regression verification

**Files:**
- Modify: none unless a test fixture needs the optional `ablation_conditions` field.

- [ ] **Step 1: Run the complete evaluation UI test suite**

Run: `npm test -- --run src/components/evaluation/CampaignRunner.test.tsx src/components/evaluation/requirementGuidedAblation.test.ts src/services/evaluationApi.test.ts`

Expected: PASS.

- [ ] **Step 2: Run TypeScript and lint checks**

Run: `npm run typecheck` and `npm run lint`

Expected: no new errors or warnings.

- [ ] **Step 3: Inspect the final diff**

Run: `git diff HEAD~2..HEAD --check` and verify that the only runtime/UI changes are the fixed A/B control, payload mapping, validation, preview, and tests.

- [ ] **Step 4: Commit any required fixture-only correction**

Only if the checks require a fixture update, commit it separately with `test(evaluation-ui): update ablation fixtures`; otherwise leave the working tree clean.

