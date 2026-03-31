# FRONTEND

## Stack

- React 18 + TypeScript + Vite 7
- Chakra UI + Framer Motion
- TanStack Query 5 + Zustand 5
- Supabase Auth + shared Axios client + authenticated fetch SSE
- Vitest + Testing Library

## Runtime Shell

- App shell and routes: `src/App.tsx`
- Providers: Chakra, TanStack Query, `AuthProvider`
- Pages:
  - `/login`
  - `/signup`
  - `/forgot-password`
  - `/reset-password`
  - `/dashboard`
  - `/knowledge`
  - `/chat`
  - `/experiment`
  - `/evaluation`
  - `/graph-demo`

## Primary Product Areas

- Auth and account recovery
- Knowledge-base document management
- Chat and Deep Research execution
- GraphRAG workspace and maintenance
- Evaluation campaigns, results analysis, and agent traces
- Dashboard metrics and experiment comparison flows

## State Ownership

- `useSettingsStore`
  - persisted mode flags, official/custom presets, theme, and sidebar state
- `useSessionStore`
  - transient conversation UI, graph viewport state, selected PDF page, Deep Research task/session state
- `useUploadProgressStore`
  - batch upload progress, polling status, and per-document activity
- TanStack Query
  - server-state caching for documents, graph status, dashboard stats, conversations, and evaluation data

## Service Boundaries

- `src/services/api.ts`
  - shared Axios client, JWT injection, one-flight refresh retry, error normalization
- `src/services/networkPolicy.ts`
  - allowed API target enforcement for browser/runtime safety
- `src/services/pdfApi.ts`
  - knowledge-base and PDF file actions
- `src/services/ragApi.ts`
  - ask, ask stream, planning, execution, and Deep Research requests
- `src/services/conversationApi.ts`
  - conversation list/detail/message persistence
- `src/services/graphApi.ts`
  - graph status, data, rebuild/optimize, document retry/purge
- `src/services/evaluationApi.ts`
  - test cases, model presets, campaigns, results, traces, metrics, authenticated SSE
- `src/services/statsApi.ts`
  - dashboard summary data

## Evaluation UI Contract

- `TestCase` now includes:
  - `ground_truth_short`
  - `key_points`
  - `ragas_focus`
- `CampaignResult` mirrors those fields for executed samples.
- `CampaignMetricsResponse` now includes:
  - `available_metrics`
  - row-level `metric_values`
  - row-level `reference_source`
  - `summary_by_mode`
  - `summary_by_category`
  - `summary_by_focus`
- `EvaluationResults.tsx` uses a runtime metric selector instead of assuming only two fixed metrics.
- `EvaluationResults.tsx` renders wide results tables inside horizontal scroll containers instead of letting dense data overflow the page shell.
- `EvaluationResults.tsx` consolidates `Category / Difficulty / Question Delta` into a tabbed Delta / ECR analysis card and keeps ECR notes behind tooltip triggers instead of always-visible note columns.
- `TestCaseManager.tsx` now edits long-form answers, short-form answers, key points, and ragas focus metadata in one flow.

## Reliability-Critical Behaviors

- Chat and evaluation streams use authenticated `fetch` + manual SSE parsing rather than browser `EventSource`.
- Auth session fetch retries one refresh attempt before requests proceed without a token.
- `PASSWORD_RECOVERY` auth events redirect to `/reset-password` if the incoming URL lands elsewhere.
- Sign-out falls back from global revocation to local cleanup so stale tokens do not trap the UI in an authenticated state.
- Upload and graph pages expose active job state and polling-driven recovery instead of optimistic silent success.
- Evaluation results surface `reference_source` so fallback-to-long-answer cases are visible during debug.

## Focused Verification Surface

- Services: `src/services/*.test.ts`
- Hooks: `src/hooks/*.test.tsx`
- Auth/session recovery: page + context tests
- Evaluation UI: `src/pages/EvaluationCenter.ui.test.tsx` and component tests
- Persistence flow: `src/tests/PersistenceFlow.test.tsx`
- CI-equivalent checks:
  - `npm run lint:ci`
  - `npx tsc --noEmit`
  - `npx vitest run`
