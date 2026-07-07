# Evaluation Center

## Purpose

Describe the evaluation UI as a first-class subsystem rather than a release note.

## Tab Layout

1. 題庫管理
2. 模型設定
3. 評估活動
4. 結果分析
5. Agent Trace

## Boundaries

- Page shell: `src/pages/EvaluationCenter.tsx`
- REST + SSE client: `src/services/evaluationApi.ts`
- Components:
  - `TestCaseManager`
  - `ModelConfigPanel`
  - `CampaignRunner`
  - `EvaluationResults`
  - `AgentTraceViewer`

## Runtime Rules

- Campaign progress is recovered from backend snapshots after reconnect.
- Agent traces are fetched from dedicated endpoints instead of bloating the base results payload.
- Evaluation stays separate from day-to-day chat, but shares auth/session and API-client infrastructure.

## Model-Aware Thinking Controls

- The model settings tab must not expose one generic reasoning control for every model.
- Backend discovery returns a per-model `thinking` capability object; the frontend maps it to one of three UI states: budget slider/presets, level segmented buttons, or unavailable.
- Saved presets and campaign snapshots carry normalized reasoning fields, which lets the campaign runner and results analysis display the exact setting used.
- UX goal: users should know before launching a campaign whether a preset is using budget, level, dynamic budget, or no reasoning control, and they should be able to audit that choice from history/results later.
