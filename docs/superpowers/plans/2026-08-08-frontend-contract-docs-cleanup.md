# Frontend Contract and Documentation Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Verify frontend/backend OpenAPI drift without replacing handwritten TypeScript types, generate truthful UI/build documentation, remove two unmounted legacy evaluation components, validate Markdown links, and enforce all checks in frontend CI.

**Architecture:** Dependency-free Node `.mjs` tools expose testable parsing/rendering functions. The contract checker recomputes the backend semantic OpenAPI hash and compares the checked-out backend revision plus manifest hash with the existing TypeScript fixture. UI docs are generated from `src/App.tsx` and `vite.config.ts` inside bounded marker blocks. Vitest guards deleted legacy surfaces from returning.

**Tech Stack:** React, TypeScript, Vite, Vitest, Node.js built-ins, GitHub Actions, Markdown.

## Global Constraints

- Work only in `D:\flutterserver\Multimodal_RAG_System` on `master`; preserve unrelated files.
- Complete the backend plan first so the frontend pins the backend's final exact commit and semantic hash.
- Keep handwritten TypeScript API types. Do not install OpenAPI generators or add generated client/type output.
- Before test edits, read `superpowers:test-driven-development/writing-good-tests.md`; follow RED/GREEN/REFACTOR.
- Node scripts use built-in modules only and must work on Windows and GitHub's Linux runner.
- Local backend default is `..\pdftopng`; CI passes `contract-backend` explicitly.
- `--check` is read-only and reports every drift; `--write-pin` changes only the two pin fields in the existing fixture.
- Preserve prose outside generated Markdown markers and do not claim manual chunking unless `vite.config.ts` actually configures it.
- Commit only task-listed files and inspect staged paths before every commit.

---

### Task 1: Add backend OpenAPI semantic-hash and revision drift checking

**Files:**

- Create: `scripts/check-backend-openapi.mjs`
- Create: `scripts/check-backend-openapi.test.mjs`
- Modify: `src/test/fixtures/agenticV9ApiContract.ts`
- Modify: `src/types/evaluation.contract.test.ts`
- Modify: `package.json`

**Interfaces:**

- `canonicalizeJson(value)` recursively sorts object keys while preserving array order.
- `semanticSha256(schema)` hashes compact canonical UTF-8 JSON.
- `readBackendContract(backendPath)` reads `openapi.json`, `contracts/openapi-contract.json`, and `git rev-parse HEAD`.
- `readPinnedContract(fixtureSource)` extracts `backend_commit` and `openapi_sha256`.
- `replacePinnedContract(fixtureSource, contract)` changes only those two string literals.
- CLI modes: `--check` and `--write-pin`, with `--backend PATH`; default backend is sibling `../pdftopng`.

Check mode fails if the manifest hash does not match the recomputed semantic hash, the snapshot path is not `openapi.json`, the fixture hash differs, or the fixture commit differs. Diagnostics name each mismatched field. Write-pin mode first validates the backend manifest, then updates only the two fixture fields.

- [ ] Write Node tests first for recursive sorting, formatting-insensitive hashes, invalid manifests, pin parsing, bounded replacement, missing backend files, hash mismatch, and revision mismatch.
- [ ] RED: run `node --test scripts/check-backend-openapi.test.mjs`; expect module-not-found failure.
- [ ] Implement the pure helpers and CLI without third-party packages.
- [ ] Change the Vitest contract test to validate the pin's field shapes and exported contract structure, rather than duplicating old literal commit/hash values.
- [ ] Add package scripts `contract:check` and `contract:pin` that invoke the checker.
- [ ] After the backend plan's final commit, run `npm run contract:pin -- --backend ../pdftopng`, then `npm run contract:check -- --backend ../pdftopng`.
- [ ] GREEN: run Node tests and `npx vitest run src/types/evaluation.contract.test.ts`; expect pass.
- [ ] Stage only the five files and commit `ci: verify backend openapi contract drift`.

---

### Task 2: Generate truthful UI-route and build documentation

**Files:**

- Create: `scripts/sync-ui-surface.mjs`
- Create: `scripts/sync-ui-surface.test.mjs`
- Modify: `docs/generated/ui-surface.md`
- Modify: `docs/FRONTEND.md`
- Modify: `package.json`

**Interfaces:**

- `extractLazyPages(appSource)` maps lazy component names to page import paths.
- `extractRoutes(appSource)` returns path, page, and public/protected/redirect access.
- `detectBuildFacts(viteSource)` reports route-level lazy loading and whether `manualChunks` is configured.
- `replaceMarkerBlock(document, begin, end, generated)` preserves all outside prose.
- CLI modes: `--write` and `--check`.

Markers are `<!-- BEGIN GENERATED UI ROUTES -->`/`<!-- END GENERATED UI ROUTES -->` and `<!-- BEGIN GENERATED BUILD FACTS -->`/`<!-- END GENERATED BUILD FACTS -->`. Route output is sorted by source order and includes the public auth routes, protected app routes, and `/` redirect. Build output must say Vite default chunking is active when `manualChunks` is absent; it must never invent `graph-vendor`.

- [ ] Write Node tests using fixture strings for lazy imports, public/protected groups, redirect routes, absent/present manualChunks, marker preservation, duplicate/missing markers, and read-only drift.
- [ ] RED: run `node --test scripts/sync-ui-surface.test.mjs`; expect module-not-found failure.
- [ ] Implement the parser/renderers and insert exactly one block for routes and one for build facts.
- [ ] Correct all contradictory manualChunks/graph-vendor claims in `docs/FRONTEND.md`; describe actual route-level lazy imports and default Vite chunking.
- [ ] Add `docs:sync` and `docs:check` package scripts; `docs:sync` runs write mode and `docs:check` runs check mode.
- [ ] GREEN: run Node tests, `npm run docs:sync`, and `npm run docs:check`; expect pass and no second-run diff.
- [ ] Stage only the five files and commit `docs: generate frontend ui surface facts`.

---

### Task 3: Add deterministic frontend Markdown-link validation

**Files:**

- Create: `scripts/check-markdown-links.mjs`
- Create: `scripts/check-markdown-links.test.mjs`
- Modify: `package.json`

**Interfaces:** `walkMarkdown(root)`, `extractLocalLinks(markdown)`, `resolveLocalLink(source, target, root)`, `findBrokenLinks(root)`, and a zero-argument CLI.

Obtain the Markdown input set from `git ls-files -- '*.md'` so untracked drafts and the CI-only backend checkout are outside the gate. Skip fenced code, images, HTTP(S), mailto, bare anchors, `node_modules`, `dist`, coverage, and build output. Decode URL escapes, remove anchors for existence checks, reject repository escapes, sort output, and never use the network.

- [ ] Test valid relative/root links, anchors, escaped spaces, fences, external URLs, missing files, repository escapes, and ignored directories.
- [ ] RED: run `node --test scripts/check-markdown-links.test.mjs`; expect module-not-found failure.
- [ ] Implement actionable `source.md: broken-target` diagnostics and a `docs:links` package script.
- [ ] GREEN: run Node tests and `npm run docs:links`; repair only proven broken links rather than suppressing them.
- [ ] Inspect staged paths, then commit the three files and only directly repaired docs as `docs: validate frontend markdown links`.

---

### Task 4: Remove the two unmounted legacy evaluation components

**Files:**

- Create: `src/architecture/legacyEvaluationSurface.test.ts`
- Delete: `src/components/evaluation/EvaluationResults.tsx`
- Delete: `src/components/evaluation/EvaluationResults.test.tsx`
- Delete: `src/components/evaluation/AgentTraceViewer.tsx`
- Delete: `src/components/evaluation/AgentTraceViewer.test.tsx`

Do not delete shared evaluation APIs, models, hooks, or types. Production import search must remain empty before removal. The architecture test uses Node path/filesystem APIs and asserts both retired component source paths do not exist, preventing accidental reintroduction.

- [ ] Confirm there are no production imports with `rg -n "EvaluationResults|AgentTraceViewer" src --glob "!*.test.ts" --glob "!*.test.tsx"`; only self declarations/comments may appear.
- [ ] Add the architecture test before deletion.
- [ ] RED: run `npx vitest run src/architecture/legacyEvaluationSurface.test.ts`; expect both existence assertions to fail.
- [ ] Delete exactly the four legacy source/test files; leave shared dependencies intact.
- [ ] GREEN: run the architecture test, full `npm test -- --run`, `npm run lint:ci`, `npx tsc --noEmit`, and `npm run build`; all pass.
- [ ] Re-run the import search; expect no production references.
- [ ] Stage only the five named paths and commit `refactor: remove unmounted evaluation components`.

---

### Task 5: Correct frontend execution-plan indexes

**Files:**

- Modify: `docs/exec-plans/active/index.md`
- Modify: `docs/exec-plans/completed/index.md`
- Modify: `scripts/check-markdown-links.test.mjs`

The active index must stop pointing at the backend's old active performance-plan path. The completed index must link to `../../../../pdftopng/docs/exec-plans/completed/2026-07-evaluation-chat-loading-performance.md` with a clear cross-repository label.

- [ ] Add a real-index lifecycle assertion to the Markdown-link tests.
- [ ] RED: run the focused Node test; expect failure while the link is still under active.
- [ ] Move the index entry from active to completed and keep every unrelated plan entry unchanged.
- [ ] GREEN: run the focused Node test and `npm run docs:links`; expect pass.
- [ ] Stage only the two indexes and amended test; commit `docs: organize frontend execution plans`.

---

### Task 6: Enforce contract, docs, build, and tests in frontend CI

**Files:**

- Modify: `.github/workflows/no-external-api-test.yml`
- Modify: `package.json`
- Create: `scripts/frontend-workflow-contract.test.mjs`
- Modify: `README.md`

CI sequence: checkout frontend; set up the repository's supported Node version with npm cache; `npm ci`; lint; TypeScript check; Node script tests; Vitest; production build; UI-doc and Markdown-link checks; checkout `DeadMark70/multimodal-rag-translate` at `main` into `contract-backend`; then run OpenAPI check with `--backend contract-backend`. Keep the backend checkout after frontend source scans so it cannot pollute lint/docs traversal. Use `contents: read` and explicit timeouts.

- [ ] Write a Node workflow-contract test asserting lint, `tsc --noEmit`, Node script tests, Vitest, build, docs checks, backend repository/ref/path, and contract check are present in order.
- [ ] RED: run `node --test scripts/frontend-workflow-contract.test.mjs`; expect assertions to fail against current CI.
- [ ] Add `test:scripts` to run every `scripts/*.test.mjs`; wire all required commands into CI and document canonical local verification commands in README.
- [ ] GREEN: run the workflow test and all Node script tests; expect pass.
- [ ] Stage only the four files and commit `ci: enforce frontend contract and docs drift`.

---

### Task 7: Final frontend verification

**Files:** Modify generated UI docs or contract pin only if their write modes report drift.

- [ ] Run `npm run contract:check -- --backend ../pdftopng`, `npm run docs:check`, and `npm run docs:links`; all exit 0.
- [ ] Run `npm run lint:ci`, `npx tsc --noEmit`, `npm run test:scripts`, `npm test -- --run`, and `npm run build`; all exit 0.
- [ ] Run `git diff --check`, inspect `git status --short`, and scan tracked files for common OpenAI/Google/AWS key patterns; expect no new secret-like value.
- [ ] Confirm `EvaluationResults` and `AgentTraceViewer` have no production references and both deleted source paths remain absent.
- [ ] If a write command was required, commit only its declared artifact as `docs: refresh frontend generated surfaces`.
- [ ] Record the checked backend revision and hash in the handoff; explicitly state that handwritten TypeScript types remain authoritative and no type generator was introduced.
