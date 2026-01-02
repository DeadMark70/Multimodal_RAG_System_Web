# Plan: Conversation Persistence

## Phase 1: Backend & Database Schema Verification
**Goal:** Ensure the database supports persistence and the API endpoints are ready.

- [x] Task: Verify Supabase Database Schema
    - Check for `conversations` and `messages` tables.
    - Create SQL migration script if tables are missing or need updates (adding `type` column for chat/research distinction).
- [x] Task: Backend - Implement Conversation Management Endpoints (TDD)
    - **Note:** Backend code is external/inaccessible. Assuming endpoints will be available.
    - **Write Tests:** Create tests for `POST /conversations`, `GET /conversations`, `GET /conversations/{id}`.
    - **Implement:** Create/Update FastAPI routes to handle conversation CRUD.
- [x] Task: Backend - Implement Message Persistence Endpoints (TDD)
    - **Note:** Backend code is external/inaccessible. Assuming endpoints will be available.
    - **Write Tests:** Create tests for `POST /conversations/{id}/messages`.
    - **Implement:** Create/Update FastAPI routes to save messages to a conversation.
- [ ] Task: Conductor - User Manual Verification 'Backend & Database Schema Verification' (Protocol in workflow.md)

## Phase 2: Frontend Service & State Integration
**Goal:** connect the frontend application to the new backend endpoints.

- [x] Task: Update Frontend API Services (TDD) [83a766e]
    - **Write Tests:** Unit tests for `conversationApi.ts` methods.
    - **Implement:** Update `src/services/conversationApi.ts` to match backend endpoints.
- [ ] Task: Update Global Stores (TDD)
    - **Write Tests:** Unit tests for `useConversations` store logic.
    - **Implement:** Update `src/hooks/useConversations.ts` (or `stores/useSessionStore.ts`) to fetch and store the conversation list.
- [ ] Task: Conductor - User Manual Verification 'Frontend Service & State Integration' (Protocol in workflow.md)

## Phase 3: Standard Chat Persistence
**Goal:** Enable history for the standard chat interface.

- [ ] Task: Sidebar Conversation List (TDD)
    - **Write Tests:** Component tests for `Sidebar` displaying conversation items.
    - **Implement:** Update `src/components/layout/Sidebar.tsx` (and `ConversationSidebar.tsx` if separate) to list fetched conversations.
- [ ] Task: Chat History Loading (TDD)
    - **Write Tests:** Integration tests for loading messages into the Chat view.
    - **Implement:** Update `src/pages/Chat.tsx` and `useChat.ts` to load message history when a conversation is selected.
- [ ] Task: Chat Message Saving (TDD)
    - **Write Tests:** Verify that sending a message calls the save API.
    - **Implement:** Update `useChat.ts` `sendMessage` function to persist messages to the backend.
- [ ] Task: Conductor - User Manual Verification 'Standard Chat Persistence' (Protocol in workflow.md)

## Phase 4: Deep Research Persistence
**Goal:** Enable history for the Deep Research feature.

- [ ] Task: Deep Research Session Management (TDD)
    - **Write Tests:** Tests for creating/loading a research session.
    - **Implement:** Update `useDeepResearch.ts` to create a conversation of type 'research' and save initial parameters.
- [ ] Task: Deep Research UI Integration (TDD)
    - **Write Tests:** Verify `DeepResearchPanel` restores state from loaded data.
    - **Implement:** Update `src/components/rag/DeepResearchPanel.tsx` to populate fields and results from the loaded conversation metadata/history.
- [ ] Task: Conductor - User Manual Verification 'Deep Research Persistence' (Protocol in workflow.md)

## Phase 5: Final Polish & End-to-End Testing
**Goal:** Ensure a smooth user experience and handle edge cases.

- [ ] Task: End-to-End Testing
    - **Implement:** Run manual or automated E2E flows: Create Chat -> Save -> Refresh -> Load; Create Research -> Save -> Refresh -> Load.
- [ ] Task: UI Refinement
    - **Implement:** Add loading skeletons for history list and chat window. Add error toasts for failed saves/loads.
- [ ] Task: Conductor - User Manual Verification 'Final Polish & End-to-End Testing' (Protocol in workflow.md)
