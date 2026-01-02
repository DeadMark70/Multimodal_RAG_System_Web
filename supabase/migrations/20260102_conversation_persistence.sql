-- 1. 安全地新增 metadata 到 conversations
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'conversations' AND column_name = 'metadata') THEN
        ALTER TABLE conversations ADD COLUMN metadata JSONB DEFAULT '{}'::jsonb;
    END IF;
END $$;

-- 2. 建立 messages 表
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 新增建立索引以提升查詢效能
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id_created_at 
ON messages (conversation_id, created_at);

-- 3. 啟用 RLS
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- 4. 設定 Policies

-- 讀取 (Select)
DROP POLICY IF EXISTS "Users can view messages of their own conversations" ON messages;
CREATE POLICY "Users can view messages of their own conversations"
    ON messages FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM conversations
            WHERE conversations.id = messages.conversation_id
            AND conversations.user_id = auth.uid()
        )
    );

-- 新增 (Insert)
DROP POLICY IF EXISTS "Users can insert messages to their own conversations" ON messages;
CREATE POLICY "Users can insert messages to their own conversations"
    ON messages FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM conversations
            WHERE conversations.id = messages.conversation_id
            AND conversations.user_id = auth.uid()
        )
    );