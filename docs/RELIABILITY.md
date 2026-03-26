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

## Operational Checks

- `npm run lint:ci`
- `npx tsc --noEmit`
- `npx vitest run`
