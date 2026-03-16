import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as conversationApi from './conversationApi';
import api from './api';
import type { Conversation, ConversationDetail, Message } from '../types/conversation';

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
  const mockConversations: Conversation[] = [
    { id: '1', title: 'Test Chat', type: 'chat', created_at: '', updated_at: '' },
    { id: '2', title: 'Research Session', type: 'research', created_at: '', updated_at: '' },
  ];

  const mockedApi = api as unknown as {
    get: ReturnType<typeof vi.fn>;
    post: ReturnType<typeof vi.fn>;
    patch: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('listConversations', () => {
    it('should fetch list of conversations', async () => {
      mockedApi.get.mockResolvedValue({ data: mockConversations });

      const result = await conversationApi.listConversations();

      expect(mockedApi.get).toHaveBeenCalledWith('/api/conversations');
      expect(result).toEqual(mockConversations);
    });
  });

  describe('createConversation', () => {
    it('should create a new conversation', async () => {
      const newConv: Conversation = {
        id: '3',
        title: 'New Chat',
        type: 'chat',
        created_at: '',
        updated_at: '',
      };
      mockedApi.post.mockResolvedValue({ data: newConv });

      const request = { title: 'New Chat', type: 'chat' as const };
      const result = await conversationApi.createConversation(request);

      expect(mockedApi.post).toHaveBeenCalledWith('/api/conversations', request);
      expect(result).toEqual(newConv);
    });
  });

  describe('getConversation', () => {
    it('should fetch conversation details', async () => {
      const detail: ConversationDetail = { ...mockConversations[0], messages: [] };
      mockedApi.get.mockResolvedValue({ data: detail });

      const result = await conversationApi.getConversation('1');

      expect(mockedApi.get).toHaveBeenCalledWith('/api/conversations/1', {
        params: undefined,
      });
      expect(result).toEqual(detail);
    });
  });

  describe('updateConversation', () => {
    it('should update conversation title', async () => {
      const updated: Conversation = { ...mockConversations[0], title: 'Updated' };
      mockedApi.patch.mockResolvedValue({ data: updated });

      const result = await conversationApi.updateConversation('1', { title: 'Updated' });

      expect(mockedApi.patch).toHaveBeenCalledWith('/api/conversations/1', { title: 'Updated' });
      expect(result).toEqual(updated);
    });

    it('should update conversation metadata without title', async () => {
      const updated: Conversation = {
        ...mockConversations[1],
        metadata: { plan: { status: 'waiting_confirmation' } },
      };
      mockedApi.patch.mockResolvedValue({ data: updated });

      const request = { metadata: { plan: { status: 'waiting_confirmation' } } };
      const result = await conversationApi.updateConversation('2', request);

      expect(mockedApi.patch).toHaveBeenCalledWith('/api/conversations/2', request);
      expect(result).toEqual(updated);
    });
  });

  describe('deleteConversation', () => {
    it('should delete a conversation', async () => {
      mockedApi.delete.mockResolvedValue({});

      await conversationApi.deleteConversation('1');

      expect(mockedApi.delete).toHaveBeenCalledWith('/api/conversations/1');
    });
  });

  describe('addMessage', () => {
    it('should add a message to conversation', async () => {
      const message: Message = {
        id: 'm1',
        role: 'user',
        content: 'hello',
        created_at: '',
      };
      mockedApi.post.mockResolvedValue({ data: message });

      const request = { role: 'user' as const, content: 'hello' };
      const result = await conversationApi.addMessage('1', request);

      expect(mockedApi.post).toHaveBeenCalledWith('/api/conversations/1/messages', request);
      expect(result).toEqual(message);
    });
  });
});
