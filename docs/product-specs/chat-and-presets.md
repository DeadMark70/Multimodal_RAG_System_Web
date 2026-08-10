# Chat And Presets

## User Outcomes

- Users can ask ordinary questions with streamed progress.
- Users can run Deep Research with explicit planning/execution phases.
- Users can run Agentic Benchmark in a tabbed workspace that separates live status, trace detail, and final report reading.
- Users can switch between official and custom presets without losing the underlying mode snapshot.
- Existing conversations restore with their saved behavior context after reload.
- Desktop users keep their chat rail visibility preferences across refreshes in the current browser.
- Users can open any assistant citation in a source-evidence drawer and, on demand, inspect its authenticated PDF source at the supplied page when one is available.

## Acceptance Notes

- First-turn messages must not disappear after auto-creating a conversation.
- Cancellation must stop active execution without destroying the last stable state.
- GraphRAG and Deep Research labels should match the actual backend behavior they trigger.
- Desktop chat rail collapse must be smooth; collapsing a rail must not unmount the central workspace or remove access to settings.
- When Agentic Benchmark execution completes, the workspace should land on the final result tab without requiring a manual tab switch.
- Assistant markdown content must not auto-load or expose untrusted external image/link targets in chat bubbles.
- Every existing Chat source chip opens the shared evidence drawer without changing the Chat response contract. Because that contract does not attest quote provenance, Chat citations are shown as source-only: the filename and any supplied page are retained, generated snippets are not presented as verified quotes, and the action uses neutral `開啟文件` copy.
- Opening a citation source uses the shared authenticated viewer rather than a direct PDF URL. The viewer opens a supplied page, keeps neutral source context visible while loading or reporting a session-expiry error, and can fall back to opening its authenticated blob in the browser when in-app PDF rendering fails.
- Closing the evidence drawer restores focus to the exact citation control that opened it. A rejected lazy viewer module is contained by a page-local close/retry boundary, so Chat state stays mounted.
