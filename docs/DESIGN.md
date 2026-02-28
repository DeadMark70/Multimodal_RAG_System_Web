# DESIGN

## Intent

Document frontend architecture decisions and module boundaries.

## Core Decisions

1. Keep UI and API integration contract-first (`types/` + `services/`).
2. Keep persistent and transient state separated (`useSettingsStore` vs `useSessionStore`).
3. Use hook-driven orchestration (`hooks/useDeepResearch.ts`) instead of page-level logic blobs.
4. Keep API access centralized in `src/services/`.
5. Keep reliability guardrails explicit for streaming and high-frequency updates.

## Pointers

- Architecture details: `docs/design-docs/index.md`
- Existing stack notes: `conductor/tech-stack.md`
- Existing workflow rules: `conductor/workflow.md`
