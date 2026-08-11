# Middle Review Frontend Fixes Report

Date: 2026-08-11

Frontend repository: `D:\flutterserver\Multimodal_RAG_System`

Base: `0458b6d5df4814b8c32ac14ffdcfc412fde5767f`

## Scope

Implemented only the four confirmed middle-review frontend findings:

1. Strict runtime bbox geometry validation.
2. Intentional sign-out suppression for delayed session-expiration UX.
3. At most one refresh attempt per Axios API operation.
4. Canonical `/login/` return-path exclusion.

No Task 7+ work, UI redesign, framework change, or credential logging was added. The pre-existing untracked `.superpowers/brainstorm/` directory was not read, edited, or staged.

## Fix A — bbox geometry

### RED

Added literal reversed-axis and zero-area cases in `src/types/evidence.test.ts`:

- reversed x-axis `[0.8, 0.2, 0.1, 0.4]`
- reversed y-axis `[0.1, 0.7, 0.8, 0.2]`
- zero width `[0.4, 0.2, 0.4, 0.7]`
- zero height `[0.1, 0.5, 0.8, 0.5]`

Command:

```text
npm test -- src/types/evidence.test.ts --run
```

Observed: 4 new tests failed and 4 existing tests passed. Each failure received the invalid bbox and `provenanceStatus: "full"` instead of `bbox: null` and `provenanceStatus: "partial"`.

### GREEN

`isNormalizedBbox` now retains finite `[0,1]` coordinate checks and additionally requires `x1 < x2` and `y1 < y2`.

Command:

```text
npm test -- src/types/evidence.test.ts --run
```

Observed: 8/8 tests passed. Invalid geometry maps to `bbox: null` and cannot produce `full` provenance, preserving Task 4 evidence honesty.

## Fix B — intentional sign-out suppression

### RED

Added shared recovery tests for:

- suppressing a delayed `publishSessionExpired()` after intentional sign-out begins;
- allowing genuine expiration after intentional sign-out is cancelled;
- allowing expiration after a successful token lifecycle reset.

Added an Auth flow test proving complete global-plus-local sign-out failure cancels suppression.

Commands:

```text
npm test -- src/services/sessionRecovery.test.ts src/contexts/AuthContext.test.tsx --run
npm test -- src/services/sessionRecovery.test.ts --run
```

Observed: the combined run had 3 new failures and 12 passes because the shared intentional-sign-out lifecycle and Auth orchestration were absent. The follow-up recovery run had 3 new failures and 4 passes, including the explicit token-lifecycle reset case.

### GREEN

Added a small shared `intentionalSignOut` state with explicit begin/cancel functions. Expiration publication returns without local cleanup or listener notification while suppression is active, and also checks suppression before notifying for an already-running publication. `resetSessionExpiration()` clears suppression for successful `SIGNED_IN` and `TOKEN_REFRESHED` lifecycle events.

The Auth sign-out flow resets old expiration state, begins suppression before the Supabase sign-out call, preserves the global-to-local fallback, and cancels suppression before rethrowing when sign-out fails completely and leaves the user signed in.

Command:

```text
npm test -- src/services/sessionRecovery.test.ts src/contexts/AuthContext.test.tsx --run
```

Observed: 16/16 tests passed.

## Fix C — one refresh maximum per API operation

### RED

Added an adapter-level test that exercises the actual Axios lifecycle:

```text
request interceptor -> preflight refresh -> rejecting 401 adapter -> response interceptor
```

The test uses the real Axios instance and response pipeline, asserting one refresh, one adapter call, and one expiration notification.

Command:

```text
npm test -- src/services/api.interceptor.test.ts --run
```

Observed: 1 new test failed and 11 existing tests passed. The complete lifecycle called refresh 3 times instead of the maximum of 1.

### GREEN

The Axios request config now records `_sessionRefreshAttempted` before preflight refresh. Both the request and response interceptors honor the marker. A 401 after preflight refresh publishes expiration without another refresh or replay. A request that starts with an existing token can still refresh once on its first 401, and `_sessionRetry` still bounds replay to once. The shared recovery test continues to cover concurrent refresh coalescing.

Command:

```text
npm test -- src/services/api.interceptor.test.ts src/services/sessionRecovery.test.ts --run
```

Observed: 19/19 tests passed.

## Fix D — canonical login exclusion

### RED

Added literal return-path cases for `/login/` and `/login/?reason=expired`.

Command:

```text
npm test -- src/services/sessionReturnPath.test.ts --run
```

Observed: both new cases failed; 5 existing cases passed. The login variants were returned instead of rejected.

### GREEN

The parsed pathname is canonicalized by removing trailing slashes (while preserving `/`) before the login exclusion. The returned safe path still preserves its original pathname, query, and hash, and same-origin rejection is unchanged.

Command:

```text
npm test -- src/services/sessionReturnPath.test.ts src/contexts/AuthContext.test.tsx --run
```

Observed: 16/16 tests passed.

## Final verification

Focused evidence/session/API/Auth/return-path suites:

```text
npm test -- src/types/evidence.test.ts src/services/sessionRecovery.test.ts src/services/api.interceptor.test.ts src/contexts/AuthContext.test.tsx src/services/sessionReturnPath.test.ts --run
```

Observed: 5/5 test files passed, 43/43 tests passed.

Standalone TypeScript:

```text
npx tsc -b --pretty false
```

Observed: exit 0.

CI lint:

```text
npm run lint:ci
```

The first lint run correctly identified one `require-await` warning in the new rejecting adapter double. The double was minimally changed to return `Promise.reject(...)`; the API suite remained 12/12. The fresh lint run then completed with exit 0 and no warnings.

Production build:

```text
npm run build
```

Observed: exit 0; TypeScript and Vite production build completed. Vite emitted its non-fatal advisory for chunks larger than 500 kB.

Diff checks:

```text
git diff --check
```

Observed before staging: exit 0. A staged diff check is run after adding only the scoped source, test, and report files.
