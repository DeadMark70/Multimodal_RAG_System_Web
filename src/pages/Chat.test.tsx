import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import Chat from './Chat';
import { useSessionStore } from '../stores/useSessionStore';
import { useConversationMutations } from '../hooks/useConversations';
import * as conversationApi from '../services/conversationApi';
import * as ragApi from '../services/ragApi';
import React from 'react';
import { ChakraProvider } from '@chakra-ui/react';
import theme from '../theme';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock dependencies
vi.mock('../components/layout/Layout', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div data-testid="layout">{children}</div>,
}));

vi.mock('../components/rag/ConversationSidebar', () => ({
  default: ({ onSelect, onNew }: any) => (
    <div data-testid="conversation-sidebar">
      <button onClick={() => onSelect('123')}>Select Chat 123</button>
      <button onClick={() => onNew('chat')}>New Chat</button>
    </div>
  ),
}));

vi.mock('../stores/useSessionStore', () => ({
  useSessionStore: vi.fn(),
}));

vi.mock('../hooks/useConversations', () => ({
  useConversationMutations: vi.fn(),
}));

// Mock API services
vi.mock('../services/conversationApi');
vi.mock('../services/ragApi');

// Mock other components
vi.mock('../components/rag/MessageBubble', () => ({ 
  default: ({ content, role }: any) => <div data-testid="message-bubble">{role}: {content}</div> 
}));
vi.mock('../components/rag/DeepResearchPanel', () => ({ default: () => <div>DeepResearch</div> }));
vi.mock('../components/rag/DocumentSelector', () => ({ default: () => <div>DocSelector</div> }));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

// Wrap with ChakraProvider and QueryClientProvider
const renderWithProviders = (component: React.ReactNode) => {
  return render(
    <QueryClientProvider client={queryClient}>
      <ChakraProvider theme={theme}>
        {component}
      </ChakraProvider>
    </QueryClientProvider>
  );
};

describe('Chat Page Integration', () => {
  const mockSetCurrentChatId = vi.fn();
  const mockCreate = vi.fn();
  
  // Fake state for session store to simulate hook behavior
  let currentChatId: string | null = null;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient.clear();
    currentChatId = null;

    // Mock useSessionStore to behave like a real store for currentChatId
    (useSessionStore as any).mockImplementation(() => ({
      currentChatId,
      actions: { 
        setCurrentChatId: (id: string) => {
          currentChatId = id;
          mockSetCurrentChatId(id);
        } 
      },
    }));

    (useConversationMutations as any).mockReturnValue({
      create: mockCreate,
    });
  });

  it('loads conversation history when a conversation is selected', async () => {
    // Setup mock response for getConversation
    const mockDetail = {
      id: '123',
      title: 'Test Chat',
      type: 'chat',
      created_at: '',
      updated_at: '',
      messages: [
        { id: 'm1', role: 'user', content: 'Hello History', created_at: new Date().toISOString() },
        { id: 'm2', role: 'assistant', content: 'Hi there', created_at: new Date().toISOString() }
      ]
    };
    (conversationApi.getConversation as any).mockResolvedValue(mockDetail);

    // Initial render
    const { rerender } = renderWithProviders(<Chat />);
    
    // Initial state (Welcome message)
    expect(screen.getByText(/您好！我是您的研究助理/)).toBeInTheDocument();

    // Trigger selection (simulating Sidebar click)
    // Update mock to return new ID and re-render
    currentChatId = '123';
    (useSessionStore as any).mockImplementation(() => ({
      currentChatId: '123',
      actions: { setCurrentChatId: mockSetCurrentChatId },
    }));

    rerender(
        <QueryClientProvider client={queryClient}>
            <ChakraProvider theme={theme}>
                <Chat />
            </ChakraProvider>
        </QueryClientProvider>
    );

    // Wait for history to load
    await waitFor(() => {
      expect(conversationApi.getConversation).toHaveBeenCalledWith('123');
      expect(screen.getByText('user: Hello History')).toBeInTheDocument();
      expect(screen.getByText('assistant: Hi there')).toBeInTheDocument();
    });
  });
});