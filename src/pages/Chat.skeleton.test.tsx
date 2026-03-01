import { render, screen } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import Chat from './Chat';
import { useChat } from '../hooks/useChat';
import { useSessionStore } from '../stores/useSessionStore';
import { useConversationMutations } from '../hooks/useConversations';
import React from 'react';
import { ChakraProvider } from '@chakra-ui/react';
import theme from '../theme';
import { asMock } from '../test/mock-utils';
import type { ChatMessage } from '../types/rag';

// Mock dependencies
vi.mock('../components/layout/Layout', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div data-testid="layout">{children}</div>,
}));

vi.mock('../components/rag/ConversationSidebar', () => ({
  default: () => <div>Sidebar</div>,
}));

vi.mock('../stores/useSessionStore', () => ({
  useSessionStore: vi.fn(),
}));

vi.mock('../hooks/useConversations', () => ({
  useConversationMutations: vi.fn(),
}));

// Mock useChat
vi.mock('../hooks/useChat', () => ({
  useChat: vi.fn(),
}));

vi.mock('../components/rag/MessageBubble', () => ({ default: () => <div>MessageBubble</div> }));
vi.mock('../components/rag/DeepResearchPanel', () => ({ default: () => <div>DeepResearch</div> }));
vi.mock('../components/rag/DocumentSelector', () => ({ default: () => <div>DocSelector</div> }));

describe('Chat Page Skeleton Loading', () => {
  const mockUseSessionStore = asMock(useSessionStore);
  const mockUseConversationMutations = asMock(useConversationMutations);
  const mockUseChat = asMock(useChat);

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default mocks
    mockUseSessionStore.mockReturnValue({
      currentChatId: '123',
      actions: { setCurrentChatId: vi.fn() },
    } as ReturnType<typeof useSessionStore>);

    mockUseConversationMutations.mockReturnValue({
      create: vi.fn(),
      update: vi.fn(),
      remove: vi.fn(),
      isCreating: false,
      isUpdating: false,
      isDeleting: false,
    });
  });

  it('should render Skeletons when isLoadingHistory is true', () => {
    // Mock useChat to return isLoadingHistory: true
    mockUseChat.mockReturnValue({
      messages: [] as ChatMessage[],
      sendMessage: vi.fn(() => Promise.resolve()),
      clearMessages: vi.fn(),
      isLoading: false,
      isLoadingHistory: true, // This is key
      selectedDocIds: [],
      setSelectedDocIds: vi.fn(),
    });

    render(
      <ChakraProvider theme={theme}>
        <Chat />
      </ChakraProvider>
    );

    // Look for Skeletons
    // Since Chakra Skeleton usually renders a div with a specific class or style, checking for testid is safest.
    // But currently I haven't added the Skeletons yet, so I expect this to FAIL if I look for a testid I plan to add.
    // I will look for testid="chat-history-skeleton"
    expect(screen.getByTestId('chat-history-skeleton')).toBeInTheDocument();
  });

  it('should render Messages when isLoadingHistory is false', () => {
    mockUseChat.mockReturnValue({
      messages: [{ id: '1', role: 'user', content: 'hi' }] as ChatMessage[],
      sendMessage: vi.fn(() => Promise.resolve()),
      clearMessages: vi.fn(),
      isLoading: false,
      isLoadingHistory: false,
      selectedDocIds: [],
      setSelectedDocIds: vi.fn(),
    });

    render(
      <ChakraProvider theme={theme}>
        <Chat />
      </ChakraProvider>
    );

    expect(screen.queryByTestId('chat-history-skeleton')).not.toBeInTheDocument();
    expect(screen.getByTestId('layout')).toBeInTheDocument();
  });
});
