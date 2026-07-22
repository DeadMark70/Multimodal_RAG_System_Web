# Wave 6 F0 report — typed Agentic v9 evaluation contract

## Scope completed

- Pinned frontend fixture to backend commit `cfcf54dac283e0c7d68fa14e64da91f2d3cd8149`, OpenAPI SHA-256 `b7c96741d7c2ab2a5e9dcfd6a2adeeef4c6f102c4615c41cae788ebc5a6d085a`, and frontend baseline `1ab15449af756886039614fab6b6cc64781d1d23`.
- Added fully typed nested Agentic v9 observability structures: query contract, scope/source/locator, evidence packet, slot resolution, sufficiency, budget reservation, retrieval repair, conflict, final claim, context pack, and token-only execution metrics.
- Added optional nullable `RunDetailResponse.agentic_v9` so historical v8 details remain valid.
- Added typed campaign preflight request/response/issue structures and the `POST /api/evaluation/campaigns/preflight` client call. The request intentionally excludes any user identity because authentication is server-derived.
- Added stored execution-version and shadow-policy/progress type fields without activating UI controls (F0.5 remains out of scope).

## Files

- `src/types/evaluation.ts`
- `src/services/evaluationApi.ts`
- `src/test/fixtures/agenticV9ApiContract.ts`
- `src/types/evaluation.contract.test.ts`
- `src/services/evaluationApi.test.ts`

## Verification

- RED: focused API test failed because `preflightCampaign` did not exist.
- GREEN/final: `npm test -- src/types/evaluation.contract.test.ts src/services/evaluationApi.test.ts --run` — 20 passed.
- `npm run lint:ci` — passed.
- `npm run build` — passed. Vite emitted only existing large-chunk advisory warnings.
- `git diff --check` — passed.

## Contract drift to resolve before F0.5

The pinned backend source at `cfcf54d` has `agentic_execution_version` and `shadow_evaluation_policy` in `evaluation/campaign_schemas.py`, but the checked-in generated `openapi.json` with the pinned hash does not include them in `CampaignConfig` or `CampaignCreateRequest`. This is an OpenAPI generation/publication drift, not a frontend implementation failure. F0 keeps these fields optional for historic compatibility; do not ship F0.5 control-plane submission until backend regenerates/publishes an OpenAPI artifact containing the same fields.
