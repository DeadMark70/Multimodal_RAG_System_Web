# SECURITY

## Current Security Baseline

This frontend is a client application and depends on backend enforcement for authorization and data boundaries.

## Implemented Controls

1. JWT token is attached through centralized request interceptor (`src/services/api.ts`).
2. API base URL is environment-configurable (`VITE_API_BASE_URL`).
3. Auth-aware pages and requests use Supabase session state.

## Known Gaps

1. Frontend cannot enforce tenant or RBAC boundaries by itself.
2. Misconfigured CORS or API host can expose integration risks.
3. Client-visible request metadata still requires backend validation.

## Required Upgrade Path For Public Deployment

1. Keep strict backend authz on every protected route.
2. Add CSRF/origin review for cookie-based auth variants.
3. Add stronger security telemetry for auth failures and abuse patterns.
4. Add hardening checks in CI for env and dependency risk.

