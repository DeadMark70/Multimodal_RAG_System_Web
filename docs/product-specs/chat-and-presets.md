# Chat And Presets

## User Outcomes

- Users can ask ordinary questions with streamed progress.
- Users can run Deep Research with explicit planning/execution phases.
- Users can switch between official and custom presets without losing the underlying mode snapshot.
- Existing conversations restore with their saved behavior context after reload.

## Acceptance Notes

- First-turn messages must not disappear after auto-creating a conversation.
- Cancellation must stop active execution without destroying the last stable state.
- GraphRAG and Deep Research labels should match the actual backend behavior they trigger.
