# P0 Frontend Session and Render Resilience Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Recover once from expired Supabase tokens, present one clear re-login flow with a safe return route, and prevent React render failures from leaving a blank application.

**Architecture:** A framework-neutral session recovery service coalesces token refresh and emits one expiration event; Axios and later SSE code share it. AuthContext owns user-visible expiration state, while a root class Error Boundary stays outside all providers so it can recover even when the application shell fails.

**Tech Stack:** React 18, TypeScript, Axios, Supabase JS, React Router 7, Chakra UI, Vitest, Testing Library.

## Global Constraints

- A failed request receives at most one token refresh and one retry.
- Concurrent `401` responses share one refresh promise and one expiration event.
- Deliberate sign-out must never be labelled as expiration.
- Store only an internal relative path; reject `//`, schemes, `/login`, and external URLs.
- Do not persist or replay request bodies after a new login.
- The Error Boundary does not expose stack traces or user/session data.
- Existing Source Viewer local boundaries remain unchanged.
- Commit each task on `Multimodal_RAG_System/master`.

---

### Task 5: Shared Session Recovery and Axios Retry

**Files:**
- Create: `D:\flutterserver\Multimodal_RAG_System\src\services\sessionRecovery.ts`
- Create: `D:\flutterserver\Multimodal_RAG_System\src\services\sessionRecovery.test.ts`
- Modify: `D:\flutterserver\Multimodal_RAG_System\src\services\api.ts`
- Modify: `D:\flutterserver\Multimodal_RAG_System\src\services\api.interceptor.test.ts`

**Interfaces:**
- Produces: `getAccessToken() -> Promise<string | null>`.
- Produces: `refreshAccessToken() -> Promise<string | null>` with one shared in-flight refresh.
- Produces: `publishSessionExpired() -> Promise<void>` with idempotent local sign-out and notification.
- Produces: `subscribeSessionExpired(listener: () => void) -> () => void`.
- Produces: `resetSessionExpiration() -> void` after successful auth or deliberate sign-out.
- Later consumed by Task 6 AuthContext and Task 9 SSE transport.

- [ ] **Step 1: Write failing coalescing and notification tests**

```typescript
it('coalesces concurrent refreshes', async () => {
  refreshSessionMock.mockResolvedValue({
    data: { session: { access_token: 'fresh-token' } }, error: null,
  });
  const [first, second] = await Promise.all([
    refreshAccessToken(), refreshAccessToken(),
  ]);
  expect(first).toBe('fresh-token');
  expect(second).toBe('fresh-token');
  expect(refreshSessionMock).toHaveBeenCalledTimes(1);
});

it('publishes expiration and local sign-out once', async () => {
  const listener = vi.fn();
  const unsubscribe = subscribeSessionExpired(listener);
  await Promise.all([publishSessionExpired(), publishSessionExpired()]);
  expect(signOutMock).toHaveBeenCalledTimes(1);
  expect(signOutMock).toHaveBeenCalledWith({ scope: 'local' });
  expect(listener).toHaveBeenCalledTimes(1);
  unsubscribe();
});
```

Reset module state with `resetSessionExpiration()` in `beforeEach`.

- [ ] **Step 2: Run the service tests and verify RED**

```powershell
npx vitest run src/services/sessionRecovery.test.ts
```

Expected: module import fails because `sessionRecovery.ts` does not exist.

- [ ] **Step 3: Implement the minimal session service**

Use module-private state and these signatures:

```typescript
type SessionExpiredListener = () => void;

let refreshPromise: Promise<string | null> | null = null;
let expirationPromise: Promise<void> | null = null;
let expirationPublished = false;
const listeners = new Set<SessionExpiredListener>();

export async function getAccessToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

export async function refreshAccessToken(): Promise<string | null> {
  if (!refreshPromise) {
    refreshPromise = supabase.auth.refreshSession()
      .then(({ data, error }) => error ? null : data.session?.access_token ?? null)
      .catch(() => null)
      .finally(() => { refreshPromise = null; });
  }
  return refreshPromise;
}

export function subscribeSessionExpired(listener: SessionExpiredListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
```

`publishSessionExpired` must return the same `expirationPromise` while active, call local sign-out inside `try/finally`, and notify listeners exactly once even when sign-out itself reports an error. `resetSessionExpiration` clears only the idempotency state; it must not discard registered listeners.

- [ ] **Step 4: Write failing Axios retry tests**

Add tests that invoke the real response interceptor with an Axios-style config:

```typescript
it('refreshes and retries one 401 exactly once', async () => {
  refreshSessionMock.mockResolvedValue({
    data: { session: { access_token: 'fresh-token' } }, error: null,
  });
  const requestSpy = vi.spyOn(api, 'request').mockResolvedValue({ data: 'ok' });
  const result = await responseRejected({
    config: { url: '/rag/ask', headers: new AxiosHeaders() },
    response: { status: 401, data: {} }, message: 'Unauthorized',
  });
  expect(requestSpy).toHaveBeenCalledTimes(1);
  expect(requestSpy.mock.calls[0][0]._sessionRetry).toBe(true);
  expect(requestSpy.mock.calls[0][0].headers.get('Authorization')).toBe('Bearer fresh-token');
  expect(result).toEqual({ data: 'ok' });
});
```

Add tests proving `_sessionRetry: true` does not refresh again and refresh failure calls `publishSessionExpired` once while rejecting an `ApiError` with status 401.

- [ ] **Step 5: Replace duplicated token logic in Axios**

Remove `inFlightTokenRefresh` and `getRequestAccessToken` from `api.ts`. Import the Task 5 service. The request interceptor calls `getAccessToken()` and falls back to `refreshAccessToken()` only when no token exists.

Define the private config extension:

```typescript
type RetriableRequestConfig = InternalAxiosRequestConfig & {
  _sessionRetry?: boolean;
};
```

On 401, when `error.config` exists and `_sessionRetry` is not true, set it true, refresh, attach the fresh token, and return `api.request(config)`. If refresh fails—or a retried request receives 401—await `publishSessionExpired()` and then reject the normalized `ApiError`. Do not retry non-401 responses.

- [ ] **Step 6: Run focused service/API tests**

```powershell
npx vitest run src/services/sessionRecovery.test.ts src/services/api.interceptor.test.ts src/services/pdfApi.test.ts src/services/networkPolicy.test.ts
npx tsc --noEmit
```

Expected: all pass and refresh is called once under concurrency.

- [ ] **Step 7: Commit Task 5**

```powershell
git add src/services/sessionRecovery.ts src/services/sessionRecovery.test.ts src/services/api.ts src/services/api.interceptor.test.ts
git diff --cached --check
git commit -m "feat(auth): recover expired sessions once"
```

### Task 6: Expiration Dialog and Safe Return After Login

**Files:**
- Create: `D:\flutterserver\Multimodal_RAG_System\src\services\sessionReturnPath.ts`
- Create: `D:\flutterserver\Multimodal_RAG_System\src\services\sessionReturnPath.test.ts`
- Create: `D:\flutterserver\Multimodal_RAG_System\src\components\auth\SessionExpiredDialog.tsx`
- Create: `D:\flutterserver\Multimodal_RAG_System\src\components\auth\SessionExpiredDialog.test.tsx`
- Modify: `D:\flutterserver\Multimodal_RAG_System\src\contexts\auth-context.ts`
- Modify: `D:\flutterserver\Multimodal_RAG_System\src\contexts\AuthContext.tsx`
- Modify: `D:\flutterserver\Multimodal_RAG_System\src\contexts\AuthContext.test.tsx`
- Modify: `D:\flutterserver\Multimodal_RAG_System\src\App.tsx`
- Modify: `D:\flutterserver\Multimodal_RAG_System\src\pages\Login.tsx`
- Modify: `D:\flutterserver\Multimodal_RAG_System\src\pages\Login.test.tsx`

**Interfaces:**
- Produces: `saveSessionReturnPath(path: string) -> void`.
- Produces: `consumeSessionReturnPath() -> string | null`.
- AuthContext adds `sessionExpired: boolean` and `acknowledgeSessionExpired(): void`.
- Consumes Task 5 `subscribeSessionExpired` and `resetSessionExpiration`.

- [ ] **Step 1: Write failing safe-path tests**

```typescript
it.each([
  ['https://evil.example', null],
  ['//evil.example/path', null],
  ['/login', null],
  ['/chat?mode=rag#source', '/chat?mode=rag#source'],
])('stores only safe internal routes', (candidate, expected) => {
  saveSessionReturnPath(candidate);
  expect(consumeSessionReturnPath()).toBe(expected);
  expect(consumeSessionReturnPath()).toBeNull();
});
```

Use `sessionStorage` key `rag.session.return-path.v1`. `consume` always removes the key, even if corrupted.

- [ ] **Step 2: Run safe-path tests and verify RED**

```powershell
npx vitest run src/services/sessionReturnPath.test.ts
```

Expected: module does not exist.

- [ ] **Step 3: Implement safe route persistence**

```typescript
const RETURN_PATH_KEY = 'rag.session.return-path.v1';

function normalizeInternalPath(path: string): string | null {
  if (!path.startsWith('/') || path.startsWith('//')) return null;
  const parsed = new URL(path, window.location.origin);
  if (parsed.origin !== window.location.origin || parsed.pathname === '/login') return null;
  return `${parsed.pathname}${parsed.search}${parsed.hash}`;
}
```

`saveSessionReturnPath` writes only a normalized value and removes stale storage on invalid input. `consumeSessionReturnPath` reads, removes, then revalidates.

- [ ] **Step 4: Add expiration state to AuthProvider**

In AuthContext add:

```typescript
sessionExpired: boolean;
acknowledgeSessionExpired: () => void;
```

In the provider, subscribe once to Task 5 events. The listener saves
`window.location.pathname + window.location.search + window.location.hash` unless already on `/login`, sets `sessionExpired` true, and clears session/user. On `SIGNED_IN` or `TOKEN_REFRESHED`, call `resetSessionExpiration()` and clear the flag. Deliberate `signOut()` clears the flag before calling Supabase and resets service idempotency.

Extend `AuthContext.test.tsx` to assert one expiration event shows state true, duplicate events remain one state transition, and deliberate sign-out leaves it false.

- [ ] **Step 5: Build the blocking but concise dialog**

`SessionExpiredDialog` uses Chakra `AlertDialog` with:

```text
Title: 登入已過期
Body: 為了保護你的資料，請重新登入後繼續。
Button: 前往登入
```

On confirmation call `acknowledgeSessionExpired()` then `navigate('/login?reason=expired', { replace: true })`. Do not include a dismiss/cancel action that leaves the protected UI appearing authenticated.

Move `Router` outside `AuthProvider` in `App.tsx`, mount the dialog immediately inside the provider, then keep Suspense/Routes unchanged:

```tsx
<Router>
  <AuthProvider>
    <SessionExpiredDialog />
    <Suspense>{/* existing Routes */}</Suspense>
  </AuthProvider>
</Router>
```

- [ ] **Step 6: Restore the saved route after login**

When `Login` observes a non-null session, consume the saved path and navigate there; otherwise preserve existing default dashboard behavior:

```typescript
const destination = consumeSessionReturnPath() ?? '/dashboard';
void navigate(destination, { replace: true });
```

Tests must cover saved `/chat?mode=rag`, unsafe storage fallback to `/dashboard`, and normal login with no saved path.

- [ ] **Step 7: Run focused auth/UI tests**

```powershell
npx vitest run src/services/sessionReturnPath.test.ts src/contexts/AuthContext.test.tsx src/components/auth/SessionExpiredDialog.test.tsx src/pages/Login.test.tsx src/App.smoke.test.tsx
npx tsc --noEmit
```

Expected: all pass and no test navigates to an external origin.

- [ ] **Step 8: Commit Task 6**

```powershell
git add src/services/sessionReturnPath.ts src/services/sessionReturnPath.test.ts src/components/auth/SessionExpiredDialog.tsx src/components/auth/SessionExpiredDialog.test.tsx src/contexts/auth-context.ts src/contexts/AuthContext.tsx src/contexts/AuthContext.test.tsx src/App.tsx src/pages/Login.tsx src/pages/Login.test.tsx
git diff --cached --check
git commit -m "feat(auth): explain session expiry and restore route"
```

- [ ] **Middle review gate after this commit**

Dispatch exactly one review agent for Tasks 1-6. Provide both commit ranges and the approved spec. Do not dispatch six separate reviewers. Validate every proposed finding with a reproducer or code-path proof before changing code; use `superpowers:receiving-code-review`, commit confirmed fixes in the owning repository, and rerun all focused tests from Plans 1-3.

### Task 7: Root React Error Boundary

**Files:**
- Create: `D:\flutterserver\Multimodal_RAG_System\src\components\system\AppErrorBoundary.tsx`
- Create: `D:\flutterserver\Multimodal_RAG_System\src\components\system\AppErrorBoundary.test.tsx`
- Modify: `D:\flutterserver\Multimodal_RAG_System\src\main.tsx`

**Interfaces:**
- Produces: `AppErrorBoundary` class component wrapping the entire application, including Chakra, Router, Auth, and lazy routes.
- Uses browser actions `window.location.reload()` and `window.location.assign('/')` through injectable/default callbacks for testability.

- [ ] **Step 1: Write failing boundary tests**

```typescript
const Crash = () => { throw new Error('render secret stack'); };

it('renders safe recovery actions without the exception text', () => {
  const reload = vi.fn();
  const goHome = vi.fn();
  render(
    <AppErrorBoundary onReload={reload} onGoHome={goHome}>
      <Crash />
    </AppErrorBoundary>
  );
  expect(screen.getByRole('heading', { name: '應用程式發生錯誤' })).toBeInTheDocument();
  expect(screen.queryByText(/render secret stack/)).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: '重新載入' }));
  fireEvent.click(screen.getByRole('button', { name: '回首頁' }));
  expect(reload).toHaveBeenCalledOnce();
  expect(goHome).toHaveBeenCalledOnce();
});
```

Also assert healthy children render unchanged.

- [ ] **Step 2: Run the test and verify RED**

```powershell
npx vitest run src/components/system/AppErrorBoundary.test.tsx
```

Expected: module does not exist.

- [ ] **Step 3: Implement the root class boundary**

Use `Component<Props, { hasError: boolean }>` with `getDerivedStateFromError` and `componentDidCatch`. Render plain semantic HTML with locally scoped inline styles so the fallback still works if Chakra/theme initialization caused the crash. Log only via `console.error('Uncaught React render error', error, info)`; never interpolate it into JSX.

Default callbacks:

```typescript
onReload = () => window.location.reload();
onGoHome = () => window.location.assign('/');
```

Wrap `<App />` inside the boundary in `main.tsx`, beneath `React.StrictMode`.

- [ ] **Step 4: Run boundary and smoke tests**

```powershell
npx vitest run src/components/system/AppErrorBoundary.test.tsx src/App.smoke.test.tsx src/components/evidence/LazySourceViewerBoundary.test.tsx
npx tsc --noEmit
```

Expected: root and local boundaries both pass.

- [ ] **Step 5: Commit Task 7**

```powershell
git add src/components/system/AppErrorBoundary.tsx src/components/system/AppErrorBoundary.test.tsx src/main.tsx
git diff --cached --check
git commit -m "feat(app): add global render error recovery"
```
