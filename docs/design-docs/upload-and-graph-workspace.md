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

## Design Rules

- Document operations must surface active processing state until the backend settles.
- Graph maintenance actions expose job state, retry, and purge instead of hiding failures behind aggregate counters.
- PDF opening/downloading must go through authenticated API calls rather than unauthenticated direct URLs.
