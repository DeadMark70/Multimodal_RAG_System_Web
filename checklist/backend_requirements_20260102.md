# Backend Requirements: Conversation Persistence (2026-01-02)

## Overview
To support the "Conversation Persistence" feature for the Multimodal RAG System, we need to update the Supabase database schema and ensure the FastAPI backend exposes the necessary endpoints.

## 1. Database Schema (Supabase)

Please ensure the following tables and policies are applied.

### 1.1 `conversations` Table
If the table exists, ensure it has the `metadata` column.

```sql
-- Add metadata column to conversations if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'conversations' AND column_name = 'metadata') THEN
        ALTER TABLE conversations ADD COLUMN metadata JSONB DEFAULT '{}'::jsonb;
    END IF;
END $$;
```

### 1.2 `messages` Table
Create the `messages` table to store individual chat messages.

```sql
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id_created_at 
ON messages (conversation_id, created_at);
```

### 1.3 Row Level Security (RLS)
Enable RLS to ensure users can only access their own data.

```sql
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Select Policy
CREATE POLICY "Users can view messages of their own conversations"
    ON messages FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM conversations
            WHERE conversations.id = messages.conversation_id
            AND conversations.user_id = auth.uid()
        )
    );

-- Insert Policy
CREATE POLICY "Users can insert messages to their own conversations"
    ON messages FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM conversations
            WHERE conversations.id = messages.conversation_id
            AND conversations.user_id = auth.uid()
        )
    );
```

## 2. API Endpoints (FastAPI)

The frontend expects the following RESTful endpoints. The base URL is `/api`.

### 2.1 Conversations

*   **GET** `/api/conversations`
    *   **Description:** List all conversations for the current user.
    *   **Response:** `List[Conversation]`
*   **POST** `/api/conversations`
    *   **Description:** Create a new conversation.
    *   **Body:** `CreateConversationRequest`
    *   **Response:** `Conversation`
*   **GET** `/api/conversations/{id}`
    *   **Description:** Get conversation details including messages.
    *   **Response:** `ConversationDetail`
*   **PATCH** `/api/conversations/{id}`
    *   **Description:** Update conversation (e.g., title).
    *   **Body:** `UpdateConversationRequest`
    *   **Response:** `Conversation`
*   **DELETE** `/api/conversations/{id}`
    *   **Description:** Delete a conversation.
    *   **Response:** `204 No Content`

### 2.2 Messages

*   **POST** `/api/conversations/{id}/messages`
    *   **Description:** Add a message to a specific conversation.
    *   **Body:** `CreateMessageRequest`
    *   **Response:** `Message`

## 3. Data Models (TypeScript/JSON Reference)

```typescript
type ConversationType = 'chat' | 'research';

interface Conversation {
  id: string;
  title: string;
  type: ConversationType;
  created_at: string;
  updated_at: string;
  metadata?: Record<string, unknown>;
}

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  metadata?: Record<string, unknown>;
  created_at: string;
}

interface ConversationDetail extends Conversation {
  messages: Message[];
}
```
