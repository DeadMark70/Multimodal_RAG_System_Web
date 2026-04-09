import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ChakraProvider } from '@chakra-ui/react';
import { describe, expect, it, vi } from 'vitest';
import React from 'react';

import Chat from './Chat';
import theme from '../theme';

vi.mock('../components/layout/Layout', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div data-testid="layout">{children}</div>,
}));
vi.mock('../components/rag/ConversationSidebar', () => ({ default: () => <div>Sidebar</div> }));
vi.mock('../components/rag/DocumentSelector', () => ({ default: () => <div>DocSelector</div> }));
vi.mock('../components/rag/MessageBubble', () => ({ default: () => <div>MessageBubble</div> }));
vi.mock('../components/rag/DeepResearchPanel', () => ({ default: () => <div>DeepResearch</div> }));
vi.mock('../components/rag/AgenticBenchmarkPanel', () => ({ default: () => <div>AgenticBenchmark</div> }));
vi.mock('../components/settings/SettingsPanel', () => ({ default: () => <div>SettingsPanel</div> }));
vi.mock('../stores/useSessionStore', () => {
  const useSessionStore = vi.fn(() => ({
    currentChatId: null,
    actions: { setCurrentChatId: vi.fn() },
  }));
  return {
    useSessionStore,
    useCurrentChatId: () => useSessionStore().currentChatId,
    useSessionActions: () => useSessionStore().actions,
  };
});
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
    currentStage: null,
  })),
}));
vi.mock('../hooks/useDeepResearch', () => ({
  useDeepResearch: vi.fn(() => ({
    plan: null,
    isPlanning: false,
    isExecuting: false,
    progress: [],
    result: null,
    error: null,
    currentPhase: 'idle',
    generatePlan: vi.fn(),
    updateTask: vi.fn(),
    toggleTask: vi.fn(),
    deleteTask: vi.fn(),
    executePlan: vi.fn(),
    cancelExecution: vi.fn(),
    reset: vi.fn(),
  })),
}));
vi.mock('../hooks/useAgenticBenchmarkResearch', () => ({
  useAgenticBenchmarkResearch: vi.fn(() => ({
    plan: null,
    isRunning: false,
    progress: [],
    evaluationUpdates: [],
    traceSteps: [],
    result: null,
    agentTrace: null,
    error: null,
    currentPhase: 'idle',
    runBenchmark: vi.fn(),
    cancelExecution: vi.fn(),
    reset: vi.fn(),
  })),
}));

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

describe('Chat Input Integration', () => {
  it('renders preset mode switcher in input area', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <ChakraProvider theme={theme}>
          <Chat />
        </ChakraProvider>
      </QueryClientProvider>
    );

    expect(screen.getByLabelText('Select Mode')).toBeInTheDocument();
    expect(screen.getByLabelText('聊天輸入框')).toBeInTheDocument();
    expect(screen.getByTestId('chat-desktop-right-rail')).toBeInTheDocument();
    expect(screen.getByTestId('chat-message-scroll-region')).toBeInTheDocument();
    expect(screen.queryByText('SettingsPanel')).not.toBeInTheDocument();
  });
});
