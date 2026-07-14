# RELIABILITY

## Reliability Objectives

1. Keep streamed chat, Deep Research, and evaluation flows observable and recoverable.
2. Prevent auth/session gaps from turning into false terminal failures.
3. Keep document and graph maintenance state visible until the backend settles.

## Main Mechanisms

- Abortable streaming in `useDeepResearch` and streamed ask handling in `useChat`
- Manual SSE parsing in chat and evaluation clients
- Split state ownership across settings, session, and upload-progress stores
- TanStack Query refetch/polling for documents, graph, and evaluation snapshots
- Bounded conversation summary/message pages and query caching keep first paint independent of total history size
- Evaluation overview and secondary tabs load independently so a slow analytics surface does not block the shell
- Axios auth interceptor plus one-flight token refresh retry
- `AuthProvider` redirect handling for `PASSWORD_RECOVERY`

## Known Failure Classes

1. Network and provider failures
2. SSE parse / contract drift
3. Session expiry or refresh gaps
4. User cancellation
5. Background maintenance jobs still running after an optimistic API response

## Recovery Rules

- Show explicit toast + inline status instead of silent failure.
- Preserve conversation metadata and mode snapshots so refresh restore remains possible.
- Let users retry planning, execution, indexing, graph extraction, and evaluation from surfaced controls.
- Treat cancellation as non-destructive and keep the last stable UI state visible.

## Evaluation Rerun Recovery

The Evaluation Center treats jobs and attempts as durable state rather than a single optimistic request. Refreshing the page discovers the newest job, loads all work-item attempts, and displays only sanitized latest errors. Failed or interrupted work can be retried by stage without erasing prior attempts; missing metrics remain missing instead of appearing as zero. Legacy servers that do not expose durable job routes are detected and use the compatibility rerun flow without repeated polling errors.

## Operational Checks

- `npm run lint:ci`
- `npx tsc --noEmit`
- `npx vitest run`
