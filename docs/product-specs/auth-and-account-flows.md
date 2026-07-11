# Auth And Account Flows

## User Outcomes

- A new user can sign up from `/signup`.
- An existing user can sign in from `/login`.
- A user who forgot their password can request recovery from `/forgot-password`.
- A recovery link that lands on the wrong route still redirects into `/reset-password`, and only its `PASSWORD_RECOVERY` state can reveal the reset form.
- An authenticated user can change a password from `/change-password` only after supplying the current password.
- Successful password recovery and password change both require a fresh sign-in.
- Logout succeeds even if global revocation fails, as long as local session cleanup succeeds.

## Acceptance Notes

- The login page should stay login-focused and must not silently drift into signup mode.
- Recovery and reset flows should produce explicit success/error feedback.
- Public recovery errors must not expose raw authentication-provider messages.
- Auth route copy should match the route intent.
