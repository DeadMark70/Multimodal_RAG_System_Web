# Auth Password and Session Hardening Design

## Objective

Separate password recovery from authenticated password changes, enforce the correct proof of identity for each flow, and document the intentional decision to persist Supabase sessions across browser restarts.

This design changes authentication behavior only. It does not move password handling into FastAPI, add MFA, or implement CAPTCHA and general rate limiting.

## Decisions

1. Keep `persistSession: true` for cross-browser-restart sign-in continuity.
2. Treat a Supabase `PASSWORD_RECOVERY` event as the only authority that enables the recovery password form.
3. Add a protected `/change-password` route for ordinary authenticated password changes.
4. Require the current password for `/change-password`, enforced by Supabase Auth rather than only by React.
5. Keep forgotten-password recovery based on the time-limited email recovery link. A user who has forgotten their password is not asked for the current password.
6. Revoke sessions after either password flow succeeds and require a fresh sign-in.

## Flow Boundaries

### Forgotten-password recovery

1. A signed-out user enters an email address at `/forgot-password`.
2. The frontend calls `resetPasswordForEmail` with an exact `/reset-password` redirect URL.
3. The public response remains generic regardless of whether the account exists.
4. Supabase sends a time-limited recovery link.
5. Opening a valid link creates a recovery session and emits `PASSWORD_RECOVERY`.
6. `AuthProvider` records an in-memory recovery authorization state and redirects to `/reset-password` when necessary.
7. `/reset-password` renders its password form only when both a session and active recovery authorization are present.
8. The user enters and confirms a new password. No current password is required.
9. The frontend calls `updateUser({ password })`.
10. On success, the app performs global sign-out, clears recovery state, and navigates to `/login`.

An ordinary authenticated session must not be sufficient to use `/reset-password`. Reloading or directly navigating to that route without a newly observed recovery event results in the invalid-link state and directs the user back to `/forgot-password`.

### Authenticated password change

1. An authenticated user selects `Change password` from the account card.
2. The protected `/change-password` page requests the current password, new password, and confirmation.
3. The frontend validates required fields, matching confirmation, and the product password-length rule before submission.
4. The frontend submits the current and new passwords to Supabase Auth using the SDK/API contract that supports server-enforced current-password verification.
5. Supabase rejects an incorrect current password. React does not constitute the security boundary.
6. On success, the app performs global sign-out and navigates to `/login` with a generic success message.

The FastAPI backend never receives either password.

## Supabase Prerequisites

Before enabling the new change-password page:

1. Upgrade `@supabase/supabase-js` from the current `2.89.0` to a release whose installed runtime and TypeScript declarations support the current-password update contract.
2. Enable the Supabase Auth setting that requires the current password for password changes.
3. Verify the exact SDK payload against the installed package after upgrade. The intended contract is conceptually:

```ts
await supabase.auth.updateUser({
  current_password: currentPassword,
  password: newPassword,
});
```

4. Configure the password minimum and leaked-password policy in Supabase so the server, rather than only the UI, enforces password quality.
5. Keep the production `/reset-password` URL explicitly allow-listed in Supabase Auth redirect configuration.

If the upgraded SDK does not expose a server-enforced current-password field, implementation must stop for a design revision. A client-only `signInWithPassword` check followed by `updateUser` is not an acceptable substitute because it can be bypassed by calling the Auth API directly with a stolen session.

## Frontend Architecture

### Auth context

Extend the auth context with an explicit recovery authorization value:

```ts
type AuthContextType = {
  session: Session | null;
  user: User | null;
  loading: boolean;
  recoveryActive: boolean;
  signOut: () => Promise<void>;
};
```

`recoveryActive` starts as `false`, becomes `true` only after the current page observes `PASSWORD_RECOVERY`, and returns to `false` on successful update, sign-out, or a non-recovery session transition that invalidates the flow. It is deliberately not written to `localStorage` or another persistent store.

The implementation must avoid treating the existence of a normal session, a `/reset-password` pathname, or URL parameters alone as proof of recovery authorization.

### Routes and pages

- `/forgot-password`: public email request form.
- `/reset-password`: public route shell with a recovery-state gate.
- `/change-password`: protected route under `ProtectedRoute`.
- `AccountCard`: adds a navigation action to `/change-password`.

The two password pages may share presentational password-field components and validation helpers, but they must not share authorization conditions or submission functions.

### Session persistence

Keep the client configuration:

```ts
auth: {
  persistSession: true,
  autoRefreshToken: true,
  detectSessionInUrl: true,
}
```

Update the comment to state that persistence is intentional and that lifetime controls are enforced in Supabase Auth. Update `docs/SECURITY.md`, `docs/FRONTEND.md`, `docs/generated/ui-surface.md`, and any README statement that says tokens are memory-only.

Deployment settings should target:

- access-token/JWT lifetime near one hour;
- an explicit inactivity timeout appropriate to the product, initially 24 hours;
- an explicit maximum session lifetime, initially 14 days;
- refresh-token reuse detection enabled;
- global sign-out after password changes.

The Dashboard values are deployment configuration and must be recorded in the deployment checklist because they cannot be verified from frontend source code.

## Error Handling

Public UI messages must not expose raw Supabase errors or reveal whether an email is registered.

- Recovery email request: always show the generic success message when the request is accepted; map failures to a generic retry message.
- Invalid recovery state: show that the link is invalid or expired and provide a link to request another email.
- Incorrect current password: show a specific but non-sensitive current-password error.
- Weak or leaked new password: show Supabase's safe password-policy explanation after mapping known error codes.
- Rate limit: show a generic cooldown message without internal quota details.
- Unexpected Auth errors: show a generic failure and retain detailed diagnostics only in approved telemetry.

Submission buttons remain disabled during an active request to prevent accidental duplicate calls.

## Security Properties

The completed design must guarantee:

1. An ordinary logged-in session cannot render or submit the forgotten-password reset form.
2. A stolen ordinary session cannot change the password without the current password when the Supabase server setting is enabled.
3. A valid recovery email link can change the password without knowing the forgotten current password.
4. Passwords never pass through the FastAPI backend or application logs.
5. Recovery authorization is short-lived in browser memory and cannot survive a fresh direct visit to the route.
6. Successful password changes revoke refresh sessions through global sign-out; residual access-token validity remains bounded by the configured JWT expiry.
7. Persisted sessions are an explicit product policy rather than an undocumented implementation accident.

## Verification

### Auth context tests

- `PASSWORD_RECOVERY` activates recovery authorization and redirects to `/reset-password`.
- Normal `SIGNED_IN`, `TOKEN_REFRESHED`, and initial persisted-session loading do not activate recovery authorization.
- Sign-out clears session, user, and recovery authorization.

### Recovery page tests

- No session shows invalid-link state.
- Normal authenticated session with `recoveryActive=false` shows invalid-link state.
- Recovery session with `recoveryActive=true` shows the form.
- Mismatched and weak passwords are blocked locally.
- Successful update performs global sign-out and navigates to `/login`.
- Public error messages do not render raw provider errors.

### Change-password page tests

- Route redirects signed-out users to `/login`.
- Account card links authenticated users to `/change-password`.
- Current password, new password, and confirmation are required.
- The Supabase call includes the current-password proof and new password.
- Incorrect current password remains on the page with a safe error.
- Successful change signs out globally and redirects to `/login`.

### Configuration and regression checks

- The installed Supabase SDK type-checks the server-enforced current-password payload.
- A static test or focused assertion locks `persistSession: true` and its documented policy together.
- Run `npm run lint:ci`, `npx tsc --noEmit`, and the full `npx vitest run` after focused auth tests pass.
- Manually smoke-test signup confirmation, recovery-link expiry, normal-session rejection at `/reset-password`, password change, global sign-out, and persisted sign-in across a browser restart.

## Documentation Impact

Because routes and auth behavior change, the same implementation change set must update:

- `docs/FRONTEND.md`
- `docs/SECURITY.md`
- `docs/generated/ui-surface.md`
- `docs/product-specs/auth-and-account-flows.md`
- the frontend README when its setup or behavior statements are affected

No backend API inventory update is required because FastAPI receives no new authentication endpoint.
