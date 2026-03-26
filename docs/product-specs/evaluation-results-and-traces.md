# Evaluation Results And Traces

## User Outcomes

- Users can manage test cases and model presets.
- Users can launch evaluation campaigns and watch progress live.
- Users can inspect persisted result analysis after refresh.
- Users can open agent traces for supported campaign results.

## Acceptance Notes

- Evaluation campaigns should recover from backend snapshots after reconnect.
- Results analysis and agent traces must be separate views because they serve different operator questions.
- Campaign execution is preset-driven; the UI should not imply arbitrary unsaved model execution.
