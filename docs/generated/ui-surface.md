# Generated UI Surface

Human-maintained inventory of the current frontend surface.

## Routes

| Route | Page | Main hooks / stores | Main services |
|---|---|---|---|
| `/login` | `Login.tsx` | `AuthProvider` context | `supabase` |
| `/signup` | `Signup.tsx` | `AuthProvider` context | `supabase` |
| `/forgot-password` | `ForgotPassword.tsx` | `AuthProvider` context | `supabase` |
| `/reset-password` | `ResetPassword.tsx` | `AuthProvider` context | `supabase` |
| `/dashboard` | `Dashboard.tsx` | `useDashboardStats` | `statsApi.ts` |
| `/knowledge` | `KnowledgeBase.tsx` | `useDocuments`, `useUploadProgressStore` | `pdfApi.ts` |
| `/chat` | `Chat.tsx` | `useChat`, `useDeepResearch`, `useAgenticBenchmarkResearch`, `useConversationMutations`, selector-based `useSettingsStore` hooks, selector-based `useSessionStore` hooks | `ragApi.ts`, `conversationApi.ts` |
| `/experiment` | `Experiment.tsx` | page-local state | `ragApi.ts` |
| `/evaluation` | `EvaluationCenter.tsx` | TanStack Query + evaluation components | `evaluationApi.ts` |
| `/graph-demo` | `GraphDemo.tsx` | `useGraphData`, `useSessionStore` | `graphApi.ts` |

## Shared Stores

- `useSettingsStore`: persisted presets, mode flags, theme, sidebar, plus primitive selector hooks and derived runtime snapshots for chat/research hot paths
- `useSessionStore`: transient session and graph/chat workspace state, with primitive selector hooks for narrow subscriptions on current chat ID, PDF state, and research task state
- `useUploadProgressStore`: background upload/index progress

## Shared Services

- `api.ts`: auth injection, refresh retry, error normalization
- `networkPolicy.ts`: trusted-host allowlisting for API targets, token attachment, and markdown outbound links/images
- `supabase.ts`: Supabase client bootstrap with non-persistent browser session storage
- `conversationApi.ts`: conversation CRUD + messages
- `evaluationApi.ts`: evaluation REST + authenticated SSE
- `graphApi.ts`: graph status/data/maintenance + node-vector sync start/status polling
- `pdfApi.ts`: documents and PDF file actions
- `ragApi.ts`: ask, ask stream, research plan/execute
- `statsApi.ts`: dashboard metrics

## Build / Delivery Surface

- `vite.config.ts`
  - assigns stable `manualChunks` for `react-vendor`, `ui-vendor`, `graph-vendor`, `markdown-vendor`, and fallback `vendor`
  - now works with route-level lazy page boundaries from `App.tsx`, not only vendor splitting
  - keeps the existing 3D graph lazy chunk separate from the default chat/graph route path
- `nginx.conf`
  - now emits a CSP response header that constrains browser image/connect sources and forbids object embedding plus framing

## Chat Surface Snapshot

- `Chat.tsx`
  - is route-lazy from `App.tsx` and lazy-loads `DeepResearchPanel`, `AgenticBenchmarkPanel`, and `SettingsPanel` only when the active mode or drawer needs them
  - uses a fixed-height flex workspace inside the shared `Layout` shell instead of viewport subtraction math
  - keeps the main chat history as the primary scroll owner in ordinary chat mode
  - keeps desktop conversation/resource rails collapsible with page-local `localStorage` preferences (`chat.leftRailCollapsed`, `chat.rightRailCollapsed`)
  - animates rail collapse with width/flex-basis transitions instead of unmounting desktop rails
  - places desktop rail/settings controls in the page-header action area instead of above the main workspace
  - keeps the desktop right rail compact and opens `SettingsPanel` from a right drawer
  - compares preset state with `areRagSettingsEqual(...)` and selector snapshots instead of full-store subscription + `JSON.stringify(...)`
- `DocumentSelector.tsx`
  - supports compact right-rail rendering with sticky header + bounded document list
  - uses lighter text-link controls and thin hover scrollbars in the desktop rail
- `AgenticBenchmarkPanel.tsx`
  - replaces stacked accordions with `執行狀態 / Trace 追蹤 / 最終結果` tabs
  - auto-selects `最終結果` when benchmark execution reaches `complete`
  - removes the extra outer framed shell so the summary block becomes the visual starting point
- `BenchmarkStatusTab.tsx`
  - renders benchmark task progress as a timeline and merges evaluation updates into the same status workspace
  - removes redundant section eyebrow labels and uses a lighter empty state
- `BenchmarkTraceTab.tsx`
  - isolates trace inspection from the rest of the benchmark UI
- `BenchmarkResultTab.tsx`
  - gives the final report a dedicated reading layout
  - uses shared `MarkdownContent.tsx` so summary, detailed answer, and subtask answers render consistent markdown
- `DeepResearchPanel.tsx`
  - exposes `Plan`, `Run`, and `Report` view switching without changing `useDeepResearch` contracts
  - keeps completed tasks collapsed by default in run view while active tasks stay expanded
  - opens the full research report in a drawer instead of stretching the main page
  - uses shared `MarkdownContent.tsx` for the full report drawer, including markdown normalization and styled source tokens
- `MessageBubble.tsx`
  - renders assistant replies with a bordered surface
  - keeps citations behind a collapsible `來源` section
  - wraps markdown images in a framed zoomable preview affordance
  - blocks untrusted markdown image/link hosts instead of rendering active outbound targets
  - uses shared `MarkdownContent.tsx` for assistant markdown so chat/report list rendering and `[來源: ...]` styling stay aligned
- `ConversationSidebar.tsx`
  - uses focusable button-like conversation rows
  - keeps search and create controls in a sticky header
  - keeps research-detail and delete actions as secondary inline controls
  - uses lighter metadata styling and thin hover scrollbars to reduce density

## Shell Scroll Surface

- `Layout.tsx` provides a fixed shell (`overflow="hidden"`); route pages own vertical scrolling.
- `KnowledgeBase.tsx`
  - keeps `PageHeader` fixed in-page
  - uses `knowledge-base-scroll-region` as the page body scroll owner
- `EvaluationCenter.tsx`
  - keeps `PageHeader` fixed in-page
  - uses `evaluation-scroll-region` as the page body scroll owner
- `GraphDemo.tsx`
  - keeps `PageHeader` fixed in-page
  - uses `graph-demo-scroll-region` as the page body scroll owner
  - keeps the per-document GraphRAG status list collapsed by default and exposes summary badges plus an explicit expand/collapse action
  - bounds the expanded document list inside `graph-document-list-scroll-region` to prevent long lists from pushing the graph canvas off-screen
  - exposes manual legacy backfill control (`補齊節點嵌入`) wired to background sync start and status polling
  - displays node-vector sync progress and terminal state (`completed`/`failed`) from `/graph/node-vector/sync/status`
  - lazy-mounts the graph tabs so the hidden `ResearchFlow` panel does not initialize on first paint

## Evaluation Surface Snapshot

- `TestCaseManager.tsx`
  - imports/exports master datasets
  - edits `ground_truth`, `ground_truth_short`, `key_points`, and `ragas_focus`
- `EvaluationResults.tsx`
  - reads `available_metrics`
  - lets the user switch the active metric at runtime
  - renders grouped summaries by mode, category, and ragas focus
  - wraps dense tables in horizontal scroll containers to preserve layout on typical desktop widths
  - groups `Category / Difficulty / Question Delta` into a tabbed Delta / ECR explorer with sticky leading labels
  - hides ECR note strings behind tooltip triggers instead of permanent note columns
  - surfaces `reference_source` for correctness-debug workflows
- `StabilityChart.tsx`
  - now reads generic `metric_values` instead of only two hard-coded metrics

## Graph Rendering Snapshot

- `KnowledgeGraph.tsx`
  - defaults to 2D rendering and lazy-loads a 3D mode when the user toggles it on
  - keeps 2D and 3D graph data projections separate so dragged-node `fx/fy` pinning does not leak into the 3D simulation
  - applies zoom-tier level-of-detail rendering so labels appear only at close zoom
  - simplifies node drawing at low zoom and keeps hover labels as the fallback identification affordance
  - treats dense graphs as a special case by disabling link arrows and shortening force-simulation cooldown/warmup
  - uses orbit/hover/select behavior in 3D mode without camera fly-to or button-based zoom controls
