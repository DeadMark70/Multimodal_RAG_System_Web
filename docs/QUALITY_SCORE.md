# QUALITY_SCORE

## Goal

Track whether the frontend stays aligned with the current backend contracts and long-running UX expectations.

## Active Scorecard

| Dimension | What we watch | Current evidence |
|---|---|---|
| Contract validity | route/service/request-shape drift | service tests for PDF, RAG, graph, conversation, evaluation APIs |
| Streaming reliability | malformed or dropped SSE handling | `useChat`, `useDeepResearch`, and evaluation API tests |
| Session continuity | restore-after-refresh and auth recovery | persistence flow, auth page, and conversation hook tests |
| Operational UX | document/graph/evaluation maintenance visibility | KnowledgeBase, GraphDemo, EvaluationCenter UI tests |
| Accessibility safety | keyboard/menu/form behavior | RTL-based component and page coverage |

## Current State

- Auth, persistence, upload, graph, evaluation, and chat flows all have explicit test coverage.
- The highest-risk UI seams are streamed progress parsing, auth recovery, and maintenance-state polling.
- Full frontend acceptance remains:
  - `npm run lint:ci`
  - `npx tsc --noEmit`
  - `npx vitest run`

## Next Quality Investments

1. Keep expanding SSE fixture coverage as new event types appear.
2. Add a lightweight manual smoke checklist for dashboard, graph maintenance, and password recovery.
3. Keep generated UI-surface docs synced so tests and docs drift together less often.
