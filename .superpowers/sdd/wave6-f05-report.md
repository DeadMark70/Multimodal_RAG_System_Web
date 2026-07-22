# Wave 6 F0.5 report

- Added Agentic-only execution controls: v8 default, v9 Evidence-First, and explicit advanced v9 shadow policy.
- v9 and v9 shadow perform typed preflight before submission and render per-question incompatibilities without changing the saved model setup.
- The pinned backend does not expose an `agentic_v9_shadow` field or a parent/child campaign link, and requires `agentic-v9-shadow` as the only mode. The UI therefore creates a v8 authoritative campaign and a separately named v9 shadow campaign; neither progress nor tokens are merged.
- Runtime configuration incompatibility, stored version/condition, and separate shadow progress/warnings remain visible.
- Verification: 5 F0.5 focused tests passed; targeted CI lint and production build passed. The pre-existing full CampaignRunner suite emits Chakra `act(...)` warnings in polling tests.
