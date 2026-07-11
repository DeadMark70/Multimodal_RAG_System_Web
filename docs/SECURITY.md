# SECURITY

## Security Baseline

The frontend is a trusted client for user intent, not a trusted authority for authorization or data isolation.

## Implemented Controls

1. `src/services/api.ts` injects the Supabase JWT only for trusted API targets.
2. `src/services/networkPolicy.ts` enforces trusted-host policy in all modes and keeps test/mock mode localhost-only.
3. `src/components/common/MarkdownContent.tsx` + `MessageBubble.tsx` block untrusted markdown links/images from becoming active outbound targets.
4. Trusted markdown links rendered by `MarkdownContent.tsx` always use `target="_blank"` with `rel="noopener noreferrer"` to prevent opener abuse/tabnabbing.
5. `nginx.conf` sends a deployment CSP that constrains `img-src`, `connect-src`, `object-src`, `base-uri`, and `frame-ancestors`.
6. Supabase client intentionally persists sessions across browser restarts (`persistSession=true`); browser storage exposure is mitigated with CSP and Supabase session lifetime controls.
7. `AuthProvider` marks password recovery only after `PASSWORD_RECOVERY`; ordinary authenticated sessions cannot use the recovery reset form.
8. Authenticated password changes require the current password through Supabase Auth, while forgotten-password recovery requires a time-limited email recovery link.
9. Protected file access and maintenance actions go through authenticated API clients rather than unauthenticated direct links.

## Important Limits

1. Tenant isolation and authorization live on the backend, not in React route guards.
2. Environment misconfiguration can still block legitimate targets if trusted-host allowlists are not updated during deploy changes.
3. Browser-visible request metadata is useful for operators but must still be validated server-side.

## Deployment Hardening Priorities

1. Keep backend authz strict on every protected endpoint.
2. Keep CSP source lists aligned with real deploy dependencies (Supabase domains, avatar hosts, API origin) so hardening does not break legitimate flows.
3. Review origin/redirect settings for Supabase auth flows in each environment.
4. Keep dependency and environment checks in CI.
5. Expand auth-failure telemetry where product support needs stronger operator visibility.

## Supabase Session Deployment Checklist

- Keep JWT expiry near one hour.
- Set inactivity timeout to 24 hours and maximum session lifetime to 14 days.
- Keep refresh-token reuse detection enabled.
- Allow-list only explicit production and development `/reset-password` redirect URLs.
- Enable Supabase's server-side current-password requirement before exposing `/change-password` in production.
