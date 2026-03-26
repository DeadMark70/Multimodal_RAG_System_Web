# Chat And Research Streaming

## Purpose

Describe the streamed ask and Deep Research execution architecture.

## Core Paths

- Ordinary ask:
  - page: `src/pages/Chat.tsx`
  - hook: `src/hooks/useChat.ts`
  - service: `src/services/ragApi.ts`
- Deep Research:
  - page: `src/pages/Chat.tsx`
  - hook: `src/hooks/useDeepResearch.ts`
  - services: `src/services/ragApi.ts`, `src/services/conversationApi.ts`

## Stream Design

- Browser `EventSource` is not used for authenticated flows.
- Clients use authenticated `fetch` plus manual SSE parsing so Bearer auth stays intact.
- Stream handlers must tolerate incremental progress events, complete events, and malformed/empty chunks without collapsing the whole UI.

## Persistence

- Conversation identity and metadata live in the conversations API.
- Preset/mode snapshots are restored into the chat experience after reload.
- Deep Research plan/result restore must stay compatible with persisted conversation metadata, not ad hoc page-local state.
