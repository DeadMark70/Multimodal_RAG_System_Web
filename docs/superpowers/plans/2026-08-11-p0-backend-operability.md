# P0 Backend Operability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add truthful liveness/readiness behavior and a privacy-conscious request audit trail to FastAPI.

**Architecture:** A focused health router reads explicit lifespan state without probing external systems on demand. One request lifecycle middleware validates request IDs, times requests, and logs safe metadata; the auth dependency attaches the resolved user ID to request state for one-way anonymization.

**Tech Stack:** FastAPI, Starlette, Pydantic, Python logging, pytest, FastAPI TestClient.

## Global Constraints

- `/health/live` performs no external calls and returns only `{"status":"live"}`.
- `/health/ready` returns only `{"status":"ready"}` or `{"status":"not_ready"}` with HTTP 503.
- Readiness is false before critical startup and during shutdown; OCR failure is non-fatal.
- Audit records never contain query strings, bodies, content, filenames, snippets, headers, or tokens.
- Incoming request IDs allow only `[A-Za-z0-9._-]`, maximum 64 characters.
- User IDs are logged only as a stable SHA-256 prefix; missing auth is `anonymous`.
- Work on `pdftopng/main`, one task and one focused commit at a time.

---

### Task 1: Liveness and Readiness API

**Files:**
- Create: `D:\flutterserver\pdftopng\core\health.py`
- Modify: `D:\flutterserver\pdftopng\core\app_factory.py`
- Test: `D:\flutterserver\pdftopng\tests\test_health_api.py`

**Interfaces:**
- Produces: `health_router: APIRouter` with `GET /health/live` and `GET /health/ready`.
- Produces: `set_readiness(app: FastAPI, ready: bool) -> None`.
- Uses: `app.state.ready: bool`, initialized to false by `create_app()`.

- [ ] **Step 1: Write failing endpoint and state tests**

```python
from fastapi import FastAPI
from fastapi.testclient import TestClient

from core.health import health_router, set_readiness


def _client(*, ready: bool) -> TestClient:
    app = FastAPI()
    app.state.ready = ready
    app.include_router(health_router)
    return TestClient(app)


def test_live_is_independent_of_readiness() -> None:
    response = _client(ready=False).get("/health/live")
    assert response.status_code == 200
    assert response.json() == {"status": "live"}


def test_ready_returns_503_until_lifespan_is_ready() -> None:
    response = _client(ready=False).get("/health/ready")
    assert response.status_code == 503
    assert response.json() == {"status": "not_ready"}


def test_set_readiness_changes_ready_response() -> None:
    app = FastAPI()
    app.state.ready = False
    app.include_router(health_router)
    set_readiness(app, True)
    response = TestClient(app).get("/health/ready")
    assert response.status_code == 200
    assert response.json() == {"status": "ready"}
```

- [ ] **Step 2: Run the new tests and verify RED**

Run:

```powershell
python -m pytest tests/test_health_api.py -q
```

Expected: collection fails because `core.health` does not exist.

- [ ] **Step 3: Implement the minimal health router**

```python
from typing import Literal

from fastapi import APIRouter, FastAPI, Request, status
from pydantic import BaseModel
from starlette.responses import JSONResponse


class HealthResponse(BaseModel):
    status: Literal["live", "ready", "not_ready"]


health_router = APIRouter(prefix="/health", tags=["Health"])


def set_readiness(app: FastAPI, ready: bool) -> None:
    app.state.ready = ready


@health_router.get("/live", response_model=HealthResponse)
async def live() -> HealthResponse:
    return HealthResponse(status="live")


@health_router.get("/ready", response_model=HealthResponse)
async def ready(request: Request):
    if bool(getattr(request.app.state, "ready", False)):
        return HealthResponse(status="ready")
    return JSONResponse(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        content={"status": "not_ready"},
    )
```

Wire it in `core/app_factory.py`:

```python
from core.health import health_router, set_readiness

# first line of app_lifespan
set_readiness(app, False)

# after RAG initialization and the non-fatal OCR warmup, immediately before yield
set_readiness(app, True)

# first line of finally
set_readiness(app, False)

# in _register_routers
app.include_router(health_router)

# immediately after FastAPI(...) in create_app
set_readiness(app, False)
```

Keep the existing root `/` welcome endpoint; it is no longer described as the formal health endpoint.

- [ ] **Step 4: Add a lifespan regression test**

Patch `_initialize_rag_components` and `_warm_up_pdf_ocr` with `AsyncMock`, enter `TestClient(main.app)`, and assert `/health/ready` is 200 while the client context is active. Add a second test where `_warm_up_pdf_ocr` returns normally after internally logged failure semantics and confirm readiness remains 200.

- [ ] **Step 5: Run focused backend tests**

```powershell
python -m pytest tests/test_health_api.py tests/test_rag_startup.py tests/test_rag_ask_stream.py -q
```

Expected: all pass.

- [ ] **Step 6: Commit Task 1**

```powershell
git add core/health.py core/app_factory.py tests/test_health_api.py
git diff --cached --check
git commit -m "feat(health): add live and ready probes"
```

### Task 2: Request Context and Minimal Audit Log

**Files:**
- Create: `D:\flutterserver\pdftopng\core\request_audit.py`
- Modify: `D:\flutterserver\pdftopng\core\app_factory.py`
- Modify: `D:\flutterserver\pdftopng\core\auth.py`
- Test: `D:\flutterserver\pdftopng\tests\test_request_audit.py`

**Interfaces:**
- Produces: `normalize_request_id(value: str | None) -> str`.
- Produces: `anonymize_user_id(value: str | None) -> str`.
- Produces: `request_context_middleware(request: Request, call_next) -> Response`.
- Produces: `request.state.audit_user_id` from `get_current_user_id` after successful authentication.
- Consumes: Nginx `X-Request-ID` and `X-Real-IP`; safely falls back to the direct peer address.

- [ ] **Step 1: Write failing pure-function tests**

```python
import re

from core.request_audit import anonymize_user_id, normalize_request_id


def test_request_id_accepts_safe_bounded_value() -> None:
    assert normalize_request_id("req-123_OK.test") == "req-123_OK.test"


def test_request_id_replaces_unsafe_or_oversized_value() -> None:
    generated = normalize_request_id("bad\nvalue")
    assert generated != "bad\nvalue"
    assert re.fullmatch(r"[0-9a-f-]{36}", generated)
    assert normalize_request_id("x" * 65) != "x" * 65


def test_user_id_is_anonymous_or_stably_hashed() -> None:
    assert anonymize_user_id(None) == "anonymous"
    assert anonymize_user_id("user-123") == anonymize_user_id("user-123")
    assert "user-123" not in anonymize_user_id("user-123")
    assert len(anonymize_user_id("user-123")) == 12
```

- [ ] **Step 2: Write a failing middleware redaction test**

Create a small FastAPI app using `app.middleware("http")(request_context_middleware)`. Its authenticated test route sets `request.state.audit_user_id = "user-secret"` and returns 200. With `caplog`, call `/items/42?question=secret-prompt` using `Authorization: Bearer secret-token`, then parse the single JSON audit payload and assert:

```python
assert record["method"] == "GET"
assert record["path"] == "/items/{item_id}"
assert record["status"] == 200
assert record["request_id"] == response.headers["X-Request-ID"]
assert "secret-prompt" not in caplog.text
assert "secret-token" not in caplog.text
assert "user-secret" not in caplog.text
```

- [ ] **Step 3: Run the new tests and verify RED**

```powershell
python -m pytest tests/test_request_audit.py -q
```

Expected: collection fails because `core.request_audit` does not exist.

- [ ] **Step 4: Implement focused request-audit helpers**

Use these exact public signatures:

```python
_SAFE_REQUEST_ID = re.compile(r"^[A-Za-z0-9._-]{1,64}$")


def normalize_request_id(value: str | None) -> str:
    if value and _SAFE_REQUEST_ID.fullmatch(value):
        return value
    return str(uuid.uuid4())


def anonymize_user_id(value: str | None) -> str:
    if not value:
        return "anonymous"
    return hashlib.sha256(value.encode("utf-8")).hexdigest()[:12]
```

The async middleware must:

1. store the normalized ID in `request.state.request_id`;
2. record `time.perf_counter()` before `call_next`;
3. log status 500 and re-raise if downstream raises;
4. after routing, prefer `request.scope["route"].path` over the raw path;
5. validate `X-Real-IP` with `ipaddress.ip_address`, otherwise use `request.client.host`;
6. log one compact JSON object with keys `event`, `request_id`, `method`, `path`, `status`, `duration_ms`, `client_ip`, `user_id`;
7. attach `X-Request-ID` to every normal response.

Register this middleware in `core/app_factory.py` instead of the current inline `request_id_middleware`; do not leave two request-ID implementations active.

- [ ] **Step 5: Attach authenticated identity without decoding twice**

Change the auth dependency to accept `Request` and set state only after successful validation:

```python
async def get_current_user_id(
    request: Request,
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer_scheme),
) -> str:
    # existing missing-token and exception behavior stays unchanged
    user_id = await fetch_user_id_from_token(credentials.credentials)
    request.state.audit_user_id = user_id
    return user_id
```

Add a test overriding `fetch_user_id_from_token` and assert the route can read `request.state.audit_user_id`. Missing/invalid tokens must not place raw token text in captured logs.

- [ ] **Step 6: Run focused backend tests**

```powershell
python -m pytest tests/test_request_audit.py tests/test_router_boundaries.py tests/test_conversations_api.py tests/test_rag_ask_stream.py -q
```

Expected: all pass, with no credential text in test output.

- [ ] **Step 7: Commit Task 2**

```powershell
git add core/request_audit.py core/app_factory.py core/auth.py tests/test_request_audit.py
git diff --cached --check
git commit -m "feat(audit): log safe request metadata"
```
