import { render, screen } from '@testing-library/react';
import { ChakraProvider } from '@chakra-ui/react';
import { describe, expect, it } from 'vitest';

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
    runBenchmark: async () => {},
    cancelExecution: () => {},
    reset: () => {},
    ...overrides,
  };
}

describe('AgenticBenchmarkPanel', () => {
  it('renders benchmark sections and stats', () => {
    render(
      <ChakraProvider theme={theme}>
        <AgenticBenchmarkPanel researchState={buildState()} />
      </ChakraProvider>
    );

    expect(screen.getByText('Agentic RAG (Benchmark)')).toBeInTheDocument();
    expect(screen.getByText('任務時間軸')).toBeInTheDocument();
    expect(screen.getByText('Evaluation 更新')).toBeInTheDocument();
    expect(screen.getByText('Trace Steps')).toBeInTheDocument();
    expect(screen.getByText('最終報告')).toBeInTheDocument();
    expect(screen.getByText('summary')).toBeInTheDocument();
    expect(screen.getByText('detail')).toBeInTheDocument();
    expect(screen.getByText('子任務結果')).toBeInTheDocument();
    expect(screen.getByText('引用來源')).toBeInTheDocument();
    expect(screen.getByTestId('agentic-benchmark-scroll-region')).toBeInTheDocument();
  });
});
