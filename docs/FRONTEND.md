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

## Chat UI Contract

- `Chat.tsx` now relies on the `Layout` content shell plus a local flex chain for height control; the page no longer uses a hard-coded viewport subtraction to size the desktop workspace.
- Desktop `/chat` now has three stable regions:
  - conversation history column
  - main message / Deep Research workspace
  - compact right rail with document scope, preset summary, and optional evaluation summary
- Desktop `/chat` now keeps the conversation rail and resource rail as page-local preferences backed by `localStorage` (`chat.leftRailCollapsed`, `chat.rightRailCollapsed`).
- Desktop rail collapse is animated via width/flex-basis transitions; the rails stay mounted so the main workspace expands smoothly instead of snapping.
- Desktop rail controls now live in the `PageHeader` action area instead of consuming space above the main benchmark/chat workspace.
- Full `SettingsPanel` no longer renders inline on the desktop right rail; it opens from a dedicated right-side drawer instead.
- `DocumentSelector.tsx` now supports a compact/sticky-header presentation for the desktop right rail while preserving the existing drawer/mobile usage.
- `AgenticBenchmarkPanel.tsx` now uses a tabbed workspace:
  - `執行狀態` combines task timeline and evaluation updates
  - `Trace 追蹤` isolates trace detail reading
  - `最終結果` is a dedicated report-reading tab and becomes the default tab once execution completes
  - the outer benchmark shell is visually lighter and avoids an extra framed container around the tabs/content area
- `DeepResearchPanel.tsx` now separates `Plan`, `Run`, and `Report` views:
  - plan editing remains inline
  - run view keeps progress in a single scroll region and auto-expands active tasks
  - report view shows a compact summary in-page and moves the full markdown report into a drawer
- `MarkdownContent.tsx` is the shared renderer for long-form research/benchmark markdown:
  - normalizes CRLF and paragraph-to-list boundaries before rendering
  - applies `remark-gfm` + `rehype-sanitize` with Chakra-based markdown styles
  - renders `[來源: ...]` tokens as low-contrast inline badges instead of raw distracting text
- `MessageBubble.tsx` now treats sources as collapsible secondary content and renders assistant/image content with explicit frame/border affordances.
- `BenchmarkResultTab.tsx`, `ResearchDetailModal.tsx`, and `ResearchStepsAccordion.tsx` reuse `MarkdownContent.tsx` for formal report/task-answer reading surfaces instead of ad hoc `ReactMarkdown`/plain-text rendering.
  - `ConversationSidebar.tsx` now renders lower-density button-like selectable rows with explicit keyboard support, a sticky search/new header, and hover-only thin scrollbars.

## Page Scroll Ownership

- `Layout.tsx` keeps the app shell fixed with `overflow="hidden"` on the content frame.
- Page-level routes that need long vertical content must provide their own scroll container (`flex={1} minH={0} overflowY="auto"`).
- `/knowledge`, `/evaluation`, and `/graph-demo` now keep `PageHeader` outside the scroll area and use page-owned scroll regions for the main content body.
- Regression coverage: `KnowledgeBase.test.tsx`, `EvaluationCenter.ui.test.tsx`, and `GraphDemo.test.tsx` assert these scroll-region containers exist.
- `/graph-demo` now keeps the per-document GraphRAG status list collapsed by default, shows status summary badges in the card header, and bounds the expanded list inside its own scroll region so large document sets do not push the graph canvas far below the fold.
- `KnowledgeGraph.tsx` now applies zoom-based level-of-detail rendering in 2D mode: low zoom suppresses labels and simplifies nodes, labels only appear at close zoom, and dense graphs disable arrowheads plus shorten force-simulation cooldown to reduce drag/zoom stutter.
- `GraphDemo.tsx` now lazy-mounts graph tabs so `ResearchFlow` does not initialize during first paint unless the user opens that tab.

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
