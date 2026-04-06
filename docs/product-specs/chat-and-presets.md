# Chat And Presets

## User Outcomes

- Users can ask ordinary questions with streamed progress.
- Users can run Deep Research with explicit planning/execution phases.
- Users can run Agentic Benchmark in a tabbed workspace that separates live status, trace detail, and final report reading.
- Users can switch between official and custom presets without losing the underlying mode snapshot.
- Existing conversations restore with their saved behavior context after reload.
- Desktop users keep their chat rail visibility preferences across refreshes in the current browser.

## Acceptance Notes

- First-turn messages must not disappear after auto-creating a conversation.
- Cancellation must stop active execution without destroying the last stable state.
- GraphRAG and Deep Research labels should match the actual backend behavior they trigger.
- Desktop chat rail collapse must be smooth; collapsing a rail must not unmount the central workspace or remove access to settings.
- When Agentic Benchmark execution completes, the workspace should land on the final result tab without requiring a manual tab switch.
