# Specification: Conversation Persistence

## 1. Overview
This feature implements persistent storage and retrieval for user conversations in the Multimodal RAG System. It covers both "Standard Chat" and "Deep Research" modes, ensuring that users can access their historical interactions and resume sessions across different logins or page reloads.

## 2. Goals
- **Data Persistence:** Automatically save all user queries and AI responses to the backend database (Supabase via FastAPI).
- **Session Management:** distinct handling for standard chat sessions versus deep research sessions.
- **History Retrieval:** Allow users to view a list of past conversations and load the full message history for a selected session.
- **Seamless Integration:** Integrate with existing frontend components (`Chat.tsx`, `DeepResearchPanel.tsx`) and backend APIs.

## 3. User Stories
- As a user, I want my chat history to be saved automatically so I don't lose context if I refresh the page.
- As a user, I want to see a list of my previous research sessions so I can revisit my findings.
- As a user, I want to be able to continue a conversation from where I left off.

## 4. Technical Requirements

### 4.1 Backend (FastAPI)
- **Endpoints:**
    - `POST /api/conversations`: Create a new conversation session.
    - `GET /api/conversations`: List all conversations for the authenticated user (with pagination/filtering).
    - `GET /api/conversations/{id}`: Retrieve full details and message history for a specific conversation.
    - `POST /api/conversations/{id}/messages`: Append a new message to a conversation.
    - `DELETE /api/conversations/{id}`: (Optional) Delete a conversation.
- **Database Schema (Supabase):**
    - Ensure `conversations` table exists: `id`, `user_id`, `title`, `created_at`, `updated_at`, `type` (chat/research), `metadata` (JSON for research params).
    - Ensure `messages` table exists: `id`, `conversation_id`, `role` (user/assistant), `content`, `created_at`, `metadata`.

### 4.2 Frontend (React)
- **Services:**
    - Update `conversationApi.ts` to consume the new/verified endpoints.
- **State Management:**
    - Update `useConversations` hook to fetch and manage the list of conversations.
    - Update `useChat` hook to handle loading specific conversation history and syncing new messages.
    - Update `useDeepResearch` to save/load research-specific state.
- **UI Components:**
    - **Sidebar:** Display list of recent conversations/research sessions.
    - **Chat Interface:** Populate message area with loaded history.
    - **Deep Research Panel:** Restore research inputs and results from history.

## 5. Non-Functional Requirements
- **Performance:** Loading history should not block the UI. Use optimistic updates where possible.
- **Security:** Ensure users can only access their own conversations (Supabase RLS).

## 6. Edge Cases
- Network failure during message save (should implement retry or error state).
- Loading a deleted conversation.
- Empty conversation history.
