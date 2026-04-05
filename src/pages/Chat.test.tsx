import { fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ChakraProvider } from '@chakra-ui/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import React from 'react';

import Chat from './Chat';
import theme from '../theme';
import { useSettingsStore } from '../stores';

const mockSetCurrentChatId = vi.fn();
const scrollToMock = vi.fn();
const scrollIntoViewMock = vi.fn();

vi.mock('../components/layout/Layout', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div data-testid="layout">{children}</div>,
}));
vi.mock('react-router-dom', () => ({
  useLocation: () => ({ pathname: '/chat' }),
}));
vi.mock('../components/rag/ConversationSidebar', () => ({
  default: ({
    onSelect,
  }: {
    onSelect: (conversation: {
      id: string;
      title: string;
      type: 'research';
      created_at: string;
      updated_at: string;
      metadata: Record<string, unknown>;
    }) => void;
  }) => (
    <button
      onClick={() =>
        onSelect({
          id: 'research-123',
          title: 'Agentic Session',
          type: 'research',
          created_at: '',
          updated_at: '',
          metadata: {},
        })
      }
    >
      Select Research
    </button>
  ),
}));
vi.mock('../components/rag/DocumentSelector', () => ({ default: () => <div>DocSelector</div> }));
vi.mock('../components/rag/MessageBubble', () => ({ default: () => <div>MessageBubble</div> }));
vi.mock('../components/rag/DeepResearchPanel', () => ({ default: () => <div>DeepResearch</div> }));
vi.mock('../components/rag/AgenticBenchmarkPanel', () => ({ default: () => <div>AgenticBenchmark</div> }));
vi.mock('../components/settings/SettingsPanel', () => ({ default: () => <div>SettingsPanel</div> }));
vi.mock('../stores/useSessionStore', () => ({
  useSessionStore: vi.fn(() => ({ currentChatId: null, actions: { setCurrentChatId: mockSetCurrentChatId } })),
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

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

describe('Chat Page Integration', () => {
  beforeEach(() => {
    localStorage.clear();
    scrollToMock.mockReset();
    scrollIntoViewMock.mockReset();
    Object.defineProperty(window, 'scrollTo', {
      configurable: true,
      value: scrollToMock,
    });
    Object.defineProperty(HTMLElement.prototype, 'scrollTo', {
      configurable: true,
      value: scrollToMock,
    });
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      value: scrollIntoViewMock,
    });
    useSettingsStore.setState({
      ...useSettingsStore.getState(),
      ragSettings: {
        enable_hyde: false,
        enable_multi_query: true,
        enable_reranking: true,
        enable_evaluation: false,
        enable_graph_rag: true,
        graph_search_mode: 'generic',
        enable_graph_planning: false,
        enable_deep_image_analysis: false,
        max_subtasks: 5,
      },
      selectedChatModeId: 'graph',
      customChatPresets: [],
    });
    mockSetCurrentChatId.mockReset();
  });

  it('restores agentic preset when a research conversation is selected', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <ChakraProvider theme={theme}>
          <Chat />
        </ChakraProvider>
      </QueryClientProvider>
    );

    fireEvent.click(screen.getByText('Select Research'));

    expect(mockSetCurrentChatId).toHaveBeenCalledWith('research-123');
    expect(useSettingsStore.getState().selectedChatModeId).toBe('agentic');
  });

  it('renders the desktop right rail container for resources and settings', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <ChakraProvider theme={theme}>
          <Chat />
        </ChakraProvider>
      </QueryClientProvider>
    );

    expect(screen.getByTestId('chat-shell')).toBeInTheDocument();
    expect(screen.getByTestId('chat-main-layout')).toBeInTheDocument();
    expect(screen.getByTestId('chat-desktop-right-rail')).toBeInTheDocument();
    expect(screen.queryByText('SettingsPanel')).not.toBeInTheDocument();
  });

  it('opens settings drawer from the desktop rail trigger', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <ChakraProvider theme={theme}>
          <Chat />
        </ChakraProvider>
      </QueryClientProvider>
    );

    fireEvent.click(screen.getByTestId('chat-settings-trigger'));

    expect(screen.getByText('SettingsPanel')).toBeInTheDocument();
  });

  it('scrolls the message region without scrolling the outer layout sentinel into view', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <ChakraProvider theme={theme}>
          <Chat />
        </ChakraProvider>
      </QueryClientProvider>
    );

    expect(scrollToMock).toHaveBeenCalled();
    expect(scrollIntoViewMock).not.toHaveBeenCalled();
  });
});
