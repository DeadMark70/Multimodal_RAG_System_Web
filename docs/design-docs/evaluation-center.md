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
