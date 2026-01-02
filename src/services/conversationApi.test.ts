import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as conversationApi from './conversationApi';
import api from './api';

// Mock the api module
vi.mock('./api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('Conversation API', () => {
  const mockConversations = [
    { id: '1', title: 'Test Chat', type: 'chat' },
    { id: '2', title: 'Research Session', type: 'research' },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('listConversations', () => {
    it('should fetch list of conversations', async () => {
      (api.get as any).mockResolvedValue({ data: mockConversations });

      const result = await conversationApi.listConversations();

      expect(api.get).toHaveBeenCalledWith('/api/conversations');
      expect(result).toEqual(mockConversations);
    });
  });

  describe('createConversation', () => {
    it('should create a new conversation', async () => {
      const newConv = { id: '3', title: 'New Chat', type: 'chat' };
      (api.post as any).mockResolvedValue({ data: newConv });

      const request = { title: 'New Chat', type: 'chat' as const };
      const result = await conversationApi.createConversation(request);

      expect(api.post).toHaveBeenCalledWith('/api/conversations', request);
      expect(result).toEqual(newConv);
    });
  });

  describe('getConversation', () => {
    it('should fetch conversation details', async () => {
      const detail = { ...mockConversations[0], messages: [] };
      (api.get as any).mockResolvedValue({ data: detail });

      const result = await conversationApi.getConversation('1');

      expect(api.get).toHaveBeenCalledWith('/api/conversations/1');
      expect(result).toEqual(detail);
    });
  });

  describe('updateConversation', () => {
    it('should update conversation title', async () => {
      const updated = { ...mockConversations[0], title: 'Updated' };
      (api.patch as any).mockResolvedValue({ data: updated });

      const result = await conversationApi.updateConversation('1', { title: 'Updated' });

      expect(api.patch).toHaveBeenCalledWith('/api/conversations/1', { title: 'Updated' });
      expect(result).toEqual(updated);
    });
  });

  describe('deleteConversation', () => {
    it('should delete a conversation', async () => {
      (api.delete as any).mockResolvedValue({});

      await conversationApi.deleteConversation('1');

      expect(api.delete).toHaveBeenCalledWith('/api/conversations/1');
    });
  });

  describe('addMessage', () => {
    it('should add a message to conversation', async () => {
      const message = { id: 'm1', role: 'user', content: 'hello' };
      (api.post as any).mockResolvedValue({ data: message });

      const request = { role: 'user' as const, content: 'hello' };
      const result = await conversationApi.addMessage('1', request);

      expect(api.post).toHaveBeenCalledWith('/api/conversations/1/messages', request);
      expect(result).toEqual(message);
    });
  });
});
