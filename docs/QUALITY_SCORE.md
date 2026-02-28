# QUALITY_SCORE

## Goal

Track practical quality and reliability signals for frontend behavior.

## Suggested Scorecard

| Dimension | Signal | Method |
|---|---|---|
| Contract validity | frontend parse/shape failures | unit tests on service adapters |
| Streaming reliability | incomplete/corrupt SSE event rate | targeted hook tests |
| Session continuity | restored state after refresh | persistence integration tests |
| UX responsiveness | long-task navigation lag | manual smoke + profiling |
| Accessibility | keyboard and screen-reader parity | RTL checks + manual audit |

## Current State

- Hook and service tests exist in `src/hooks` and `src/services`.
- Deep research flow has explicit phases and cancel handling.

## Next Up

1. Add repeatable SSE fixture-based regression cases.
2. Track error-class counts in CI test summaries.
3. Add manual checklist for auth and chat recovery flows.

