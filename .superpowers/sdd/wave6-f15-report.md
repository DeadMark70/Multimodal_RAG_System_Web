# Wave 6 F1.5 report

- Added condition/profile/version/status fields to typed run options.
- Agentic selector labels distinguish v8, v9, and v9 shadow when question and repeat match; option value and React key remain the actual run ID.
- Run changes remount the trace disclosure subtree, clearing expanded raw trace state without remounting the selector or changing the request-ID race guard.
- Added selector, integration, and disclosure-reset coverage.

Verification: focused Vitest (9 tests), `npm run lint:ci`, `npm run build`, and `git diff --check` passed. The production build retains the pre-existing large-chunk advisory only.
