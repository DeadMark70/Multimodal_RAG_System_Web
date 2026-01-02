import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import Chat from './Chat';
import { useSessionStore } from '../stores/useSessionStore';
import { useConversationMutations } from '../hooks/useConversations';
import { useChat } from '../hooks/useChat';
import React from 'react';
import { ChakraProvider } from '@chakra-ui/react';
import theme from '../theme';

// Mock dependencies
vi.mock('../components/layout/Layout', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div data-testid="layout">{children}</div>,
}));

vi.mock('../components/rag/ConversationSidebar', () => ({
  default: ({ onSelect, onNew }: any) => (
    <div data-testid="conversation-sidebar">
      <button onClick={() => onSelect('123')}>Select Chat</button>
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

vi.mock('../hooks/useChat', () => ({
  useChat: vi.fn(),
}));

// Mock other components to avoid rendering complexity
vi.mock('../components/rag/MessageBubble', () => ({ default: () => <div>Bubble</div> }));
vi.mock('../components/rag/DeepResearchPanel', () => ({ default: () => <div>DeepResearch</div> }));
vi.mock('../components/rag/DocumentSelector', () => ({ default: () => <div>DocSelector</div> }));

// Wrap with ChakraProvider
const renderWithProviders = (component: React.ReactNode) => {
  return render(
    <ChakraProvider theme={theme}>
      {component}
    </ChakraProvider>
  );
};

describe('Chat Page', () => {
  const mockSetCurrentChatId = vi.fn();
  const mockCreate = vi.fn();
  
  beforeEach(() => {
    vi.clearAllMocks();

    (useSessionStore as any).mockReturnValue({
      currentChatId: null,
      actions: { setCurrentChatId: mockSetCurrentChatId },
    });

    (useConversationMutations as any).mockReturnValue({
      create: mockCreate,
    });

    (useChat as any).mockReturnValue({
      messages: [],
      sendMessage: vi.fn(),
      clearMessages: vi.fn(),
      isLoading: false,
      selectedDocIds: [],
      setSelectedDocIds: vi.fn(),
    });
  });

  it('renders conversation sidebar', () => {
    renderWithProviders(<Chat />);
    expect(screen.getByTestId('conversation-sidebar')).toBeInTheDocument();
  });

  it('handles conversation selection', () => {
    renderWithProviders(<Chat />);
    
    fireEvent.click(screen.getByText('Select Chat'));
    expect(mockSetCurrentChatId).toHaveBeenCalledWith('123');
  });

  it('handles new conversation creation', async () => {
    const newConv = { id: 'new-id', title: 'New', type: 'chat' };
    mockCreate.mockResolvedValue(newConv);

    renderWithProviders(<Chat />);
    
    fireEvent.click(screen.getByText('New Chat'));
    
    await waitFor(() => {
      expect(mockCreate).toHaveBeenCalledWith({ title: '新對話', type: 'chat' });
      expect(mockSetCurrentChatId).toHaveBeenCalledWith('new-id');
    });
  });
});