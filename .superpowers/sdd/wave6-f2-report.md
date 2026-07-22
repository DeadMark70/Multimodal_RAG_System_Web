# Wave 6 F2 report

- Extended the selected-run typed v9 projection with sufficiency, budget, repairs, conflicts, and execution metrics.
- Added a compact evidence-first trace presentation that extends the existing lifecycle tree without creating a competing trace system.
- The presentation is N/A-safe and token-only: it shows contract/route, authorized scope, slot state, repair summaries, final prose and verification summaries, context/sufficiency/conflicts, provider attempts, reservations/reconciliation, and explicit cancellation/timeout signals.
- Packet, claim, source, and graph explorers remain out of scope for F3. Raw typed v9 data is escaped and collapsed by default.
- Verification: 13 focused Vitest tests passed; focused ESLint and `git diff --check` passed; production build passed before the final display-only follow-up.
