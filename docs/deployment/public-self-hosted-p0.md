# Public Self-Hosted P0 Deployment Runbook

## Scope and confidentiality warning

This release exposes one application origin:

```text
public browser -> host :3000 -> frontend Nginx :80 -> backend:8000
                                      |                 (rag-net only)
                                      +-> React assets

server-local diagnostics -> 127.0.0.1:8000 -> backend:8000
```

The browser build must use `VITE_API_BASE_URL=/`. API, PDF, and SSE traffic then
uses the frontend origin and Nginx forwards it to the `backend` service over
`rag-net`. The firewall/router must publish host port `3000` only. Host port
`8000` is for loopback diagnostics and must not be forwarded.

> **P0 transport risk:** HTTP does not encrypt JWTs, prompts, uploaded documents,
> citations, or answers. HTTPS termination or a trusted VPN remains the next P0.
> The controls below improve ingress isolation, resilience, and abuse resistance;
> they do not provide transport confidentiality.

## Required Compose boundary

Keep the backend GPU, environment file, volumes, restart policy, and `rag-net`
membership unchanged. Its public-port, health, and logging boundary is:

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

Keep the frontend build arguments, restart policy, and `rag-net` membership
unchanged. In particular, preserve
`VITE_API_BASE_URL: ${VITE_API_BASE_URL:-/}`. Its startup, public-port, and
logging boundary is:

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

## Validate and deploy

Run from the directory containing `docker-compose.yml` on a Docker-capable host.
Do not continue if either configuration check fails.

```powershell
docker compose config
docker compose build frontend backend
docker compose run --rm --no-deps frontend nginx -t
docker compose up -d
docker compose ps
```

Poll at intervals shorter than 60 seconds and stop after five minutes instead of
waiting indefinitely:

```powershell
$Deadline = (Get-Date).AddMinutes(5)
do {
  $BackendHealth = docker inspect --format '{{.State.Health.Status}}' rag-backend
  docker compose ps
  if ($BackendHealth -eq 'healthy') { break }
  if ((Get-Date) -ge $Deadline) {
    docker compose logs --tail 100 backend
    throw 'Backend did not become healthy within five minutes.'
  }
  Start-Sleep -Seconds 5
} while ($true)

docker compose exec frontend nginx -t
```

Expected: `rag-backend` becomes `healthy`, `rag-frontend` is running, and both
Nginx validation commands report that the configuration syntax is valid and the
test is successful.

## Health and exposure checks

Set a placeholder for the host name or address used by clients. Never commit the
real public IP.

```powershell
$PublicBase = 'http://SERVER_HOST_OR_IP:3000'

curl.exe -i "$PublicBase/chat"
curl.exe -i "$PublicBase/health/live"
curl.exe -i "$PublicBase/health/ready"
curl.exe -i http://127.0.0.1:8000/docs
```

Expected results:

| Check | Expected result |
| --- | --- |
| `:3000/chat` | HTTP `200` and the frontend application shell |
| `:3000/health/live` | HTTP `200`, `{"status":"live"}` |
| `:3000/health/ready` | HTTP `200`, `{"status":"ready"}` after startup; HTTP `503`, `{"status":"not_ready"}` during startup/shutdown |
| server-local `127.0.0.1:8000/docs` | HTTP `200` Swagger UI |

On the server, confirm the backend listener is loopback-only:

```powershell
Get-NetTCPConnection -State Listen -LocalPort 8000 |
  Select-Object LocalAddress, LocalPort, OwningProcess
curl.exe -i http://127.0.0.1:8000/health/live
```

Expected: the listener is `127.0.0.1:8000`, never `0.0.0.0:8000` or
`[::]:8000`, and the local health request returns HTTP `200`.

From a different LAN/public machine, verify the same port is closed:

```powershell
$ServerHost = 'SERVER_HOST_OR_IP'
Test-NetConnection -ComputerName $ServerHost -Port 8000
```

Expected: `TcpTestSucceeded : False`. If it is true, stop the release and correct
the Compose binding plus firewall/router forwarding before accepting traffic.

## Audit, request-ID, and 429 checks

The backend emits safe structured request metadata without query strings,
credentials, prompts, answers, filenames, or document/source content. Obtain a
request ID from a proxied response and locate its backend audit record:

```powershell
$ResponseHeaders = curl.exe -sS -D - -o NUL "$PublicBase/health/live"
$RequestId = (($ResponseHeaders | Select-String -Pattern '^X-Request-ID:').Line -replace '^X-Request-ID:\s*', '').Trim()
$RequestId
docker compose logs backend | Select-String -SimpleMatch $RequestId
```

Expected: one safe `request_complete` record contains the same `request_id`. Do not
paste entire production logs into tickets; include only the minimum safe fields.

Exercise rate limiting with GET requests to the POST-only generation route so the
test cannot start generation work. Use an isolated client during a maintenance
window because the limit is per client address:

```powershell
$Statuses = 1..20 | ForEach-Object {
  curl.exe -sS -o NUL -w '%{http_code}' "$PublicBase/rag/ask"
}
$Statuses | Group-Object | Sort-Object Name | Format-Table Name, Count
curl.exe -i "$PublicBase/rag/ask"
docker compose logs --since 2m frontend | Select-String -Pattern ' 429 '
```

Expected: initial requests are rejected by the backend as method-not-allowed and
at least one later request returns HTTP `429`; a sampled `429` has
`Retry-After: 60` and the `RATE_LIMITED` JSON error shape. The frontend container
logs show the edge `429`. Edge-rejected requests do not reach the backend, so
they do not have a backend audit record.

## Application and SSE smoke checklist

After health and exposure checks pass:

1. Sign in through `:3000`, open Chat, ask a question against a known indexed
   document, and confirm one real citation opens the shared source viewer at the
   available page/region without invented metadata.
2. Start one Chat stream, force the browser offline before the first valid event,
   restore connectivity, and confirm bounded reconnect feedback appears.
3. Repeat with connectivity lost after a valid event; confirm the partial result
   remains visible and no automatic replay starts duplicate generation. Use the
   explicit manual retry only once.
4. Run the controlled `429` check above and confirm the UI reports rate limiting
   distinctly from auth expiry, cancellation, schema failure, or disconnection.
5. Inspect `docker compose logs --tail 100 frontend backend` and confirm no JWT,
   prompt, answer, filename, citation text, or document content was logged.

Persistent SSE event replay and `Last-Event-ID` resume are intentionally deferred;
this release provides only bounded pre-event retry and explicit manual recovery.

## Rollback

Before deployment, retain a recoverable copy of the previous root Compose file
and the previous frontend/Nginx release image inputs (`Dockerfile` and
`nginx.conf`) or release checkout. To roll back:

1. Stop accepting new work and record the current container status and safe log
   metadata.
2. Restore the previous `docker-compose.yml`.
3. Restore the previous frontend/Nginx image inputs or previous release checkout.
4. Revalidate and rebuild the restored release:

```powershell
docker compose config
docker compose build frontend backend
docker compose run --rm --no-deps frontend nginx -t
docker compose up -d --build
docker compose ps
```

Repeat the health checks and the server-local/public port checks. A rollback that
restores `8000:8000` also restores the old exposure risk; keep port `8000` blocked
at the firewall/router until the loopback binding is reapplied.
