import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import Chat from './Chat';
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
vi.mock('../components/rag/ConversationSidebar', () => ({ default: () => <div>Sidebar</div> }));
vi.mock('../stores/useSessionStore', () => ({
  useSessionStore: vi.fn(() => ({ currentChatId: null, actions: { setCurrentChatId: vi.fn() } })),
}));
vi.mock('../hooks/useConversations', () => ({
  useConversationMutations: vi.fn(() => ({ create: vi.fn() })),
}));
vi.mock('../hooks/useChat', () => ({
  useChat: vi.fn(() => ({
    messages: [],
    sendMessage: vi.fn(),
    clearMessages: vi.fn(),
    isLoading: false,
    isLoadingHistory: false,
    selectedDocIds: [],
    setSelectedDocIds: vi.fn(),
  })),
}));
vi.mock('../components/rag/DeepResearchPanel', () => ({ default: () => <div>DeepResearch</div> }));

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

describe('Chat Input Integration', () => {
  it('renders mode switcher in input area', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <ChakraProvider theme={theme}>
          <Chat />
        </ChakraProvider>
      </QueryClientProvider>
    );
    // Expect failure initially
    expect(screen.getByLabelText('Select Mode')).toBeInTheDocument();
  });
});
