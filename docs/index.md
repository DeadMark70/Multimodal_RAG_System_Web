# Frontend Docs Index

Format direction:
- [OpenAI Harness Engineering](https://openai.com/zh-Hant/index/harness-engineering/)

## Read Order

1. `docs/FRONTEND.md`
2. `docs/generated/ui-surface.md`
3. `docs/design-docs/index.md`
4. `docs/product-specs/index.md`
5. `docs/exec-plans/index.md`
6. `docs/references/index.md`

## Current Product Surface

- Auth: login, signup, forgot-password, reset-password
- Dashboard: user stats and recent activity summary
- Knowledge Base: upload, open, translate, retry indexing, delete
- Chat: ordinary ask, streamed progress, Deep Research planning/execution, conversation restore
- Graph Workspace: graph status, optimize, rebuild, full rebuild, per-document retry/purge
- Evaluation Center: test cases, model presets, campaigns, results analysis, agent trace viewer

## Top-Level Guides

- `docs/DESIGN.md`: durable frontend architecture decisions
- `docs/FRONTEND.md`: current UI/runtime map
- `docs/PRODUCT_SENSE.md`: user-visible capabilities and boundaries
- `docs/RELIABILITY.md`: SSE, polling, restore, and failure recovery rules
- `docs/SECURITY.md`: auth/session and API-target protections
- `docs/QUALITY_SCORE.md`: current verification surface and quality signals
- `docs/PLANS.md`: how active/completed/debt documents are maintained

## Deep Dives

- Design docs: `docs/design-docs/index.md`
- Product specs: `docs/product-specs/index.md`
- Generated inventories: `docs/generated/ui-surface.md`
- Execution plans: `docs/exec-plans/index.md`
- References and archives: `docs/references/index.md`

## Maintenance Rule

1. If a route, tab, store contract, auth flow, or API integration changes, update `docs/FRONTEND.md` and `docs/generated/ui-surface.md` in the same change set.
2. If the change alters user-visible behavior, update the matching `docs/product-specs/*` doc before moving the work to completed plans.
3. Treat `conductor/` as reference/archive input, not the primary source of truth.
