# Public Self-Hosted P0 Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver truthful Chat citations, application/session resilience, formal health probes, validated SSE recovery, and minimal public-ingress hardening for the single-user Docker deployment.

**Architecture:** The browser continues to enter through frontend Nginx on host port `3000`; Nginx proxies same-origin API and SSE traffic to FastAPI on the Docker network. FastAPI owns health, audit, auth attribution, and citation truth, while React owns session-expiry, Error Boundary, SSE validation, and connection UX.

**Tech Stack:** React 18, TypeScript 5.9, Chakra UI, Axios, Supabase JS, Zod 4.3.5, Vitest, FastAPI, Pydantic, pytest, Nginx, Docker Compose.

## Global Constraints

- Public host port remains `3000`; frontend mapping is exactly `3000:80`.
- Backend host binding becomes exactly `127.0.0.1:8000:8000`; Nginx uses `backend:8000` on `rag-net`.
- `VITE_API_BASE_URL` remains `/`; browser API, PDF, and SSE traffic stays same-origin.
- `/health/live` performs no external calls; `/health/ready` uses lifespan state and returns only `status`.
- OCR warmup failure is degraded, not readiness-fatal.
- Citation `snippet` comes only from retrieved source text; placeholder answer text and fixed scores are forbidden.
- Citation `score` is a measured value in `0..1` or `null`; out-of-range and missing values become `null` rather than being clamped.
- SSE retry occurs only before the first valid event, for network/`502`/`503`/`504`, at most twice (`500 ms`, `1500 ms`, bounded jitter).
- `401`, `429`, other `4xx`, schema failures, aborts, and mid-stream failures are never automatically retried as generation.
- Audit logs omit query strings, request/response bodies, prompts, answers, filenames, snippets, JWTs, and Authorization headers.
- Nginx limits are 120 requests/minute burst 30 for general API, 12/minute burst 3 for generation, and 4/minute burst 1 for upload/OCR; API connections are capped at 10 and SSE at 3 per client address.
- Docker JSON logs rotate at `max-size: 10m`, `max-file: 5`.
- HTTPS remains out of scope and must stay documented as a confidentiality risk.
- Do not add Redis, SSE replay storage, `Last-Event-ID`, Prometheus, Sentry, or an audit database.
- Execute one implementation task at a time on backend `main` or frontend `master`; do not use parallel writers or feature worktrees.
- Every task uses TDD and ends in a focused commit on its repository's current main branch.
- Do not commit the existing untracked `Multimodal_RAG_System/.superpowers/brainstorm/` directory.
- The root `D:\flutterserver\docker-compose.yml` is not in a Git repository; edit and verify it in Task 12, then commit the matching deployment documentation in the frontend repository.
- Per user instruction, do not dispatch a review agent after every task. Dispatch one review agent after Task 6 and one final whole-change review agent after Task 12.

---

## Plan Set

1. [Backend Operability](2026-08-11-p0-backend-operability.md) — Tasks 1-2.
2. [Trustworthy Chat Citations](2026-08-11-p0-trustworthy-chat-citations.md) — Tasks 3-4.
3. [Frontend Session and Render Resilience](2026-08-11-p0-frontend-resilience.md) — Tasks 5-7.
4. [Validated SSE and Public Gateway](2026-08-11-p0-sse-public-gateway.md) — Tasks 8-12.

## Execution Order and Review Gates

- [ ] **Task 1:** Backend liveness/readiness API (`pdftopng` commit).
- [ ] **Task 2:** Request ID, auth attribution, and minimal audit log (`pdftopng` commit).
- [ ] **Task 3:** Retrieved-document citation builder and score propagation (`pdftopng` commit).
- [ ] **Task 4:** Frontend citation contract, evidence mapping, and OpenAPI pin (`Multimodal_RAG_System` commit).
- [ ] **Task 5:** Shared session refresh/expiration service and Axios retry (`Multimodal_RAG_System` commit).
- [ ] **Task 6:** Session-expired dialog and safe return-after-login (`Multimodal_RAG_System` commit).
- [ ] **Middle review gate:** Dispatch one review agent over Tasks 1-6 only. Validate findings locally, use `superpowers:receiving-code-review` before accepting changes, fix validated issues, rerun focused suites, and commit fixes to the owning main branch.
- [ ] **Task 7:** Root React Error Boundary (`Multimodal_RAG_System` commit).
- [ ] **Task 8:** Zod SSE schemas and protocol parser (`Multimodal_RAG_System` commit).
- [ ] **Task 9:** Bounded SSE retry and shared auth recovery (`Multimodal_RAG_System` commit).
- [ ] **Task 10:** Chat/Deep Research/Agentic disconnection UX (`Multimodal_RAG_System` commit).
- [ ] **Task 11:** Nginx rate/connection limits and stable 429 response (`Multimodal_RAG_System` commit).
- [ ] **Task 12:** Compose binding, healthcheck, log rotation, deployment docs, and full verification (`Multimodal_RAG_System` documentation commit; root Compose remains a verified deployment artifact).
- [ ] **Final review gate:** Dispatch one whole-change review agent across both repositories plus root Compose. Validate findings locally, fix only confirmed issues, rerun the full verification matrix, and commit fixes on the owning main branch.

## Required Verification Matrix

Backend (`D:\flutterserver\pdftopng`):

```powershell
python -m pytest tests/test_health_api.py tests/test_request_audit.py tests/test_chat_citations.py tests/test_rag_ask_stream.py tests/test_rag_filtering.py -q
python scripts/sync_openapi_artifacts.py --check
python -m pytest -q
```

Frontend (`D:\flutterserver\Multimodal_RAG_System`):

```powershell
npm test -- --run
npm run lint:ci
npx tsc --noEmit
npm run test:scripts
npm run contract:check
npm run docs:check
npm run docs:links
npm run build
```

Deployment host (`D:\flutterserver`, or the production equivalent):

```powershell
docker compose config
docker compose build frontend backend
docker compose up -d
docker compose ps
```

Manual acceptance uses the deployed public host without recording its IP in Git:

```text
GET  http://<public-host>:3000/health/live   -> 200 {"status":"live"}
GET  http://<public-host>:3000/health/ready  -> 200 {"status":"ready"}
GET  http://<public-host>:8000/health/live   -> connection refused/timed out
GET  http://127.0.0.1:8000/docs              -> reachable on the server only
```

## Commit Discipline

Before each task:

```powershell
git status --short --branch
```

Stage only files listed by that task, inspect `git diff --cached --check`, then use the exact commit subject from the task. If unrelated user changes appear, do not stage or rewrite them. The root Compose edit must be reported explicitly because it cannot be included in either nested repository commit.
