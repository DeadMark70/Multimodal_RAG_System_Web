# P0 Validated SSE and Public Gateway Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reject malformed SSE events before they mutate UI state, retry only safe pre-event transport failures, make disconnections visible, and protect the sole public Nginx entry point with bounded per-IP limits.

**Architecture:** Zod validates event payloads in a transport-independent parser. A shared fetch transport owns auth retry, frame parsing, terminal-event detection, and pre-event retry; hooks own user-facing status. Nginx applies route-class request limits and connection caps before proxying to the loopback/Docker-only backend.

**Tech Stack:** Zod 4.3.5, Fetch/ReadableStream, React hooks, Chakra UI, Vitest, Nginx `limit_req`/`limit_conn`, Docker Compose.

## Global Constraints

- Add Zod as a direct runtime dependency at exactly `4.3.5`, matching the existing lockfile package.
- Every event name has an explicit schema; payload objects may preserve additive unknown fields with `.passthrough()`.
- A malformed JSON/event payload throws `SseProtocolError` before invoking `onEvent`.
- EOF without `complete` or `error` is a disconnection.
- Automatic retry happens only before any valid event and only for network/`502`/`503`/`504`, at delays `500 ms` and `1500 ms` plus bounded jitter.
- A 401 performs one shared session refresh and request retry; a second 401 publishes session expiration.
- 429, other 4xx, protocol errors, aborts, and mid-stream failures do not auto-run generation.
- Nginx remains unbuffered for SSE and returns JSON 429 with `Retry-After`.
- Root Compose publishes frontend `3000:80`, backend `127.0.0.1:8000:8000`, and bounded Docker logs.
- Commit Tasks 8-11 on `Multimodal_RAG_System/master`; Task 12 also updates unversioned root Compose and documents it explicitly.

---

### Task 8: Zod Event Schemas and Protocol Parser

**Files:**
- Modify dependency manifests: `D:\flutterserver\Multimodal_RAG_System\package.json`, `package-lock.json`
- Create: `D:\flutterserver\Multimodal_RAG_System\src\services\sse\schemas.ts`
- Create: `D:\flutterserver\Multimodal_RAG_System\src\services\sse\protocol.ts`
- Create: `D:\flutterserver\Multimodal_RAG_System\src\services\sse\protocol.test.ts`
- Modify: `D:\flutterserver\Multimodal_RAG_System\src\types\rag.ts`

**Interfaces:**
- Produces: `chatEventSchemas`, `deepResearchEventSchemas`, `agenticEventSchemas`.
- Produces: `parseSseEvent<TMap>(schemas: TMap, eventName: string, rawData: string) -> { type: keyof TMap; data: output<TMap[keyof TMap]> }`.
- Produces: `SseProtocolError` with `kind: 'unknown_event' | 'invalid_json' | 'invalid_payload'`.
- Task 9 consumes these schemas and parser; hooks receive already validated events.

- [ ] **Step 1: Add the direct dependency without changing its resolved version**

```powershell
npm install --save-exact zod@4.3.5
```

Expected: `package.json` has `"zod": "4.3.5"`; lockfile retains resolved Zod 4.3.5.

- [ ] **Step 2: Write failing parser tests**

```typescript
it('parses a valid chat complete event', () => {
  expect(parseSseEvent(chatEventSchemas, 'complete', JSON.stringify({
    question: 'q', answer: 'a', sources: [], metrics: null,
  }))).toEqual({
    type: 'complete',
    data: { question: 'q', answer: 'a', sources: [], metrics: null },
  });
});

it.each([
  ['unknown', '{}', 'unknown_event'],
  ['phase_update', '{bad', 'invalid_json'],
  ['phase_update', '{"stage":42}', 'invalid_payload'],
])('rejects %s before delivery', (eventName, rawData, kind) => {
  expect(() => parseSseEvent(chatEventSchemas, eventName, rawData))
    .toThrow(expect.objectContaining({ kind }));
});
```

Add valid/invalid representatives for Deep Research `task_start` and Agentic `plan_ready`, plus a test proving additive fields survive `.passthrough()`.

- [ ] **Step 3: Run parser tests and verify RED**

```powershell
npx vitest run src/services/sse/protocol.test.ts
```

Expected: modules do not exist.

- [ ] **Step 4: Define reusable payload building blocks**

In `schemas.ts`, define:

```typescript
const sourceSchema = z.object({
  doc_id: z.string().min(1),
  filename: z.string().nullable(),
  page: z.number().int().positive().nullable(),
  snippet: z.string().nullable(),
  score: z.number().min(0).max(1).nullable(),
  bbox: z.tuple([z.number(), z.number(), z.number(), z.number()]).nullable().optional(),
}).passthrough();

const editableTaskSchema = z.object({
  id: z.number().int(),
  question: z.string(),
  task_type: z.enum(['rag', 'graph_analysis']),
  enabled: z.boolean(),
}).passthrough();

const errorSchema = z.object({ message: z.string(), task_id: z.number().int().optional() }).passthrough();
```

Define the event maps with these required fields:

| Map/event | Required payload fields |
| --- | --- |
| Chat `phase_update` | `stage` enum: query_expansion/retrieval/reranking/graph_context/answer_generation; optional `label`, `message` |
| Chat `complete` | `question`, `answer`, `sources[]`, nullable `metrics` |
| Chat `error` | `message` |
| Deep `plan_confirmed` | `task_count`, `enabled_count` integers |
| Deep `task_start`, `drilldown_task_start` | `id`, `question`, `task_type`, `iteration` |
| Deep `task_phase_update` | `id`, `iteration`, `stage`, optional `label`, nullable record `details` |
| Deep `task_done`, `drilldown_task_done` | `id`, `question`, nullable/optional `answer`, `sources[]`, `contexts[]`, `iteration` |
| Deep `drilldown_start` | `iteration`, `new_task_count` |
| Deep `synthesis_start` | `total_tasks` |
| Deep `complete` | `question`, `summary`, `detailed_answer`, `sub_tasks[]`, `all_sources[]`, `confidence`, `total_iterations` |
| Deep `error` | `message` |
| Agentic `plan_ready` | `original_question`, `estimated_complexity`, `task_count`, `enabled_count`, `question_intent`, `strategy_tier`, `max_iterations`, `sub_tasks[]` |
| Agentic task/drilldown/synthesis events | same required fields as Deep equivalents |
| Agentic `evaluation_update` | `iteration`, `stage`; optional gate/coverage/details |
| Agentic `trace_step` | `step_id`; optional `title`; passthrough |
| Agentic `complete` | `result` using Deep complete schema and `agent_trace` record |
| Agentic `error` | `message` |

Do not add `plan_ready` or `trace_step` to the Deep map, and do not silently accept unknown event names.

- [ ] **Step 5: Implement the parser and typed error**

```typescript
export class SseProtocolError extends Error {
  constructor(
    readonly kind: 'unknown_event' | 'invalid_json' | 'invalid_payload',
    message: string,
    readonly eventName?: string,
  ) {
    super(message);
    this.name = 'SseProtocolError';
  }
}
```

`parseSseEvent` checks `Object.prototype.hasOwnProperty.call(schemas, eventName)`, parses JSON inside `try/catch`, calls `schema.safeParse`, and returns only `result.data`. Error messages may name the event but must not echo raw payload content.

- [ ] **Step 6: Derive or align public event types**

Use `z.infer` aliases exported from `schemas.ts` for `ChatStreamEvent`, `SSEEvent`, and `AgenticBenchmarkSSEEvent`, or update existing `rag.ts` unions so their event names and payloads exactly match the maps. Remove downstream `data as ...` casts where the discriminated union now narrows safely.

- [ ] **Step 7: Run parser/type checks**

```powershell
npx vitest run src/services/sse/protocol.test.ts src/services/ragApi.test.ts
npx tsc --noEmit
```

Expected: valid fixtures pass; malformed fixtures never invoke consumers.

- [ ] **Step 8: Commit Task 8**

```powershell
git add package.json package-lock.json src/services/sse/schemas.ts src/services/sse/protocol.ts src/services/sse/protocol.test.ts src/types/rag.ts src/services/ragApi.test.ts
git diff --cached --check
git commit -m "feat(sse): validate stream events at runtime"
```

### Task 9: Shared SSE Transport with Bounded Retry

**Files:**
- Create: `D:\flutterserver\Multimodal_RAG_System\src\services\sse\streamSse.ts`
- Create: `D:\flutterserver\Multimodal_RAG_System\src\services\sse\streamSse.test.ts`
- Modify: `D:\flutterserver\Multimodal_RAG_System\src\services\ragApi.ts`
- Modify: `D:\flutterserver\Multimodal_RAG_System\src\services\ragApi.test.ts`
- Consume: `D:\flutterserver\Multimodal_RAG_System\src\services\sessionRecovery.ts`

**Interfaces:**
- Produces `StreamConnectionStatus` discriminated union: `connecting`, `connected`, `reconnecting { attempt, maxAttempts }`, `complete`, `disconnected`.
- Produces `SseTransportError` with kind `http | rate_limited | disconnected | server | auth` and optional status.
- Produces generic `streamSse({ url, body, schemas, onEvent, onStatus, signal }) -> Promise<void>`.
- `ragApi` wrappers retain existing first three arguments and add optional fourth `onStatus` callback.

- [ ] **Step 1: Write failing transport tests with injected fetch and timers**

Cover these exact cases:

```typescript
it('retries two pre-event 503 responses then succeeds', async () => {
  fetchMock
    .mockResolvedValueOnce(response(503))
    .mockResolvedValueOnce(response(503))
    .mockResolvedValueOnce(sseResponse(validCompleteFrame));
  await streamSse(options({ fetchImpl: fetchMock, sleep: vi.fn() }));
  expect(fetchMock).toHaveBeenCalledTimes(3);
  expect(statuses).toEqual([
    { state: 'connecting' },
    { state: 'reconnecting', attempt: 1, maxAttempts: 2 },
    { state: 'reconnecting', attempt: 2, maxAttempts: 2 },
    { state: 'connected' },
    { state: 'complete' },
  ]);
});

it('does not retry after one valid event', async () => {
  fetchMock.mockResolvedValueOnce(sseResponse(validPhaseThenBrokenStream));
  await expect(streamSse(options({ fetchImpl: fetchMock })))
    .rejects.toMatchObject({ kind: 'disconnected' });
  expect(fetchMock).toHaveBeenCalledTimes(1);
});
```

Also test: malformed payload; EOF without terminal; 429; 400; abort; one 401 refresh success; second 401 expiration; and multiline `data:` parsing across chunk boundaries.

- [ ] **Step 2: Run transport tests and verify RED**

```powershell
npx vitest run src/services/sse/streamSse.test.ts
```

Expected: module does not exist.

- [ ] **Step 3: Implement frame parsing without unchecked casts**

Move the existing decoder/buffer behavior out of `ragApi.ts`. Preserve CRLF, multiple `data:` lines, blank-line flush, and final buffered frame handling. Each complete frame calls Task 8 `parseSseEvent`; increment `deliveredEventCount` only after validation and `onEvent` delivery. Mark terminal only for `complete` or `error`.

Define the public status and error types exactly once in `streamSse.ts`:

```typescript
export type StreamConnectionStatus =
  | { state: 'connecting' }
  | { state: 'connected' }
  | { state: 'reconnecting'; attempt: number; maxAttempts: 2 }
  | { state: 'complete' }
  | { state: 'disconnected' };

export class SseTransportError extends Error {
  constructor(
    readonly kind: 'http' | 'rate_limited' | 'disconnected' | 'server' | 'auth',
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = 'SseTransportError';
  }
}
```

If the stream ends without a terminal event, throw:

```typescript
new SseTransportError('disconnected', '串流連線已中斷');
```

- [ ] **Step 4: Implement bounded attempt policy**

Use constants:

```typescript
const RETRY_DELAYS_MS = [500, 1500] as const;
const RETRYABLE_STATUSES = new Set([502, 503, 504]);
const jitter = (base: number) => base + Math.floor(Math.random() * Math.min(250, base / 2));
```

Only schedule another fetch when the attempt delivered zero valid events, the signal is not aborted, and failure is network or retryable status. Emit `reconnecting` before sleeping. A protocol error and any mid-stream error exit immediately.

- [ ] **Step 5: Share Task 5 auth recovery**

Before each fetch, use `getAccessToken()` and fall back to `refreshAccessToken()` only when absent. On the first HTTP 401 for the logical stream, refresh once and repeat the same attempt without consuming a transport retry. On another 401, call `publishSessionExpired()` and throw `SseTransportError('auth', '登入已過期', 401)`.

Map HTTP 429 to `kind: 'rate_limited'`, retaining `Retry-After` only as optional diagnostic metadata; do not schedule it automatically.

- [ ] **Step 6: Replace the private ragApi parser**

Delete the current unchecked `streamSse<TEvent>` implementation in `ragApi.ts`. Each wrapper resolves/asserts its URL as today, then calls the new transport with the corresponding Task 8 schema map. Preserve signatures:

```typescript
askQuestionStream(request, onEvent, signal?, onStatus?)
executeResearchPlanStream(request, onEvent, signal?, onStatus?)
executeAgenticBenchmarkStream(request, onEvent, signal?, onStatus?)
```

Update `ragApi.test.ts` valid fixtures to include every required schema field. Keep the non-local target-blocking regression.

- [ ] **Step 7: Run transport/API tests**

```powershell
npx vitest run src/services/sse/protocol.test.ts src/services/sse/streamSse.test.ts src/services/ragApi.test.ts src/services/sessionRecovery.test.ts
npx tsc --noEmit
```

Expected: all pass; no test observes more than three total fetches or an automatic retry after a delivered event.

- [ ] **Step 8: Commit Task 9**

```powershell
git add src/services/sse/streamSse.ts src/services/sse/streamSse.test.ts src/services/ragApi.ts src/services/ragApi.test.ts
git diff --cached --check
git commit -m "feat(sse): add bounded reconnect policy"
```

### Task 10: Visible Connection and Manual Retry UX

**Files:**
- Modify: `D:\flutterserver\Multimodal_RAG_System\src\hooks\useChat.ts`
- Modify: `D:\flutterserver\Multimodal_RAG_System\src\hooks\useChat.test.tsx`
- Modify: `D:\flutterserver\Multimodal_RAG_System\src\pages\Chat.tsx`
- Modify: `D:\flutterserver\Multimodal_RAG_System\src\pages\Chat.test.tsx`
- Modify: `D:\flutterserver\Multimodal_RAG_System\src\hooks\useDeepResearch.ts`
- Modify: `D:\flutterserver\Multimodal_RAG_System\src\hooks\useDeepResearch.test.tsx`
- Modify: `D:\flutterserver\Multimodal_RAG_System\src\components\rag\DeepResearchPanel.tsx`
- Modify: `D:\flutterserver\Multimodal_RAG_System\src\hooks\useAgenticBenchmarkResearch.ts`
- Modify: `D:\flutterserver\Multimodal_RAG_System\src\hooks\useAgenticBenchmarkResearch.test.tsx`
- Modify: `D:\flutterserver\Multimodal_RAG_System\src\components\rag\AgenticBenchmarkPanel.tsx`

**Interfaces:**
- Consumes Task 9 `StreamConnectionStatus`/`SseTransportError` and Task 8 `SseProtocolError`.
- Each hook exposes `connectionStatus` plus a manual retry action only when the latest failure is retryable by user intent.
- Cancellation produces no error banner; auth errors defer to Task 6 dialog.

- [ ] **Step 1: Write failing hook status tests**

For Chat, mock `askQuestionStream` to call status callbacks and reject with `SseTransportError('disconnected', ...)`. Assert:

```typescript
expect(result.current.connectionStatus.state).toBe('disconnected');
expect(result.current.canRetryLastRequest).toBe(true);
```

For Deep Research and Agentic, cover `reconnecting`, `disconnected`, `rate_limited`, and AbortError. Assert cancellation resets to idle and does not set `error`.

- [ ] **Step 2: Run focused hook tests and verify RED**

```powershell
npx vitest run src/hooks/useChat.test.tsx src/hooks/useDeepResearch.test.tsx src/hooks/useAgenticBenchmarkResearch.test.tsx
```

Expected: return interfaces do not expose connection status/retry.

- [ ] **Step 3: Wire status callbacks into all hooks**

Use one copy table in a small private helper or existing hook utility:

```typescript
const streamStatusCopy = {
  connecting: '正在建立串流連線…',
  reconnecting: '連線暫時中斷，正在有限重試…',
  disconnected: '串流已中斷，請手動重新執行。',
  rate_limited: '請求過於頻繁，請稍後再試。',
  protocol: '伺服器回傳格式不相容，請重新整理後再試。',
} as const;
```

Do not show generic failure toast for `auth`; Task 6 owns it. Do not show failure UI for abort. Preserve the last submitted Chat text/Deep plan/Agentic question in memory only until reset/navigation; do not store it in local/session storage.

- [ ] **Step 4: Add compact status banners and explicit manual actions**

Chat displays a small Chakra `Alert` above the composer only for reconnecting/disconnected/rate-limited/protocol states. Disconnected offers **重新傳送** and calls `retryLastRequest`; it is explicit that a new generation will start. Deep Research offers **重新執行計畫** using the current confirmed plan. Agentic offers **重新執行研究** using the last in-memory question.

Do not auto-click actions, do not append a duplicate user message until the user explicitly presses the retry button, and disable the button while a new run is active.

- [ ] **Step 5: Add component interaction tests**

Assert each banner's copy, action label, and one callback invocation. Assert reconnecting has no manual action yet, cancellation renders no banner, and auth error does not duplicate the session dialog.

- [ ] **Step 6: Run focused UI tests**

```powershell
npx vitest run src/hooks/useChat.test.tsx src/pages/Chat.test.tsx src/hooks/useDeepResearch.test.tsx src/components/rag/DeepResearchPanel.test.tsx src/hooks/useAgenticBenchmarkResearch.test.tsx src/components/rag/AgenticBenchmarkPanel.test.tsx
npx tsc --noEmit
```

Expected: all pass.

- [ ] **Step 7: Commit Task 10**

```powershell
git add src/hooks/useChat.ts src/hooks/useChat.test.tsx src/pages/Chat.tsx src/pages/Chat.test.tsx src/hooks/useDeepResearch.ts src/hooks/useDeepResearch.test.tsx src/components/rag/DeepResearchPanel.tsx src/hooks/useAgenticBenchmarkResearch.ts src/hooks/useAgenticBenchmarkResearch.test.tsx src/components/rag/AgenticBenchmarkPanel.tsx
git diff --cached --check
git commit -m "feat(sse): surface disconnect and retry UX"
```

### Task 11: Nginx Request and Connection Limits

**Files:**
- Modify: `D:\flutterserver\Multimodal_RAG_System\nginx.conf`
- Create: `D:\flutterserver\Multimodal_RAG_System\scripts\nginx-config.test.mjs`

**Interfaces:**
- Produces three `$binary_remote_addr` request zones: `api_general`, `api_generation`, `api_upload`.
- Produces one connection zone `api_connections`, with general cap 10 and SSE cap 3.
- Produces JSON 429 envelope `{ "error": { "code": "RATE_LIMITED", "message": "請求過於頻繁，請稍後再試" } }` and `Retry-After: 60`.
- Proxies `X-Request-ID: $request_id` and `X-Real-IP: $remote_addr` to Task 2.

- [ ] **Step 1: Write a failing static configuration contract test**

Using `node:test`, read `nginx.conf` and assert it contains exact declarations:

```javascript
assert.match(config, /limit_req_zone \$binary_remote_addr zone=api_general:10m rate=120r\/m;/);
assert.match(config, /limit_req_zone \$binary_remote_addr zone=api_generation:10m rate=12r\/m;/);
assert.match(config, /limit_req_zone \$binary_remote_addr zone=api_upload:10m rate=4r\/m;/);
assert.match(config, /limit_conn_zone \$binary_remote_addr zone=api_connections:10m;/);
assert.match(config, /proxy_set_header X-Request-ID \$request_id;/);
assert.match(config, /proxy_buffering off;/);
assert.match(config, /Retry-After 60 always/);
```

Also assert `/health/` has a proxy location and the upload regex appears before the general API regex.

- [ ] **Step 2: Run script tests and verify RED**

```powershell
node --test scripts/nginx-config.test.mjs
```

Expected: missing limit zones/429/health assertions fail.

- [ ] **Step 3: Define zones at HTTP include scope**

Place before `upstream backend_api`:

```nginx
limit_req_zone $binary_remote_addr zone=api_general:10m rate=120r/m;
limit_req_zone $binary_remote_addr zone=api_generation:10m rate=12r/m;
limit_req_zone $binary_remote_addr zone=api_upload:10m rate=4r/m;
limit_conn_zone $binary_remote_addr zone=api_connections:10m;
```

Inside `server`, set `limit_req_status 429`, `limit_conn_status 429`, and `error_page 429 = @rate_limited`. The named location returns the exact JSON envelope and header from Interfaces.

- [ ] **Step 4: Add ordered route classes**

Use ordered regex locations:

1. Upload/OCR: `^/(pdfmd/(ocr|upload_pdf_md)|imagemd/translate_image|multimodal/extract)$` with `api_upload burst=1 nodelay`, connection cap 10.
2. SSE generation: `^/rag/(ask|execute|agentic)/stream$` with `api_generation burst=3 nodelay`, connection cap 3, buffering/cache off, 3600-second read/send timeouts.
3. Non-stream generation: `^/rag/(ask|research|plan|execute)$` with `api_generation burst=3 nodelay`, cap 10.
4. General API: existing prefixes with `api_general burst=30 nodelay`, cap 10.
5. Health: `^~ /health/`, proxied without consuming generation/upload zones and with short ordinary timeouts.

Every backend location sets Host, X-Real-IP, X-Forwarded-For, X-Forwarded-Proto, X-Request-ID, HTTP/1.1, and empty Connection. Preserve the CSP and SPA fallback.

- [ ] **Step 5: Run static and image-level Nginx validation**

```powershell
npm run test:scripts
npm run build
```

On a machine with Docker:

```powershell
docker build -t rag-frontend-nginx-check .
docker run --rm rag-frontend-nginx-check nginx -t
```

Expected: Node tests and `nginx -t` pass.

- [ ] **Step 6: Commit Task 11**

```powershell
git add nginx.conf scripts/nginx-config.test.mjs
git diff --cached --check
git commit -m "feat(edge): rate limit public API traffic"
```

### Task 12: Compose Hardening, Documentation, and Release Verification

**Files:**
- Modify unversioned deployment artifact: `D:\flutterserver\docker-compose.yml`
- Create: `D:\flutterserver\Multimodal_RAG_System\docs\deployment\public-self-hosted-p0.md`
- Modify: `D:\flutterserver\Multimodal_RAG_System\docs\exec-plans\tech-debt-tracker.md`
- Modify: `D:\flutterserver\pdftopng\docs\SECURITY.md`

**Interfaces:**
- Publishes frontend `3000:80` and backend `127.0.0.1:8000:8000`.
- Backend healthcheck calls `http://127.0.0.1:8000/health/live` using Python stdlib.
- Frontend starts after backend reports healthy.
- Both services use Docker JSON log rotation `10m × 5`.

- [ ] **Step 1: Record clean baselines before editing the unversioned Compose file**

```powershell
git -C D:\flutterserver\Multimodal_RAG_System status --short --branch
git -C D:\flutterserver\pdftopng status --short --branch
Get-FileHash D:\flutterserver\docker-compose.yml -Algorithm SHA256
```

Save the pre-edit hash in the task report, not in application logs. Do not stage `.superpowers/brainstorm/`.

- [ ] **Step 2: Apply the exact Compose boundary**

Backend:

```yaml
ports:
  - "127.0.0.1:8000:8000"
healthcheck:
  test: ["CMD", "python", "-c", "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/health/live', timeout=3)"]
  interval: 30s
  timeout: 5s
  retries: 3
  start_period: 120s
logging:
  driver: json-file
  options:
    max-size: "10m"
    max-file: "5"
```

Frontend:

```yaml
depends_on:
  backend:
    condition: service_healthy
ports:
  - "3000:80"
logging:
  driver: json-file
  options:
    max-size: "10m"
    max-file: "5"
```

Keep `gpus: all`, env file, volumes, restart policy, build args, and `rag-net` unchanged.

- [ ] **Step 3: Write deployment and rollback documentation**

`docs/deployment/public-self-hosted-p0.md` must contain:

- topology `public :3000 -> Nginx -> backend:8000`;
- same-origin requirement `VITE_API_BASE_URL=/`;
- exact Compose snippets from Step 2;
- health commands and expected statuses;
- how to inspect 429 and request IDs in `docker compose logs`;
- verification that LAN/public `:8000` is closed while server-local access works;
- rollback: restore the previous Compose file and Nginx image, then `docker compose up -d --build`;
- explicit warning that HTTP does not encrypt JWTs, prompts, documents, or answers and HTTPS/VPN remains the next P0.

Update `tech-debt-tracker.md` to close runtime SSE schema/session UX items only after their tests pass, and retain HTTPS/SSE replay as explicit deferred work. Update backend `docs/SECURITY.md` to say live/ready, edge limits, safe audit, and loopback binding now exist; do not claim transport confidentiality.

- [ ] **Step 4: Run full backend verification**

```powershell
python -m pytest tests/test_health_api.py tests/test_request_audit.py tests/test_chat_citations.py tests/test_rag_ask_stream.py tests/test_rag_filtering.py -q
python scripts/sync_openapi_artifacts.py --check
python -m pytest -q
```

Expected: focused and full suites pass; record pass/skip/warning totals.

- [ ] **Step 5: Run full frontend verification**

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

Expected: every command exits zero.

- [ ] **Step 6: Validate and start the deployment**

On the production Docker host:

```powershell
docker compose config
docker compose build frontend backend
docker compose up -d
docker compose ps
```

Wait for backend healthy without using sleeps longer than 60 seconds; poll `docker compose ps` and logs. Then verify the four URLs from the master plan, one real Chat citation, one forced browser offline/online stream failure, and controlled 429 behavior. Never paste the real public IP into committed files.

- [ ] **Step 7: Commit versioned documentation in each owning repo**

Backend:

```powershell
git add docs/SECURITY.md
git diff --cached --check
git commit -m "docs(security): record P0 ingress controls"
```

Frontend:

```powershell
git add docs/deployment/public-self-hosted-p0.md docs/exec-plans/tech-debt-tracker.md
git diff --cached --check
git commit -m "docs: add public deployment hardening runbook"
```

Report the new root Compose SHA-256 separately because `D:\flutterserver` is not a Git repository.

- [ ] **Final whole-change review gate**

Dispatch exactly one final review agent with:

- approved design spec;
- all four plan documents;
- backend commit range from pre-Task-1 HEAD through Task 12 docs;
- frontend commit range from pre-Task-4 HEAD through Task 12 docs;
- root Compose diff/hash;
- complete verification outputs.

Require review of correctness, security boundaries, contract compatibility, retry duplication risk, log redaction, Nginx location ordering, and deployment rollback. Validate every finding locally using `superpowers:receiving-code-review`; fix confirmed issues in the owning repo, rerun affected focused tests and the complete matrix, then commit final fixes. Do not dispatch additional per-task review agents.
