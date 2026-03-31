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
- Results analysis must remain readable on standard desktop widths by placing dense tables in horizontal scroll containers instead of allowing page overflow.
- Delta analysis should use a tabbed `Category / Difficulty / Question` view so operators can switch comparison dimensions without stacking multiple 12-column tables side by side.
- ECR note reasons should be discoverable via tooltip triggers, not rendered as always-visible full-width note columns in the main tables.
