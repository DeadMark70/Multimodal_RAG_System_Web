# Auth And Account Flows

## User Outcomes

- A new user can sign up from `/signup`.
- An existing user can sign in from `/login`.
- A user who forgot their password can request recovery from `/forgot-password`.
- A recovery link that lands on the wrong route still redirects into `/reset-password`.
- Logout succeeds even if global revocation fails, as long as local session cleanup succeeds.

## Acceptance Notes

- The login page should stay login-focused and must not silently drift into signup mode.
- Recovery and reset flows should produce explicit success/error feedback.
- Auth route copy should match the route intent.
