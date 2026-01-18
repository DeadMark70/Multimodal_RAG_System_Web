import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import Chat from '../pages/Chat';
import * as conversationApi from '../services/conversationApi';
import * as ragApi from '../services/ragApi';
import { useSessionStore } from '../stores/useSessionStore';
import { useConversationMutations } from '../hooks/useConversations';
import React from 'react';
import { ChakraProvider } from '@chakra-ui/react';
import theme from '../theme';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock dependencies
vi.mock('../components/layout/Layout', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div data-testid="layout">{children}</div>,
}));

vi.mock('../components/rag/ConversationSidebar', () => ({
  default: ({ onSelect }: any) => (
    <div data-testid="sidebar">
       <button onClick={() => onSelect('chat-1')}>Load Chat 1</button>
    </div>
  ),
}));

// We will use the REAL useSessionStore for this test to allow state updates?
// No, it's safer to mock it to control `currentChatId` explicitly in different steps.
vi.mock('../stores/useSessionStore', () => ({
  useSessionStore: vi.fn(),
}));

vi.mock('../hooks/useConversations', () => ({
  useConversationMutations: vi.fn(),
}));

// Mock API services
vi.mock('../services/conversationApi');
vi.mock('../services/ragApi');

// Mock complex components to simplify
vi.mock('../components/rag/DeepResearchPanel', () => ({ default: () => <div>DeepResearch</div> }));
vi.mock('../components/rag/DocumentSelector', () => ({ default: () => <div>DocSelector</div> }));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

const renderWithProviders = (component: React.ReactNode) => {
  return render(
    <QueryClientProvider client={queryClient}>
      <ChakraProvider theme={theme}>
        {component}
      </ChakraProvider>
    </QueryClientProvider>
  );
};

describe('End-to-End Persistence Flow', () => {
  // Mock Database
  let mockDbConversations: Record<string, any> = {};

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient.clear();
    mockDbConversations = {};

    // Setup API mocks to behave like a DB
    (conversationApi.getConversation as any).mockImplementation(async (id: string) => {
      if (!mockDbConversations[id]) {
        throw new Error('Not found');
      }
      return mockDbConversations[id];
    });

    (conversationApi.addMessage as any).mockImplementation(async (id: string, message: any) => {
      if (!mockDbConversations[id]) {
        throw new Error('Not found');
      }
      const newMessage = {
        id: `msg-${Date.now()}-${Math.random()}`,
        role: message.role,
        content: message.content,
        created_at: new Date().toISOString(),
        metadata: message.metadata
      };
      mockDbConversations[id].messages.push(newMessage);
      return newMessage;
    });

    (ragApi.askQuestion as any).mockResolvedValue({
      answer: 'AI Response',
      sources: [],
      metrics: null,
    });

    (useConversationMutations as any).mockReturnValue({
      create: vi.fn(),
    });
  });

  it('saves messages and reloads them upon re-entering the chat', async () => {
    // 1. Setup existing empty conversation in "DB"
    mockDbConversations['chat-1'] = {
      id: 'chat-1',
      title: 'Test Chat',
      type: 'chat',
      messages: [],
      created_at: new Date().toISOString(),
    };

    // 2. Render Chat with 'chat-1' selected
    let currentChatId = 'chat-1';
    (useSessionStore as any).mockImplementation(() => ({
      currentChatId,
      actions: { setCurrentChatId: (id: string) => { currentChatId = id; } },
    }));

    const { unmount } = renderWithProviders(<Chat />);

    // Wait for initial load
    await waitFor(() => {
      expect(conversationApi.getConversation).toHaveBeenCalledWith('chat-1');
    });

    // 3. User types and sends message
    const input = screen.getByPlaceholderText('輸入您的問題...');

    fireEvent.change(input, { target: { value: 'Hello Persistence' } });
    
    // Find button with send icon or just press enter
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

    // 4. Verify message appears and AI responds
    await waitFor(() => {
      expect(screen.getByText(/Hello Persistence/)).toBeInTheDocument();
      expect(screen.getByText(/AI Response/)).toBeInTheDocument();
    });

    // Verify "DB" was updated
    expect(mockDbConversations['chat-1'].messages).toHaveLength(2);
    expect(mockDbConversations['chat-1'].messages[0].content).toBe('Hello Persistence');
    expect(mockDbConversations['chat-1'].messages[1].content).toBe('AI Response');

    // 5. Unmount (Simulate leaving page)
    unmount();

    // 6. Remount (Simulate coming back)
    // We render again. mocking getConversation will return the updated data from mockDbConversations
    renderWithProviders(<Chat />);

    // 7. Verify messages are loaded from "DB"
    await waitFor(() => {
      // Expect at least 2 calls (one initial, one reload). Might be more due to StrictMode/Rerenders
      expect(conversationApi.getConversation).toHaveBeenCalled();
      expect(screen.getByText(/Hello Persistence/)).toBeInTheDocument();
      expect(screen.getByText(/AI Response/)).toBeInTheDocument();
    });
  });
});
