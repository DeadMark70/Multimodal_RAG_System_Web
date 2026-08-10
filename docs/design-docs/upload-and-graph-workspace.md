# Upload And Graph Workspace

## Purpose

Describe the shared operational model behind Knowledge Base and Graph Workspace.

## Knowledge Base

- Main page: `src/pages/KnowledgeBase.tsx`
- API surface: `src/services/pdfApi.ts`
- Hooks/state:
  - `src/hooks/useDocuments.ts`
  - `src/stores/useUploadProgressStore.ts`

## Graph Workspace

- Main page: `src/pages/GraphDemo.tsx`
- API surface: `src/services/graphApi.ts`
- Hook layer: `src/hooks/useGraphData.ts`

### Source Evidence Navigation

- A Graph node click loads `GET /graph/nodes/{node_key}/evidence` for the current user and opens a page-local shared evidence drawer. The latest click wins, so a late response for an earlier node cannot replace the currently selected node's evidence or reset Graph zoom/simulation state. A compact native node selector and button provide the same operation to keyboard users without duplicating the graph UI.
- The drawer renders verified evidence first with its filename, page, quote, and provenance status. Only an owned anchor with `quote_match` verification may supply quoted evidence. An owned `not_checked` anchor or another owned node document may appear only as `相關來源文件`; stale, deleted, and foreign-user documents are excluded.
- Chat citations and Graph node evidence share the same controlled drawer and lazy source-viewer presentation, while each page owns its own navigation state. Closing the drawer returns focus to the exact Chat citation or Graph evidence control that opened it.
- The source viewer downloads PDFs through the authenticated API, opens the cited page, and highlights a valid normalized evidence rectangle when supplied. It keeps the selected quote visible on download/session errors and offers a browser fallback for a rendered authenticated blob when PDF previewing fails. Its eager page-local boundary contains lazy-module failures and offers close/retry without unmounting Graph state.

### Out Of Scope

- This feature preserves HTTP status on normalized API errors so the viewer can distinguish an expired session locally, but it does not alter global session-resilience behavior or SSE connection/recovery behavior. Those remain owned by their existing application-level flows.

## Design Rules

- Document operations must surface active processing state until the backend settles.
- Graph maintenance actions expose job state, retry, and purge instead of hiding failures behind aggregate counters.
- PDF opening/downloading must go through authenticated API calls rather than unauthenticated direct URLs.
