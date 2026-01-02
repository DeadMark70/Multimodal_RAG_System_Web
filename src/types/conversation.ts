/**
 * Conversation Types
 * 
 * 對話歷史管理型別定義
 * 與後端 Pydantic Schema 同步
 */

/**
 * 對話類型
 */
export type ConversationType = 'chat' | 'research';

/**
 * 對話基本資訊
 */
export interface Conversation {
  id: string;
  title: string;
  type: ConversationType;
  created_at: string;
  updated_at: string;
  metadata?: Record<string, unknown>;
}

/**
 * 對話訊息 (對應 messages table)
 */
export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  metadata?: Record<string, unknown>;
  created_at: string;
}

/**
 * 對話詳情 (含訊息列表)
 */
export interface ConversationDetail extends Conversation {
  messages: Message[];
}

/**
 * 建立對話請求
 */
export interface CreateConversationRequest {
  title?: string;
  type?: ConversationType;
  metadata?: Record<string, unknown>;
}

/**
 * 更新對話請求
 */
export interface UpdateConversationRequest {
  title: string;
}

/**
 * 建立訊息請求
 */
export interface CreateMessageRequest {
  role: 'user' | 'assistant' | 'system';
  content: string;
  metadata?: Record<string, unknown>;
}