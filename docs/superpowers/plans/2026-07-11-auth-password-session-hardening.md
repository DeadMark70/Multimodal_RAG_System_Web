# Auth Password and Session Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Separate email-link password recovery from authenticated current-password changes while intentionally preserving Supabase sessions across browser restarts.

**Architecture:** `AuthProvider` owns an in-memory `recoveryActive` capability emitted only by Supabase `PASSWORD_RECOVERY`. The existing reset page requires that capability, while a new protected `/change-password` page uses Supabase's server-enforced `current_password` update contract. Supabase remains the only system that receives passwords; FastAPI is unchanged.

**Tech Stack:** React 18, TypeScript, Vite 7, Chakra UI, React Router, Supabase JS `2.110.2`, Vitest, Testing Library.

## Global Constraints

- Keep `persistSession: true`, `autoRefreshToken: true`, and `detectSessionInUrl: true`.
- Passwords must never pass through FastAPI, application logs, URL parameters, or persistent browser storage.
- `/reset-password` requires both an active Supabase session and `recoveryActive === true`.
- `/change-password` requires a normal authenticated route and Supabase server-side current-password verification.
- Do not substitute `signInWithPassword` followed by `updateUser` if `current_password` is unavailable.
- Forgotten-password public responses must remain account-enumeration-safe and must not display raw provider errors.
- Successful password recovery and password change must invoke the existing global-sign-out flow and return to `/login`.
- Initial deployment targets: JWT expiry near one hour, inactivity timeout 24 hours, maximum session lifetime 14 days, refresh-token reuse detection enabled.
- Route/UI/auth behavior changes require same-change-set updates to `docs/FRONTEND.md`, `docs/SECURITY.md`, `docs/generated/ui-surface.md`, and `docs/product-specs/auth-and-account-flows.md`.
- Run `npm run lint:ci`, `npx tsc --noEmit`, and full `npx vitest run` before completion.

## File Structure

- Modify `package.json` and `package-lock.json`: pin Supabase JS `2.110.2` and install matching Auth types/runtime.
- Create `src/services/authPassword.ts`: password validation and safe Supabase Auth error mapping shared by both password pages.
- Create `src/services/authPassword.test.ts`: deterministic validation/error-mapping coverage.
- Modify `src/contexts/auth-context.ts`: expose `recoveryActive`.
- Modify `src/contexts/AuthContext.tsx`: derive recovery capability from Auth events and clear it on sign-out.
- Modify `src/contexts/AuthContext.test.tsx`: lock recovery capability transitions and persistence behavior.
- Modify `src/pages/ResetPassword.tsx` and `src/pages/ResetPassword.test.tsx`: require recovery capability and use safe errors.
- Create `src/pages/ChangePassword.tsx` and `src/pages/ChangePassword.test.tsx`: protected current-password change flow.
- Modify `src/App.tsx` and `src/App.smoke.test.tsx`: register lazy protected `/change-password`.
- Modify `src/components/layout/AccountCard.tsx` and its test: expose the change-password entry.
- Create `src/services/supabase.test.ts`: lock intentional persisted-session configuration.
- Modify `src/services/supabase.ts`: correct the persistence comment without changing the selected policy.
- Modify frontend auth/security docs listed in Global Constraints.

---

### Task 1: Upgrade Supabase JS and prove the current-password contract

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`

**Interfaces:**
- Consumes: npm package `@supabase/supabase-js@2.110.2`.
- Produces: `supabase.auth.updateUser({ current_password, password })` that type-checks without casts.

- [ ] **Step 1: Record the current dependency state**

Run:

```powershell
node -e "const p=require('./package-lock.json'); console.log(p.packages['node_modules/@supabase/supabase-js'].version)"
```

Expected: `2.89.0`.

- [ ] **Step 2: Upgrade to the reviewed version**

Run:

```powershell
npm install @supabase/supabase-js@2.110.2 --save-exact
```

Expected: `package.json` and `package-lock.json` pin `2.110.2`; npm exits `0`.

- [ ] **Step 3: Verify the installed contract before proceeding**

Run:

```powershell
rg -n "current_password" node_modules/@supabase/auth-js node_modules/@supabase/supabase-js -g "*.ts" -g "*.d.ts"
```

Expected: the installed user-update attributes include `current_password`. If no result appears, stop and revise the approved design; do not continue with a client-only password check.

- [ ] **Step 4: Verify the dependency-only change**

Run:

```powershell
npx tsc --noEmit
```

Expected: PASS with exit code `0`.

- [ ] **Step 5: Commit**

```powershell
git add package.json package-lock.json
git commit -m "build(auth): upgrade Supabase client"
```

### Task 2: Add shared password validation and safe error mapping

**Files:**
- Create: `src/services/authPassword.ts`
- Create: `src/services/authPassword.test.ts`

**Interfaces:**
- Consumes: an unknown provider error and password form strings.
- Produces: `MIN_PASSWORD_LENGTH`, `validateNewPassword(password, confirmation): string | null`, and `getPasswordAuthErrorMessage(error, operation): string`.

- [ ] **Step 1: Write failing helper tests**

Create `src/services/authPassword.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { getPasswordAuthErrorMessage, validateNewPassword } from './authPassword';

describe('validateNewPassword', () => {
  it('requires at least 12 characters', () => {
    expect(validateNewPassword('short-pass', 'short-pass')).toBe('密碼長度至少需要 12 個字元。');
  });

  it('requires matching confirmation', () => {
    expect(validateNewPassword('strong-password-1', 'strong-password-2')).toBe('兩次輸入的密碼不一致。');
  });

  it('accepts a matching password of at least 12 characters', () => {
    expect(validateNewPassword('strong-password-1', 'strong-password-1')).toBeNull();
  });
});

describe('getPasswordAuthErrorMessage', () => {
  it('maps current-password failures without exposing raw provider text', () => {
    expect(getPasswordAuthErrorMessage({ code: 'invalid_credentials', message: 'internal detail' }, 'change'))
      .toBe('目前密碼不正確。');
  });

  it('maps rate limits to generic cooldown copy', () => {
    expect(getPasswordAuthErrorMessage({ status: 429, message: 'quota detail' }, 'recovery'))
      .toBe('嘗試次數過多，請稍後再試。');
  });

  it('does not return unknown provider messages', () => {
    expect(getPasswordAuthErrorMessage(new Error('sensitive provider detail'), 'change'))
      .toBe('更新密碼失敗，請稍後再試。');
  });
});
```

- [ ] **Step 2: Run the tests and confirm the missing module failure**

Run:

```powershell
npx vitest run src/services/authPassword.test.ts
```

Expected: FAIL because `./authPassword` does not exist.

- [ ] **Step 3: Implement the helper**

Create `src/services/authPassword.ts`:

```ts
export const MIN_PASSWORD_LENGTH = 12;

type PasswordOperation = 'change' | 'recovery';

type AuthErrorShape = {
  code?: unknown;
  status?: unknown;
};

export function validateNewPassword(password: string, confirmation: string): string | null {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `密碼長度至少需要 ${MIN_PASSWORD_LENGTH} 個字元。`;
  }
  if (password !== confirmation) {
    return '兩次輸入的密碼不一致。';
  }
  return null;
}

export function getPasswordAuthErrorMessage(error: unknown, operation: PasswordOperation): string {
  const shape = typeof error === 'object' && error !== null ? error as AuthErrorShape : {};
  if (shape.status === 429 || shape.code === 'over_request_rate_limit') {
    return '嘗試次數過多，請稍後再試。';
  }
  if (operation === 'change' && (shape.code === 'invalid_credentials' || shape.code === 'same_password')) {
    return shape.code === 'same_password' ? '新密碼不可與目前密碼相同。' : '目前密碼不正確。';
  }
  if (shape.code === 'weak_password') {
    return '新密碼不符合安全要求，請改用較長且未曾洩漏的密碼。';
  }
  return operation === 'change'
    ? '更新密碼失敗，請稍後再試。'
    : '重設密碼失敗，請重新申請重設連結。';
}
```

- [ ] **Step 4: Run the focused tests**

Run: `npx vitest run src/services/authPassword.test.ts`

Expected: PASS, 6 tests.

- [ ] **Step 5: Commit**

```powershell
git add src/services/authPassword.ts src/services/authPassword.test.ts
git commit -m "feat(auth): add password validation helpers"
```

### Task 3: Add explicit recovery authorization to AuthProvider

**Files:**
- Modify: `src/contexts/auth-context.ts:4-9`
- Modify: `src/contexts/AuthContext.tsx:6-48`
- Modify: `src/contexts/AuthContext.test.tsx`
- Modify: auth-context fixtures in tests returned by `rg -l "AuthContextType" src --glob "*.test.tsx"`

**Interfaces:**
- Consumes: Supabase `AuthChangeEvent` values.
- Produces: `AuthContextType.recoveryActive: boolean`; only `PASSWORD_RECOVERY` activates it.

- [ ] **Step 1: Add failing recovery-state tests**

In `src/contexts/AuthContext.test.tsx`, add a probe:

```tsx
const RecoveryProbe = () => {
  const { recoveryActive } = useAuth();
  return <div data-testid="recovery-active">{String(recoveryActive)}</div>;
};
```

Add tests asserting:

```tsx
it('activates recovery only after PASSWORD_RECOVERY', async () => {
  const { getByTestId } = render(<AuthProvider><RecoveryProbe /></AuthProvider>);
  await waitFor(() => expect(authStateChangeCallback).not.toBeNull());
  expect(getByTestId('recovery-active')).toHaveTextContent('false');
  act(() => authStateChangeCallback?.('PASSWORD_RECOVERY', null));
  expect(getByTestId('recovery-active')).toHaveTextContent('true');
});

it('does not activate recovery for a persisted normal session', async () => {
  getSessionMock.mockResolvedValue({ data: { session: { user: { id: '1' } } } });
  const { getByTestId } = render(<AuthProvider><RecoveryProbe /></AuthProvider>);
  await waitFor(() => expect(getByTestId('recovery-active')).toHaveTextContent('false'));
});

it('clears recovery state on sign-out', async () => {
  signOutMock.mockResolvedValue({ error: null });
  const { getByRole, getByTestId } = render(<AuthProvider><RecoveryProbe /><TriggerSignOut /></AuthProvider>);
  await waitFor(() => expect(authStateChangeCallback).not.toBeNull());
  act(() => authStateChangeCallback?.('PASSWORD_RECOVERY', null));
  act(() => getByRole('button', { name: 'sign-out' }).click());
  await waitFor(() => expect(getByTestId('recovery-active')).toHaveTextContent('false'));
});
```

- [ ] **Step 2: Run and verify the tests fail**

Run: `npx vitest run src/contexts/AuthContext.test.tsx`

Expected: FAIL because `recoveryActive` is absent.

- [ ] **Step 3: Extend the context type and provider**

Add to `AuthContextType`:

```ts
recoveryActive: boolean;
```

In `AuthProvider`, add:

```ts
const [recoveryActive, setRecoveryActive] = useState(false);
```

Inside `onAuthStateChange`:

```ts
if (event === 'PASSWORD_RECOVERY') {
  setRecoveryActive(true);
  if (window.location.pathname !== '/reset-password') {
    window.history.replaceState(window.history.state, '', '/reset-password');
  }
}
if (event === 'SIGNED_OUT') {
  setRecoveryActive(false);
}
```

In `signOut`, clear recovery state after successful global or local cleanup, and provide it from context:

```tsx
setRecoveryActive(false);

<AuthContext.Provider value={{ session, user, loading, recoveryActive, signOut }}>
```

- [ ] **Step 4: Update typed test fixtures mechanically**

For every `AuthContextType` object fixture found by:

```powershell
rg -l "AuthContextType" src --glob "*.test.tsx"
```

add `recoveryActive: false`, except recovery-specific fixtures that explicitly use `true`.

- [ ] **Step 5: Run focused auth tests and type-check**

Run:

```powershell
npx vitest run src/contexts/AuthContext.test.tsx
npx tsc --noEmit
```

Expected: both PASS.

- [ ] **Step 6: Commit**

```powershell
git add src/contexts/auth-context.ts src/contexts/AuthContext.tsx src/contexts/AuthContext.test.tsx src/pages/Signup.test.tsx src/pages/ResetPassword.test.tsx src/pages/Login.test.tsx src/components/layout/Sidebar.ui.test.tsx src/components/layout/AccountCard.test.tsx src/components/layout/Layout.test.tsx
git commit -m "feat(auth): track password recovery authorization"
```

### Task 4: Gate the recovery page with recovery authorization

**Files:**
- Modify: `src/pages/ResetPassword.tsx`
- Modify: `src/pages/ResetPassword.test.tsx`
- Modify: `src/pages/ForgotPassword.tsx`
- Modify: `src/pages/ForgotPassword.test.tsx`

**Interfaces:**
- Consumes: `useAuth().recoveryActive`, `validateNewPassword`, and `getPasswordAuthErrorMessage`.
- Produces: a recovery-only reset form; normal sessions receive the invalid-link state.

- [ ] **Step 1: Write the normal-session rejection test**

In `ResetPassword.test.tsx`, make the default fixture include `recoveryActive: true`, then add:

```tsx
it('rejects an ordinary authenticated session without recovery authorization', () => {
  useAuthMock.mockReturnValue({
    session: { user: { id: '1' } } as AuthContextType['session'],
    user: { id: '1' } as AuthContextType['user'],
    loading: false,
    recoveryActive: false,
    signOut: signOutMock,
  });
  render(<ChakraProvider theme={theme}><MemoryRouter><ResetPassword /></MemoryRouter></ChakraProvider>);
  expect(screen.getByRole('heading', { name: '重設連結不可用' })).toBeInTheDocument();
  expect(updateUserMock).not.toHaveBeenCalled();
});
```

Add an error-sanitization test that rejects with `new Error('provider internal detail')` and expects only `重設密碼失敗，請重新申請重設連結。`.

In `ForgotPassword.test.tsx`, strengthen the existing failure test:

```tsx
resetPasswordForEmailMock.mockRejectedValueOnce(new Error('provider internal detail'));
render(
  <ChakraProvider theme={theme}>
    <MemoryRouter><ForgotPassword /></MemoryRouter>
  </ChakraProvider>
);
fireEvent.change(screen.getByLabelText(/Email/), { target: { value: 'user@example.com' } });
fireEvent.click(screen.getByRole('button', { name: '發送重設郵件' }));
expect(await screen.findByText('寄送失敗，請稍後再試。')).toBeInTheDocument();
expect(screen.queryByText('provider internal detail')).not.toBeInTheDocument();
```

- [ ] **Step 2: Run and verify failure**

Run: `npx vitest run src/pages/ResetPassword.test.tsx`

Expected: normal-session test FAIL because the existing page checks only `session`.

- [ ] **Step 3: Implement the recovery gate and shared validation**

Change the auth read to:

```ts
const { session, loading, recoveryActive, signOut } = useAuth();
```

Replace the local password checks with:

```ts
const validationError = validateNewPassword(password, confirmPassword);
if (validationError) {
  setErrorMessage(validationError);
  return;
}
```

Gate both submission and rendering with:

```ts
if (!session || !recoveryActive) {
  setErrorMessage('重設連結已失效，請重新申請重設密碼。');
  return;
}
```

and:

```tsx
if (!session || !recoveryActive) {
  return <InvalidRecoveryLink />;
}
```

Map caught errors using:

```ts
const message = getPasswordAuthErrorMessage(error, 'recovery');
setErrorMessage(message);
toast({ title: '密碼更新失敗', description: message, status: 'error' });
```

In `ForgotPassword.tsx`, keep `GENERIC_ERROR_MESSAGE` for both inline and toast output:

```ts
setErrorMessage(GENERIC_ERROR_MESSAGE);
toast({
  title: '無法寄送重設信件',
  description: GENERIC_ERROR_MESSAGE,
  status: 'error',
});
```

- [ ] **Step 4: Run the recovery tests**

Run: `npx vitest run src/pages/ResetPassword.test.tsx src/pages/ForgotPassword.test.tsx`

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add src/pages/ResetPassword.tsx src/pages/ResetPassword.test.tsx src/pages/ForgotPassword.tsx src/pages/ForgotPassword.test.tsx
git commit -m "fix(auth): restrict reset form to recovery sessions"
```

### Task 5: Build the protected current-password change page

**Files:**
- Create: `src/pages/ChangePassword.tsx`
- Create: `src/pages/ChangePassword.test.tsx`
- Modify: `src/App.tsx`
- Modify: `src/App.smoke.test.tsx`

**Interfaces:**
- Consumes: `supabase.auth.updateUser({ current_password, password })`, shared validation/error mapping, and `useAuth().signOut`.
- Produces: protected route `/change-password`.

- [ ] **Step 1: Write failing page tests**

Create `ChangePassword.test.tsx` with typed Supabase and auth mocks. Cover:

```tsx
it('submits current and new passwords to Supabase', async () => {
  // render with an authenticated AuthContext fixture
  fireEvent.change(screen.getByLabelText('目前密碼'), { target: { value: 'old-password-123' } });
  fireEvent.change(screen.getByLabelText(/^新密碼/), { target: { value: 'new-password-123' } });
  fireEvent.change(screen.getByLabelText('確認新密碼'), { target: { value: 'new-password-123' } });
  fireEvent.click(screen.getByRole('button', { name: '更新密碼' }));
  await waitFor(() => expect(updateUserMock).toHaveBeenCalledWith({
    current_password: 'old-password-123',
    password: 'new-password-123',
  }));
});

it('requires the current password', async () => {
  // fill only matching new passwords and submit
  expect(await screen.findByText('請輸入目前密碼。')).toBeInTheDocument();
  expect(updateUserMock).not.toHaveBeenCalled();
});

it('signs out and redirects after success', async () => {
  // submit a valid form
  await waitFor(() => expect(signOutMock).toHaveBeenCalledTimes(1));
  expect(navigateMock).toHaveBeenCalledWith('/login', { replace: true });
});

it('maps an incorrect current password safely', async () => {
  updateUserMock.mockResolvedValue({ data: { user: null }, error: { code: 'invalid_credentials', message: 'raw detail' } });
  // submit a valid form
  expect(await screen.findByText('目前密碼不正確。')).toBeInTheDocument();
  expect(screen.queryByText('raw detail')).not.toBeInTheDocument();
});
```

- [ ] **Step 2: Run and verify the page is missing**

Run: `npx vitest run src/pages/ChangePassword.test.tsx`

Expected: FAIL because `ChangePassword.tsx` does not exist.

- [ ] **Step 3: Implement the page**

Create a Chakra form matching the existing auth pages. Its submission core must be:

```ts
const submitPasswordChange = async () => {
  if (!currentPassword) {
    setErrorMessage('請輸入目前密碼。');
    return;
  }
  const validationError = validateNewPassword(password, confirmPassword);
  if (validationError) {
    setErrorMessage(validationError);
    return;
  }
  setSubmitting(true);
  setErrorMessage('');
  try {
    const { error } = await supabase.auth.updateUser({
      current_password: currentPassword,
      password,
    });
    if (error) throw error;
    await signOut();
    toast({ title: '密碼更新成功', description: '請使用新密碼重新登入。', status: 'success' });
    void navigate('/login', { replace: true });
  } catch (error) {
    const message = getPasswordAuthErrorMessage(error, 'change');
    setErrorMessage(message);
    toast({ title: '密碼更新失敗', description: message, status: 'error' });
  } finally {
    setSubmitting(false);
  }
};
```

Use `autoComplete="current-password"` for the current password and `autoComplete="new-password"` for both new-password fields.

- [ ] **Step 4: Register the protected lazy route**

In `App.tsx` add:

```ts
const ChangePassword = lazy(() => import('./pages/ChangePassword'));
```

Inside the existing `ProtectedRoute` group add:

```tsx
<Route path="/change-password" element={<ChangePassword />} />
```

In `App.smoke.test.tsx`, mock the page and assert that an authenticated `/change-password` location renders `Change Password Page` through the protected group.

- [ ] **Step 5: Run page, routing, and type verification**

Run:

```powershell
npx vitest run src/pages/ChangePassword.test.tsx src/App.smoke.test.tsx
npx tsc --noEmit
```

Expected: all PASS and no cast around `current_password`.

- [ ] **Step 6: Commit**

```powershell
git add src/pages/ChangePassword.tsx src/pages/ChangePassword.test.tsx src/App.tsx src/App.smoke.test.tsx
git commit -m "feat(auth): add protected password change flow"
```

### Task 6: Add the account-card entry

**Files:**
- Modify: `src/components/layout/AccountCard.tsx:12-145`
- Modify: `src/components/layout/AccountCard.test.tsx`

**Interfaces:**
- Consumes: React Router `navigate`.
- Produces: visible `修改密碼` button navigating to `/change-password`.

- [ ] **Step 1: Write the failing navigation test**

Add to `AccountCard.test.tsx`:

```tsx
it('opens the protected change-password page', () => {
  render(
    <ChakraProvider theme={theme}>
      <MemoryRouter><AccountCard onOpenSettings={vi.fn()} /></MemoryRouter>
    </ChakraProvider>
  );
  fireEvent.click(screen.getByRole('button', { name: '修改密碼' }));
  expect(navigateMock).toHaveBeenCalledWith('/change-password');
});
```

- [ ] **Step 2: Run and verify failure**

Run: `npx vitest run src/components/layout/AccountCard.test.tsx`

Expected: FAIL because no `修改密碼` button exists.

- [ ] **Step 3: Implement the account action**

Import `FiKey` and add a button without changing the existing settings/logout behavior:

```tsx
<Button
  width="full"
  size="sm"
  variant="ghost"
  leftIcon={<FiKey />}
  onClick={() => void navigate('/change-password')}
>
  修改密碼
</Button>
```

Place it between the identity row and the existing settings/logout action row so all three actions remain legible at sidebar width.

- [ ] **Step 4: Run the focused test**

Run: `npx vitest run src/components/layout/AccountCard.test.tsx`

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add src/components/layout/AccountCard.tsx src/components/layout/AccountCard.test.tsx
git commit -m "feat(auth): link account card to password change"
```

### Task 7: Lock and document persistent-session policy

**Files:**
- Create: `src/services/supabase.test.ts`
- Modify: `src/services/supabase.ts:10-17`
- Modify: `docs/SECURITY.md`
- Modify: `docs/FRONTEND.md`
- Modify: `docs/generated/ui-surface.md`
- Modify: `docs/product-specs/auth-and-account-flows.md`
- Modify: `README.md` only if its auth/session statements imply memory-only storage.

**Interfaces:**
- Consumes: Supabase `createClient` configuration.
- Produces: executable and documented policy that sessions persist across browser restarts.

- [ ] **Step 1: Write the configuration test**

Create `src/services/supabase.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest';

const createClientMock = vi.fn(() => ({}));

vi.mock('@supabase/supabase-js', () => ({ createClient: createClientMock }));

describe('Supabase auth configuration', () => {
  beforeEach(() => createClientMock.mockClear());

  it('intentionally persists and refreshes browser sessions', async () => {
    await import('./supabase');
    expect(createClientMock).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(String),
      expect.objectContaining({
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
      })
    );
  });
});
```

- [ ] **Step 2: Run the test against the current behavior**

Run: `npx vitest run src/services/supabase.test.ts`

Expected: PASS for behavior; this is a characterization test protecting the approved policy.

- [ ] **Step 3: Correct the misleading source comment**

Replace the memory-only comment with:

```ts
// Persist sessions across browser restarts by product policy.
// Supabase Auth settings enforce JWT expiry, inactivity, maximum lifetime, and refresh-token reuse detection.
persistSession: true,
```

- [ ] **Step 4: Update current-system documentation**

Make these exact semantic changes:

- `docs/SECURITY.md`: replace the false non-persistent claim with intentional persistence and the required Supabase lifetime controls; document recovery-state and current-password separation.
- `docs/FRONTEND.md`: add `/change-password`, describe `recoveryActive`, and replace both memory-only claims.
- `docs/generated/ui-surface.md`: add the route row and change `supabase.ts` from non-persistent to intentional persisted-session bootstrap.
- `docs/product-specs/auth-and-account-flows.md`: add outcomes for recovery-only reset, authenticated current-password change, and post-change sign-out.
- `README.md`: update only statements contradicted by the new behavior.

Add a deployment checklist block containing exact targets: JWT near 1 hour, inactivity 24 hours, maximum lifetime 14 days, refresh-token reuse detection enabled, explicit production reset redirect.

- [ ] **Step 5: Verify no false persistence claim remains**

Run:

```powershell
rg -n "persistSession=false|non-persistent|memory-only|記憶體" docs README.md src/services/supabase.ts
```

Expected: no statement claims that the Supabase Auth session is memory-only; unrelated uses must be manually inspected.

- [ ] **Step 6: Run focused verification**

Run:

```powershell
npx vitest run src/services/supabase.test.ts src/contexts/AuthContext.test.tsx
npx tsc --noEmit
```

Expected: PASS.

- [ ] **Step 7: Commit**

```powershell
git add src/services/supabase.ts src/services/supabase.test.ts docs README.md
git commit -m "docs(auth): align persistent session policy"
```

### Task 8: Full regression and manual security verification

**Files:**
- Modify only files required to correct failures caused by Tasks 1–7; do not broaden scope.

**Interfaces:**
- Consumes: all completed auth changes.
- Produces: CI-equivalent evidence and a deployment checklist for Supabase Dashboard settings.

- [ ] **Step 1: Run auth-focused tests together**

Run:

```powershell
npx vitest run src/services/authPassword.test.ts src/services/supabase.test.ts src/contexts/AuthContext.test.tsx src/pages/ForgotPassword.test.tsx src/pages/ResetPassword.test.tsx src/pages/ChangePassword.test.tsx src/components/layout/AccountCard.test.tsx src/App.smoke.test.tsx
```

Expected: all focused tests PASS.

- [ ] **Step 2: Run lint**

Run: `npm run lint:ci`

Expected: PASS with zero warnings.

- [ ] **Step 3: Run the TypeScript compiler**

Run: `npx tsc --noEmit`

Expected: PASS; especially no unsafe cast for `current_password`.

- [ ] **Step 4: Run the complete frontend test suite**

Run: `npx vitest run`

Expected: all tests PASS. If the Windows sandbox returns `spawn EPERM`, request escalated execution once and rerun the same command.

- [ ] **Step 5: Run the production build**

Run: `npm run build`

Expected: PASS and a generated `dist/` bundle without TypeScript or chunk errors.

- [ ] **Step 6: Perform live Supabase smoke checks**

Using a non-production test account, verify in order:

1. Closing and reopening the browser preserves a normal signed-in session.
2. Direct `/reset-password` navigation from that normal session shows `重設連結不可用`.
3. A valid recovery email link emits recovery state and exposes the reset form.
4. An expired or reused recovery link cannot expose the form.
5. Recovery succeeds without the old password, revokes sessions, and requires a new login.
6. `/change-password` rejects a wrong current password.
7. `/change-password` accepts the correct current password, revokes sessions, and requires the new password.
8. Supabase Dashboard shows JWT near 1 hour, inactivity 24 hours, maximum lifetime 14 days, refresh-token reuse detection enabled, and explicit redirect URLs.

- [ ] **Step 7: Confirm the working tree contains no uncommitted auth changes**

Run: `git status --short`

Expected: no uncommitted files from Tasks 1–7. If a verification command required a correction, return to the owning task, repeat its focused red/green cycle, and create a new commit containing only that task's listed files before claiming completion.

## Completion Criteria

- Ordinary sessions cannot use `/reset-password`.
- Valid email recovery sessions can set a new password without the forgotten current password.
- Authenticated password changes require the current password at the Supabase server boundary.
- `persistSession: true` is tested, intentional, and accurately documented.
- Auth error messages do not leak raw provider details.
- No password touches FastAPI.
- Focused tests, lint, TypeScript, full Vitest, and production build all pass.
- Dashboard-only controls are verified and recorded during manual smoke testing.
