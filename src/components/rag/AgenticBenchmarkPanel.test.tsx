import { fireEvent, render, screen } from '@testing-library/react';
import { ChakraProvider } from '@chakra-ui/react';
import { describe, expect, it, vi } from 'vitest';

import AgenticBenchmarkPanel from './AgenticBenchmarkPanel';
import theme from '../../theme';
import type { UseAgenticBenchmarkResearchReturn } from '../../hooks/useAgenticBenchmarkResearch';

function buildState(
  overrides: Partial<UseAgenticBenchmarkResearchReturn> = {}
): UseAgenticBenchmarkResearchReturn {
  return {
    plan: {
      original_question: 'question',
      estimated_complexity: 'simple',
      task_count: 1,
      enabled_count: 1,
      question_intent: 'enumeration_definition',
      strategy_tier: 'tier_1_detail_lookup',
      max_iterations: 0,
      sub_tasks: [{ id: 1, question: 'task', task_type: 'rag', enabled: true }],
    },
    isRunning: false,
    progress: [{ id: 1, question: 'task', taskType: 'rag', status: 'done', details: null, iteration: 0 }],
    evaluationUpdates: [{ iteration: 0, stage: 'quality_gate', gate_pass: true }],
    traceSteps: [
      {
        step_id: 'execution-1',
        phase: 'execution',
        step_type: 'sub_task_execution',
        title: 'Step 1',
        status: 'completed',
        tool_calls: [],
        token_usage: {},
        metadata: {},
      },
    ],
    result: {
      question: 'question',
      summary: 'summary',
      detailed_answer: 'detail',
      sub_tasks: [
        {
          id: 1,
          question: 'task',
          answer: 'task-answer',
          sources: ['doc-1'],
          is_drilldown: false,
          iteration: 0,
        },
      ],
      all_sources: ['doc-1'],
      confidence: 0.9,
      total_iterations: 0,
    },
    agentTrace: { steps: [] },
    error: null,
    currentPhase: 'complete',
    connectionStatus: { state: 'idle' },
    canRetryLastRequest: false,
    runBenchmark: async () => {},
    retryLastRequest: async () => {},
    cancelExecution: () => {},
    reset: () => {},
    ...overrides,
  };
}

describe('AgenticBenchmarkPanel', () => {
  it('renders benchmark tabs and stats', () => {
    render(
      <ChakraProvider theme={theme}>
        <AgenticBenchmarkPanel researchState={buildState({ currentPhase: 'executing' })} />
      </ChakraProvider>
    );

    expect(screen.getByText('Agentic RAG (Benchmark)')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: '執行狀態' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'Trace 追蹤' })).toHaveAttribute('aria-selected', 'false');
    expect(screen.getByRole('tab', { name: '最終結果' })).toHaveAttribute('aria-selected', 'false');
    expect(screen.getByText('任務時間軸')).toBeInTheDocument();
    expect(screen.getByText('覆蓋與質量檢查')).toBeInTheDocument();
    expect(screen.getByTestId('agentic-benchmark-scroll-region')).toBeInTheDocument();
  });

  it('switches tabs and shows the selected panel content', () => {
    render(
      <ChakraProvider theme={theme}>
        <AgenticBenchmarkPanel researchState={buildState()} />
      </ChakraProvider>
    );

    fireEvent.click(screen.getByRole('tab', { name: 'Trace 追蹤' }));
    expect(screen.getByRole('tab', { name: 'Trace 追蹤' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText('推理與工具調用')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: '最終結果' }));
    expect(screen.getByRole('tab', { name: '最終結果' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText('summary')).toBeInTheDocument();
    expect(screen.getByText('detail')).toBeInTheDocument();
    expect(screen.getByText('子任務結果')).toBeInTheDocument();
    expect(screen.getByText('引用來源')).toBeInTheDocument();
  });

  it('auto-navigates to the result tab when benchmark completes', () => {
    const { rerender } = render(
      <ChakraProvider theme={theme}>
        <AgenticBenchmarkPanel researchState={buildState({ currentPhase: 'executing' })} />
      </ChakraProvider>
    );

    rerender(
      <ChakraProvider theme={theme}>
        <AgenticBenchmarkPanel researchState={buildState({ currentPhase: 'complete' })} />
      </ChakraProvider>
    );

    expect(screen.getByRole('tab', { name: '最終結果' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText('summary')).toBeInTheDocument();
  });

  it('shows a disconnected banner and explicitly reruns the research once', () => {
    const retryLastRequest = vi.fn();
    render(
      <ChakraProvider theme={theme}>
        <AgenticBenchmarkPanel
          researchState={buildState({
            connectionStatus: { state: 'disconnected' },
            canRetryLastRequest: true,
            retryLastRequest,
          })}
        />
      </ChakraProvider>
    );

    expect(screen.getByText('串流已中斷，請手動重新執行。')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '重新執行研究' }));
    expect(retryLastRequest).toHaveBeenCalledTimes(1);
  });

  it('shows rate-limit copy without claiming an active retry', () => {
    render(
      <ChakraProvider theme={theme}>
        <AgenticBenchmarkPanel
          researchState={buildState({
            connectionStatus: { state: 'rate_limited' },
            canRetryLastRequest: true,
            retryLastRequest: vi.fn(),
          })}
        />
      </ChakraProvider>
    );

    expect(screen.getByText('請求過於頻繁，請稍後再試。')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '重新執行研究' })).not.toBeInTheDocument();
  });
});
