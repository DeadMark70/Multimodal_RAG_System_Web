# OpenAPI Hash-Only Contract Pin Design

## Problem

The frontend contract checker currently pins both the backend HEAD commit and the semantic OpenAPI SHA-256. Any backend-only documentation, test, or maintenance commit changes HEAD and fails frontend CI even when the OpenAPI contract is unchanged.

The CI workflow checks out backend `main`, not the pinned commit, so the commit comparison is not a reproducible checkout or supply-chain control. It creates cross-repository churn without strengthening contract validation.

## Design

Make `openapi_sha256` the only persisted frontend contract pin. Remove `backend_commit` from the frontend fixture and from pin comparison and rewrite operations.

Keep the existing contract integrity checks:

- `openapi.json` and `contracts/openapi-contract.json` must be tracked at backend HEAD and match their HEAD blobs.
- The manifest must have the expected schema and snapshot path.
- The manifest SHA must equal a freshly recomputed semantic SHA of `openapi.json`.
- The recomputed SHA must equal the frontend `openapi_sha256` pin.

The checker may continue reading and displaying the current backend HEAD in its success message for diagnostics, but HEAD is not a gate. A backend commit that does not change the OpenAPI artifacts therefore passes without a frontend pin update; an actual OpenAPI change still fails.

## Compatibility

- `npm run contract:check` and `npm run contract:pin` keep their current CLI syntax.
- `contract:pin` updates only `openapi_sha256`.
- Existing frontend contract tests stop asserting a `backend_commit` field.
- No backend code, artifact, workflow, or deployment behavior changes.

## Verification

1. Add a checker regression showing different backend HEAD commits with the same OpenAPI SHA produce no drift.
2. Retain a regression showing different semantic SHA values fail.
3. Run the checker Node tests and the frontend contract fixture test.
4. Run `contract:check` against the current backend HEAD; it must pass without editing the fixture after backend-only commits.
5. Run TypeScript, lint, script tests, and production build.
