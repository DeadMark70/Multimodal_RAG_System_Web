# Routing And Session

## Purpose

Document how the frontend route shell, auth session, and restore behavior fit together.

## Route Map

- Public/auth entry:
  - `/login`
  - `/signup`
  - `/forgot-password`
  - `/reset-password`
- Product routes:
  - `/dashboard`
  - `/knowledge`
  - `/chat`
  - `/experiment`
  - `/evaluation`
  - `/graph-demo`

## Session Model

- `AuthProvider` owns the live Supabase session and user object.
- Auth state changes are handled centrally instead of page-by-page.
- `PASSWORD_RECOVERY` forces navigation to `/reset-password` when the recovery event lands on another path.
- `signOut` attempts global revocation first, then falls back to local cleanup.

## Restore Rules

- Conversation and Deep Research restore rely on persisted metadata plus `useSessionStore`.
- Route-level pages should render from current query/store state, not hold private copies of canonical session data.
- Any new auth-sensitive route must rely on the shared auth/session layer rather than bespoke token reads.
