import { fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ChakraProvider } from '@chakra-ui/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import React from 'react';

import Chat from './Chat';
import theme from '../theme';
import { useSettingsStore } from '../stores';

const {
  chatCitation,
  messageBubbleMock,
  evidenceDrawerMock,
  evidenceDrawerFinalFocusMock,
  lazyViewerBoundaryMock,
  useChatMock,
} = vi.hoisted(() => ({
  chatCitation: {
    doc_id: 'doc-1',
    filename: 'paper.pdf',
    page: 3,
    snippet: 'Source quote',
    score: 0.9,
  },
  messageBubbleMock: vi.fn(),
  evidenceDrawerMock: vi.fn(),
  evidenceDrawerFinalFocusMock: vi.fn(),
  lazyViewerBoundaryMock: vi.fn<(props: {
    evidence: { docId: string };
    onClose: () => void;
  }) => void>(),
  useChatMock: vi.fn(),
}));

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
vi.mock('../components/rag/MessageBubble', () => ({
  default: ({ onCitationClick }: {
    onCitationClick?: (citation: typeof chatCitation, trigger: HTMLElement) => void;
  }) => {
    messageBubbleMock(onCitationClick);
    return (
      <button onClick={(event) => onCitationClick?.(chatCitation, event.currentTarget)}>
        Open citation
      </button>
    );
  },
}));
vi.mock('../components/evidence/EvidenceDrawer', () => ({
  EvidenceDrawer: ({ state, finalFocusRef, onOpenSource }: {
    state: {
      title: string;
      items: Array<{
        docId: string;
        filename: string | null;
        page: number | null;
        quote: string | null;
        provenanceStatus: string;
      }>;
    };
    finalFocusRef?: React.RefObject<HTMLElement | null>;
    onOpenSource: (item: typeof state.items[number]) => void;
  }) => {
    evidenceDrawerMock(state);
    evidenceDrawerFinalFocusMock(finalFocusRef);
    return (
      <div data-testid="evidence-drawer">
        {state.title} {state.items[0]?.filename} {state.items[0]?.page}
        {state.items[0] && (
          <button onClick={() => onOpenSource(state.items[0])}>Open source evidence</button>
        )}
      </div>
    );
  },
}));
vi.mock('../components/evidence/LazySourceViewerBoundary', () => ({
  LazySourceViewerBoundary: (props: { evidence: { docId: string }; onClose: () => void }) => {
    lazyViewerBoundaryMock(props);
    return <div data-testid="protected-source-viewer">Protected source viewer</div>;
  },
}));
vi.mock('../components/rag/DeepResearchPanel', () => ({ default: () => <div>DeepResearch</div> }));
vi.mock('../components/rag/AgenticBenchmarkPanel', () => ({ default: () => <div>AgenticBenchmark</div> }));
vi.mock('../components/settings/SettingsPanel', () => ({ default: () => <div>SettingsPanel</div> }));
vi.mock('../stores/useSessionStore', () => {
  const useSessionStore = vi.fn(() => ({
    currentChatId: null,
    actions: { setCurrentChatId: mockSetCurrentChatId },
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
  useChat: useChatMock,
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
        enable_graph_rag: false,
        graph_search_mode: 'generic',
        enable_graph_planning: false,
        enable_deep_image_analysis: false,
        max_subtasks: 5,
      },
      selectedChatModeId: 'advanced',
      customChatPresets: [],
    });
    mockSetCurrentChatId.mockReset();
    messageBubbleMock.mockReset();
    evidenceDrawerMock.mockReset();
    evidenceDrawerFinalFocusMock.mockReset();
    lazyViewerBoundaryMock.mockReset();
    useChatMock.mockReturnValue({
      messages: [],
      sendMessage: vi.fn(),
      clearMessages: vi.fn(),
      isLoading: false,
      isLoadingHistory: false,
      selectedDocIds: [],
      setSelectedDocIds: vi.fn(),
      currentStage: null,
    });
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
    expect(screen.getByTestId('chat-left-rail-toggle')).toBeInTheDocument();
    expect(screen.getByTestId('chat-right-rail-toggle')).toBeInTheDocument();
    expect(screen.getByTestId('chat-desktop-left-rail')).toHaveAttribute('data-collapsed', 'false');
    expect(screen.getByTestId('chat-desktop-right-rail')).toBeInTheDocument();
    expect(screen.getByTestId('chat-desktop-right-rail')).toHaveAttribute('data-collapsed', 'false');
    expect(screen.queryByText('SettingsPanel')).not.toBeInTheDocument();
  });

  it('collapses desktop rails without removing the chat shell', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <ChakraProvider theme={theme}>
          <Chat />
        </ChakraProvider>
      </QueryClientProvider>
    );

    fireEvent.click(screen.getByTestId('chat-left-rail-toggle'));
    fireEvent.click(screen.getByTestId('chat-right-rail-toggle'));

    expect(screen.getByTestId('chat-shell')).toBeInTheDocument();
    expect(screen.getByTestId('chat-desktop-left-rail')).toHaveAttribute('data-collapsed', 'true');
    expect(screen.getByTestId('chat-desktop-right-rail')).toHaveAttribute('data-collapsed', 'true');
    expect(window.localStorage.getItem('chat.leftRailCollapsed')).toBe('true');
    expect(window.localStorage.getItem('chat.rightRailCollapsed')).toBe('true');
  });

  it('opens settings drawer from the desktop rail trigger', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <ChakraProvider theme={theme}>
          <Chat />
        </ChakraProvider>
      </QueryClientProvider>
    );

    fireEvent.click(screen.getByTestId('chat-settings-trigger'));

    expect(await screen.findByText('SettingsPanel')).toBeInTheDocument();
  });

  it('restores desktop rail preferences from localStorage', () => {
    window.localStorage.setItem('chat.leftRailCollapsed', 'true');
    window.localStorage.setItem('chat.rightRailCollapsed', 'true');

    render(
      <QueryClientProvider client={queryClient}>
        <ChakraProvider theme={theme}>
          <Chat />
        </ChakraProvider>
      </QueryClientProvider>
    );

    expect(screen.getByTestId('chat-desktop-left-rail')).toHaveAttribute('data-collapsed', 'true');
    expect(screen.getByTestId('chat-desktop-right-rail')).toHaveAttribute('data-collapsed', 'true');
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

  it('opens shared evidence navigation when a Chat citation is clicked', () => {
    useChatMock.mockReturnValue({
      messages: [{
        id: 'assistant-1',
        role: 'assistant',
        content: 'Answer',
        sources: [chatCitation],
      }],
      sendMessage: vi.fn(),
      clearMessages: vi.fn(),
      isLoading: false,
      isLoadingHistory: false,
      selectedDocIds: [],
      setSelectedDocIds: vi.fn(),
      currentStage: null,
    });

    render(
      <QueryClientProvider client={queryClient}>
        <ChakraProvider theme={theme}>
          <Chat />
        </ChakraProvider>
      </QueryClientProvider>
    );

    const citationButton = screen.getByRole('button', { name: 'Open citation' });
    fireEvent.click(citationButton);

    expect(messageBubbleMock).toHaveBeenCalledWith(expect.any(Function));
    expect(evidenceDrawerMock).toHaveBeenLastCalledWith(expect.objectContaining({
      title: 'paper.pdf',
      items: [expect.objectContaining({
        filename: 'paper.pdf',
        page: 3,
        quote: 'Source quote',
        score: 0.9,
        bbox: null,
        provenanceStatus: 'partial',
      })],
    }));
    const finalFocusRef = evidenceDrawerFinalFocusMock.mock.calls.at(-1)?.[0] as
      | React.RefObject<HTMLElement | null>
      | undefined;
    expect(finalFocusRef?.current).toBe(citationButton);
  });

  it('mounts the protected lazy viewer boundary after opening a Chat source', () => {
    useChatMock.mockReturnValue({
      messages: [{
        id: 'assistant-1',
        role: 'assistant',
        content: 'Answer',
        sources: [chatCitation],
      }],
      sendMessage: vi.fn(),
      clearMessages: vi.fn(),
      isLoading: false,
      isLoadingHistory: false,
      selectedDocIds: [],
      setSelectedDocIds: vi.fn(),
      currentStage: null,
    });

    render(
      <QueryClientProvider client={queryClient}>
        <ChakraProvider theme={theme}>
          <Chat />
        </ChakraProvider>
      </QueryClientProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Open citation' }));
    fireEvent.click(screen.getByRole('button', { name: 'Open source evidence' }));

    expect(lazyViewerBoundaryMock).toHaveBeenCalled();
    expect(lazyViewerBoundaryMock.mock.calls.at(-1)?.[0].evidence.docId).toBe('doc-1');
  });
});
