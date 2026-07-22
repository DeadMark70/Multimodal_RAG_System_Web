# Wave 6 F1 — selected-run v9 evidence mapping

- Added a typed selected-run projection for `RunDetailResponse.agentic_v9`.
- Preserves `undefined` for historical/unmaterialized v9 detail, explicit `null` token/context state, and typed evidence/slot/claim identifiers.
- Clears the projection while a different run loads and guards it by selected `runId`, so an earlier run can never furnish the current selected panel.
- Focused verification: 12 Vitest assertions passed; scoped ESLint, TypeScript production build, and `git diff --check` passed.
