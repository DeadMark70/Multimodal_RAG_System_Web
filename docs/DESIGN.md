# DESIGN

## Intent

Capture stable frontend architecture decisions, not release notes.

## Core Decisions

1. Keep routes/pages thin; orchestration belongs in hooks and services.
2. Keep browser-persisted settings separate from transient session state.
3. Centralize API traffic through `src/services/` so auth, target allowlisting, and error mapping stay consistent.
4. Treat streamed UX as first-class product behavior, not an optional enhancement.
5. Prefer durable design docs for major subsystems over expanding one giant overview file.

## Deep Dives

- `docs/design-docs/routing-and-session.md`
- `docs/design-docs/chat-and-research-streaming.md`
- `docs/design-docs/upload-and-graph-workspace.md`
- `docs/design-docs/evaluation-center.md`
