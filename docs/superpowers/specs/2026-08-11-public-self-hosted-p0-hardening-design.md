# Public Self-Hosted P0 Hardening

**Status:** Design approved; implementation pending final confirmation
**Date:** 2026-08-11
**Scope:** `Multimodal_RAG_System` frontend, `pdftopng` backend, and the shared root Docker Compose deployment

## Objective

Harden the current single-user, publicly reachable deployment without introducing
infrastructure intended for a multi-node service.

The release must:

- recover clearly from React render failures and expired Supabase sessions;
- make Chat citations truthful and navigable through the existing shared Source
  Viewer;
- expose formal liveness and readiness probes;
- validate SSE messages at runtime and report disconnections with bounded retry;
- place simple abuse protection at the public Nginx entry point;
- record a minimal, privacy-conscious request audit trail.

## Deployment Context

The production host publishes:

- frontend container port `80` as host port `3000`;
- backend container port `8000` as host port `8000`;
- only host port `3000` through the machine firewall/router to the public network.

The frontend is built with `VITE_API_BASE_URL=/`, so browser API, PDF, and SSE
requests can use the public frontend origin and be proxied by Nginx over the Docker
network to `backend:8000`.

The target topology is:

```text
public browser -> host :3000 -> frontend Nginx :80 -> backend:8000
                                      |                 (Docker network)
                                      +-> React assets

server-local diagnostics -> 127.0.0.1:8000 -> backend:8000
```

The root Compose file keeps `3000:80` for the frontend and changes the backend
binding from `8000:8000` to `127.0.0.1:8000:8000`. This preserves local Swagger
and diagnostics while removing LAN/public binding as a defense-in-depth measure.
If local direct access is later unnecessary, the backend binding may be replaced
with internal-only `expose: 8000`.

## Design Principles

- Keep Nginx as the only public application entry point.
- Use existing FastAPI, React, Supabase, and Docker mechanisms where possible.
- Fail closed when citation provenance is incomplete; never invent precision.
- Retry only when it cannot duplicate visible or billable generation work.
- Log metadata needed for operations, never user prompts or source content.
- Prefer bounded in-process behavior over Redis, replay stores, or new services.

## Non-Goals

This release does not add:

- HTTPS certificates, a domain, DDNS, VPN, or Tailscale;
- Redis or distributed rate limiting;
- persistent SSE event replay, `Last-Event-ID`, or cross-process recovery;
- a centralized audit database, Prometheus, Sentry, or a log shipping service;
- automatic retries after a stream has emitted valid progress;
- new citation-ranking or confidence-scoring models;
- changes to Supabase's own authentication rate limiting.

Public HTTP remains a documented risk: session tokens, prompts, and returned
content are not encrypted in transit. The work below improves application
resilience and abuse resistance but does not remove that transport risk.

## Component Boundaries

### Frontend Nginx

Nginx owns:

- the public `:3000` entry point through the host port mapping;
- same-origin proxying to backend routes;
- per-client request and connection limits;
- SSE proxy settings;
- propagation of a request ID and the direct client address.

It does not inspect JWTs or store application audit records.

### FastAPI backend

FastAPI owns:

- `/health/live` and `/health/ready`;
- request-ID validation and response propagation;
- minimal structured audit logs;
- authenticated user attribution;
- trustworthy Chat citation construction;
- the authoritative SSE payload contract.

### React frontend

React owns:

- the root Error Boundary;
- session-expiration notification and return navigation;
- runtime SSE parsing and schema validation;
- connection/retry/disconnection presentation;
- adapting Chat citations into the shared evidence drawer and Source Viewer.

## Health Endpoints

### `GET /health/live`

Liveness reports only whether the FastAPI process can serve a request.

- `200 {"status":"live"}` while the process is running;
- no external provider calls;
- no configuration, model, filesystem, or dependency details.

Docker uses liveness for the backend container healthcheck. Temporary Supabase or
model-provider failures must not cause container restart loops.

### `GET /health/ready`

Readiness is backed by explicit lifespan state, initially false and set true only
after these critical startup steps complete:

- base runtime directories are available;
- the Supabase client is created;
- the evaluation database is initialized;
- RAG core initialization completes.

Shutdown sets readiness false before draining. The endpoint returns:

- `200 {"status":"ready"}` when ready;
- `503 {"status":"not_ready"}` otherwise.

PDF OCR GPU warmup remains non-fatal. Its failure is logged as degraded capability
but does not make unrelated API routes permanently unavailable. Readiness does not
run a live LLM request or a remote database query on every probe.

## Trustworthy Chat Citation Contract

The current ordinary Chat path fabricates `snippet` from the generated answer and
uses placeholder scores. That behavior is removed.

The shared wire contract becomes:

```ts
interface Citation {
  doc_id: string;
  filename: string | null;
  page: number | null;
  snippet: string | null;
  score: number | null;
  bbox?: [number, number, number, number] | null;
}
```

Rules:

1. Citations are built only from documents/chunks returned by the retrieval path.
2. `snippet` is the retrieved chunk's source text, never generated answer text.
3. `score` is an actual retrieval or reranker score normalized to `0..1`; if no
   trustworthy score exists it is `null`.
4. `filename`, `page`, and optional normalized `bbox` come from source metadata.
5. Entries are deduplicated by document, page, and snippet while preserving
   retrieval order.
6. If only a source document ID is known, the response may include a source-only
   row with all unsupported provenance fields set to `null`.
7. No separate `verified: true` flag is added. The frontend derives provenance
   status from the actual fields so a stale boolean cannot overstate evidence.

The frontend mapping uses:

- `full` when an exact source region can be shown safely;
- `partial` when source text and page are available without a safe region;
- `source_only` when the original passage cannot be established.

The existing shared evidence drawer and PDF viewer remain the presentation layer.
A missing bbox falls back to page-level navigation; a missing page opens the
document without pretending to know a location.

## Session Expiration

Axios requests and SSE fetches share one session-recovery policy:

1. A `401` may trigger one Supabase refresh attempt.
2. If refresh succeeds, the original request is retried once with the new token.
3. A second `401` or failed refresh emits one application-level
   `session-expired` notification and clears the local session.
4. Concurrent failures share the same in-flight refresh promise and must not show
   repeated dialogs.

The Auth layer distinguishes expiration from a deliberate sign-out. On expiration
it stores only the current relative route, displays a blocking but concise prompt,
and sends the user to login after confirmation. A successful login returns to the
saved internal route. External return URLs are rejected.

The implementation does not persist request bodies or automatically replay work
after a new login.

## Global Error Boundary

A root React Error Boundary wraps the application shell and lazy routes. It catches
render and module-loading failures and shows a safe fallback with:

- **Reload application**;
- **Return home**.

It logs the technical error to the browser console for local diagnosis but never
renders a stack trace, token, or internal data. Existing Source Viewer/PDF local
boundaries remain in place so a viewer failure does not replace Chat or Graph.
Network and API errors continue through normal page/toast state rather than being
converted into full-page failures.

## SSE Runtime Validation and Recovery

Zod is added as a direct frontend dependency and defines separate schemas for:

- Chat stream events;
- Deep Research stream events;
- Agentic stream events.

The common parser validates the event name, JSON payload, event-specific required
fields, and terminal `complete` or `error` behavior. Unknown event types, malformed
JSON, invalid payloads, and EOF without a terminal event become typed protocol or
disconnection errors rather than unchecked TypeScript casts.

The connection state exposed to the UI is:

```text
connecting -> connected -> complete
           -> reconnecting -> connected
           -> disconnected
```

Retry policy:

- retry only network failures and HTTP `502`, `503`, or `504`;
- retry only when zero valid SSE events have been delivered;
- at most two automatic retries, approximately `500 ms` then `1500 ms`, with
  bounded jitter;
- never automatically retry `401`, `429`, other `4xx`, schema errors, or an
  explicitly aborted request;
- after any valid progress, a broken stream shows a disconnection message and a
  manual **Run again** action instead of silently duplicating generation work.

The UI must distinguish cancellation, server-reported errors, rate limiting,
protocol errors, and transport disconnection. This release intentionally omits
server-side replay and resume IDs.

## Edge Rate Limiting

Nginx uses `$binary_remote_addr` and built-in `limit_req`/`limit_conn` zones.
Initial limits are intentionally generous for one legitimate user:

| Route class | Limit | Burst |
| --- | ---: | ---: |
| General application API | 120 requests/minute | 30 |
| RAG, research, agentic, multimodal generation | 12 requests/minute | 3 |
| PDF/image upload and OCR start | 4 requests/minute | 1 |

Additional constraints:

- at most 10 concurrent API connections per client address;
- at most 3 concurrent SSE connections per client address;
- `429` responses use the API JSON error shape and include `Retry-After`;
- health probes do not consume the expensive-generation budget;
- current SSE buffering/timeouts remain disabled/extended as required.

These constants live together in the Nginx configuration with comments. They are
not made dynamically configurable in the first release because templating Nginx
configuration would add complexity without a current operational need.

Supabase login traffic is sent directly from the browser to Supabase and is not
covered by these zones.

## Minimal Audit Logging

The existing request-ID middleware is extended into a single request lifecycle
middleware. Each completed FastAPI request emits one structured record containing:

```text
event=http_request
request_id
method
normalized_path
status
duration_ms
client_ip
hashed_user_id
```

Rules:

- log the route/path without query parameters;
- never log headers, Authorization, JWTs, request/response bodies, prompts,
  answers, source quotes, filenames, or snippets;
- hash the authenticated user UUID and retain only a short stable prefix;
- use `anonymous` when no authenticated user was resolved;
- accept an incoming request ID only when it contains safe characters and is no
  longer than 64 characters; otherwise generate a UUID;
- take the client address from Nginx's proxy header only because backend ingress
  is restricted to Docker networking and server loopback.

The authentication dependency records the resolved user on request state so the
middleware does not decode JWTs a second time. Nginx-limited requests remain
visible as `429` in its access/error output.

Compose configures bounded Docker JSON log rotation for both containers, initially
`max-size: 10m` and `max-file: 5`. No audit database is introduced.

## Failure and Security Rules

- Backend port `8000` is not bound to LAN/public interfaces.
- Nginx is the only public path to application APIs.
- Invalid citation metadata degrades to page or source-only navigation.
- Citation text and document content never enter audit logs.
- A malformed SSE event never mutates application state.
- A user cancellation is not presented as an outage.
- Repeated `401` handling is coalesced to one refresh and one expiration prompt.
- Health responses disclose no provider or configuration details.
- Rate limiting must not buffer SSE or turn one long stream into repeated requests.
- Public HTTP remains explicitly unsupported as a confidentiality boundary.

## Testing

### Backend

1. Liveness is available independently of readiness.
2. Readiness is false before critical startup, true after initialization, and false
   during shutdown.
3. Failed optional OCR warmup does not block readiness.
4. Ordinary and evaluated Chat responses use retrieved text and metadata only.
5. Missing page, snippet, bbox, or score produces `null`, never placeholders.
6. Citation deduplication preserves retrieval order.
7. Request IDs are validated, propagated, and regenerated when unsafe.
8. Audit records include required metadata and exclude query strings, credentials,
   prompts, answers, and source content.
9. Authenticated requests attach only a hashed user identifier to audit output.

### Frontend

1. The root Error Boundary renders recovery actions and does not expose a stack.
2. One `401` refreshes and retries exactly once.
3. Concurrent `401` responses share refresh and expiration UI.
4. Failed refresh stores a safe relative route and navigates through login.
5. Deliberate sign-out does not show the expiration prompt.
6. Full, partial, and source-only citations map into the shared Source Viewer
   correctly.
7. Every supported SSE event has valid and invalid runtime-schema fixtures.
8. A pre-event transient failure retries no more than twice.
9. A mid-stream failure never auto-restarts generation.
10. `401`, `429`, abort, schema error, and transport failure produce distinct UI
    states.

### Gateway and deployment

1. Nginx configuration validation passes in the production image.
2. Public `:3000/chat`, `/health/live`, and `/health/ready` work through Nginx.
3. Public/LAN access to `:8000` fails while server-local
   `127.0.0.1:8000/docs` remains available.
4. Each route class returns `429` after its controlled test threshold and normal UI
   usage stays below the limits.
5. SSE remains unbuffered and is limited to three concurrent streams per client.
6. Docker logs rotate at the configured size/count.

## Acceptance Criteria

- A React render failure presents a recoverable, non-sensitive full-page fallback.
- An expired session gets one refresh attempt, one clear prompt, and a safe return
  to the previous route after login.
- Chat citations never use generated-answer text or fixed placeholder scores.
- A trustworthy citation opens the shared viewer at its known page/region; partial
  citations are labelled honestly.
- `/health/live` and `/health/ready` return minimal and semantically distinct
  statuses.
- Malformed SSE data cannot enter page state, and disconnections are visible.
- Automatic SSE retry is bounded and cannot duplicate an already-started stream.
- Public traffic reaches backend APIs only through frontend Nginx on host port
  `3000`.
- Basic per-IP rate and connection limits return a stable `429` response.
- Audit logs support request tracing without recording credentials or user/source
  content.
- Backend, frontend, contract, Nginx, and deployment-focused tests pass before
  release.
