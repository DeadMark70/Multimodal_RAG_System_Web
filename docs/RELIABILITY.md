# RELIABILITY

## Reliability Objectives

1. Keep deep research runs cancellable and recoverable.
2. Prevent UI freezes during SSE-driven updates.
3. Keep state transitions explicit and testable.

## Main Reliability Mechanisms

- Abortable stream execution in `useDeepResearch`.
- Event-to-state mapping for each SSE type.
- Split persistent/transient state stores.
- Axios auth interceptor with centralized error handling.
- Selector hooks to reduce unnecessary re-renders.

## Error Classes

1. Network/provider failures
2. Contract or parse failures
3. Session/auth failures
4. User cancellation

## Recovery Strategy

- Surface explicit errors through toast + state.
- Preserve stable state artifacts when possible.
- Allow retry from planning/execution without full reload.
- Keep cancellation non-destructive.

## Operational Checks

- `npm run lint`
- `npm test`
- `npm run build`

