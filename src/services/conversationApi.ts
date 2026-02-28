/**
 * Conversation API 服務
 * 
 * 端點：
 * - GET /api/conversations - 對話列表
 * - POST /api/conversations - 建立對話
 * - GET /api/conversations/{id} - 對話詳情
 * - PATCH /api/conversations/{id} - 更新標題
 * - DELETE /api/conversations/{id} - 刪除對話
 * - POST /api/conversations/{id}/messages - 新增訊息
 */

import api from './api';
import type { 
  Conversation, 
  ConversationDetail, 
  CreateConversationRequest,
  UpdateConversationRequest,
  CreateMessageRequest,
  Message
} from '../types/conversation';

/**
 * 取得對話列表
 */
export async function listConversations(): Promise<Conversation[]> {
  const response = await api.get<Conversation[]>('/api/conversations');
  return response.data;
}

/**
 * 建立新對話
 */
export async function createConversation(
  request: CreateConversationRequest = {}
): Promise<Conversation> {
  const response = await api.post<Conversation>('/api/conversations', request);
  return response.data;
}

/**
 * 取得對話詳情 (含訊息)
 */
export async function getConversation(
  id: string,
  options?: { includeMessages?: boolean }
): Promise<ConversationDetail> {
  const response = await api.get<ConversationDetail>(`/api/conversations/${id}`, {
    params: options?.includeMessages === undefined
      ? undefined
      : { include_messages: options.includeMessages },
  });
  return response.data;
}

/**
 * 更新對話標題
 */
export async function updateConversation(
  id: string, 
  request: UpdateConversationRequest
): Promise<Conversation> {
  const response = await api.patch<Conversation>(`/api/conversations/${id}`, request);
  return response.data;
}

/**
 * 刪除對話
 */
export async function deleteConversation(id: string): Promise<void> {
  await api.delete(`/api/conversations/${id}`);
}

/**
 * 新增訊息到對話
 */
export async function addMessage(
  id: string,
  request: CreateMessageRequest
): Promise<Message> {
  const response = await api.post<Message>(`/api/conversations/${id}/messages`, request);
  return response.data;
}
