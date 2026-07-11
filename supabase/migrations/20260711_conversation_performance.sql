-- Bound the conversation summary list to the user's keyset pagination path.
CREATE INDEX IF NOT EXISTS idx_conversations_user_updated_id
ON conversations (user_id, updated_at DESC, id DESC);
