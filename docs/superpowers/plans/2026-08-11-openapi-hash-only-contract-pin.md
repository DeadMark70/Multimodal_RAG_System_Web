# OpenAPI Hash-Only Contract Pin Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stop backend-only commits from failing frontend contract CI while preserving strict semantic OpenAPI drift detection.

**Architecture:** Persist and compare only `openapi_sha256` in the frontend contract fixture. Continue reading backend HEAD for diagnostics and continue verifying that both backend contract artifacts are tracked at HEAD, match their HEAD blobs, and agree with a freshly recomputed semantic hash.

**Tech Stack:** Node.js test runner, JavaScript ESM, TypeScript, Vitest, Git, SHA-256

## Global Constraints

- Keep `npm run contract:check` and `npm run contract:pin` CLI syntax unchanged.
- Do not modify backend code, backend artifacts, CI workflow, or deployment behavior.
- Keep backend HEAD in checker diagnostics only; it must not be a persisted or compared pin.
- Preserve artifact-at-HEAD, manifest schema, manifest SHA, and semantic OpenAPI SHA validation.
- An unchanged `openapi_sha256` must pass even when backend HEAD changes.
- A changed `openapi_sha256` must still fail.

---

### Task 1: Remove backend HEAD from the persisted contract pin

**Files:**
- Modify: `scripts/check-backend-openapi.mjs`
- Modify: `scripts/check-backend-openapi.test.mjs`
- Modify: `src/test/fixtures/agenticV9ApiContract.ts`
- Modify: `src/types/evaluation.contract.test.ts`

**Interfaces:**
- Consumes: `readBackendContract(backendPath) -> { backend_commit, openapi_sha256, snapshot }` for artifact validation and diagnostic output.
- Produces: `readPinnedContract(source) -> { openapi_sha256 }`, `replacePinnedContract(source, contract)` that rewrites only the hash, and `comparePinnedContract(pinned, backend)` that compares only the hash.

- [ ] **Step 1: Write the failing commit-independence tests**

In `scripts/check-backend-openapi.test.mjs`, replace the three pin behavior tests with:

```javascript
test('readPinnedContract extracts only the reviewed semantic hash', () => {
  const source = `export const PIN = {
    openapi_sha256: "${'b'.repeat(64)}",
  };`;
  assert.deepEqual(readPinnedContract(source), {
    openapi_sha256: 'b'.repeat(64),
  });
  assert.throws(() => readPinnedContract('export const PIN = {};'), /openapi_sha256/i);
});

test('replacePinnedContract changes only the semantic hash literal', () => {
  const source = `const note = 'keep';
export const PIN = {
  openapi_sha256: "${'b'.repeat(64)}",
  frontend_baseline_commit: '${'c'.repeat(40)}',
};\n`;
  const updated = replacePinnedContract(source, {
    backend_commit: 'd'.repeat(40),
    openapi_sha256: 'e'.repeat(64),
  });
  assert.equal(updated, source.replace('b'.repeat(64), 'e'.repeat(64)));
});

test('comparePinnedContract ignores backend revision when the semantic hash matches', () => {
  assert.deepEqual(
    comparePinnedContract(
      { openapi_sha256: 'b'.repeat(64) },
      { backend_commit: 'c'.repeat(40), openapi_sha256: 'b'.repeat(64), snapshot: 'openapi.json' },
    ),
    [],
  );
});

test('comparePinnedContract reports semantic hash drift', () => {
  assert.deepEqual(
    comparePinnedContract(
      { openapi_sha256: 'b'.repeat(64) },
      { backend_commit: 'c'.repeat(40), openapi_sha256: 'd'.repeat(64), snapshot: 'openapi.json' },
    ),
    [`openapi_sha256: pinned ${'b'.repeat(64)} != backend ${'d'.repeat(64)}`],
  );
});
```

- [ ] **Step 2: Run the checker tests to verify RED**

```powershell
node --test scripts/check-backend-openapi.test.mjs
```

Expected RED: the checker still requires and compares `backend_commit`, so the hash-only source and commit-independence assertion fail.

- [ ] **Step 3: Make the checker pin only the semantic hash**

In `scripts/check-backend-openapi.mjs`, change:

```javascript
const PIN_FIELDS = ['backend_commit', 'openapi_sha256'];
```

to:

```javascript
const PIN_FIELDS = ['openapi_sha256'];
```

Leave `readBackendRevision`, `readBackendContract`, artifact validation, manifest validation, semantic hashing, and the success message unchanged. The existing generic pin helpers will then parse, rewrite, and compare only `openapi_sha256`.

- [ ] **Step 4: Remove backend HEAD from the frontend fixture contract**

In `src/test/fixtures/agenticV9ApiContract.ts`, replace the header and first fields with:

```typescript
/**
 * Immutable semantic hash for the backend contract consumed by the agentic-v9 UI.
 * Update this fixture only when the generated OpenAPI contract changes.
 */
export const AGENTIC_V9_API_CONTRACT = {
  openapi_sha256: 'bc835e8cf2d14e3cca431f11aae345583a3c2438384b28b8d5a8cdf3135c99c5',
  frontend_baseline_commit: '1ab15449af756886039614fab6b6cc64781d1d23',
```

Do not change the remaining control-plane and release-metrics fixture data.

In `src/types/evaluation.contract.test.ts`, rename the first test to `pins the backend OpenAPI hash and frontend baseline` and remove only:

```typescript
expect(AGENTIC_V9_API_CONTRACT.backend_commit).toMatch(/^[a-f0-9]{40}$/);
```

- [ ] **Step 5: Run focused GREEN verification**

```powershell
node --test scripts/check-backend-openapi.test.mjs
npx vitest run src/types/evaluation.contract.test.ts
npm run contract:check -- --backend ..\pdftopng
```

Expected: all checker tests pass, the fixture test passes, and contract check reports the current backend HEAD plus the unchanged semantic hash without drift.

- [ ] **Step 6: Run frontend regression gates**

```powershell
npm run test:scripts
npx tsc --noEmit
npm run lint:ci
npm run build
```

Expected: all commands exit `0`; the existing Vite large-chunk advisory may remain.

- [ ] **Step 7: Verify scope and commit**

```powershell
git diff --check
git status --short
git add `
  scripts/check-backend-openapi.mjs `
  scripts/check-backend-openapi.test.mjs `
  src/test/fixtures/agenticV9ApiContract.ts `
  src/types/evaluation.contract.test.ts
git commit -m "fix(contract): pin backend schema by hash"
```

Expected: the implementation commit contains exactly the four listed files and no backend or workflow changes.
