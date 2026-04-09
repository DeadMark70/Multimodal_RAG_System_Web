# SECURITY

## Security Baseline

The frontend is a trusted client for user intent, not a trusted authority for authorization or data isolation.

## Implemented Controls

1. `src/services/api.ts` injects the Supabase JWT only for trusted API targets.
2. `src/services/networkPolicy.ts` enforces trusted-host policy in all modes and keeps test/mock mode localhost-only.
3. `src/components/common/MarkdownContent.tsx` + `MessageBubble.tsx` block untrusted markdown links/images from becoming active outbound targets.
4. Supabase client runs with non-persistent session storage (`persistSession=false`) to reduce token exposure in browser storage.
5. `AuthProvider` keeps password-recovery routing explicit and clears local auth state after successful sign-out fallback.
6. Protected file access and maintenance actions go through authenticated API clients rather than unauthenticated direct links.

## Important Limits

1. Tenant isolation and authorization live on the backend, not in React route guards.
2. Environment misconfiguration can still block legitimate targets if trusted-host allowlists are not updated during deploy changes.
3. Browser-visible request metadata is useful for operators but must still be validated server-side.

## Deployment Hardening Priorities

1. Keep backend authz strict on every protected endpoint.
2. Review origin/redirect settings for Supabase auth flows in each environment.
3. Keep dependency and environment checks in CI.
4. Expand auth-failure telemetry where product support needs stronger operator visibility.
