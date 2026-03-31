import { fireEvent, render, screen } from '@testing-library/react';
import { ChakraProvider } from '@chakra-ui/react';
import { describe, expect, it } from 'vitest';

import theme from '../../theme';
import DeepResearchPanel from './DeepResearchPanel';
import type { UseDeepResearchReturn } from '../../hooks/useDeepResearch';

function buildResearchState(overrides: Partial<UseDeepResearchReturn> = {}): UseDeepResearchReturn {
  return {
    plan: {
      status: 'waiting_confirmation',
      original_question: 'Compare two models',
      sub_tasks: [
        { id: 1, question: 'Collect retrieval evidence', task_type: 'rag', enabled: true },
      ],
      estimated_complexity: 'medium',
      doc_ids: null,
    },
    isPlanning: false,
    isExecuting: true,
    progress: [
      {
        id: 1,
        question: 'Collect retrieval evidence',
        taskType: 'rag',
        status: 'running',
        stage: 'reranking',
        stageLabel: '正在重排序結果',
        details: null,
        iteration: 0,
      },
    ],
    result: null,
    error: null,
    currentPhase: 'executing',
    generatePlan: async () => {},
    updateTask: () => {},
    toggleTask: () => {},
    deleteTask: () => {},
    executePlan: async () => {},
    cancelExecution: () => {},
    reset: () => {},
    ...overrides,
  };
}

describe('DeepResearchPanel', () => {
  it('renders task-level stage cards during execution with running tasks expanded', () => {
    render(
      <ChakraProvider theme={theme}>
        <DeepResearchPanel researchState={buildResearchState()} />
      </ChakraProvider>
    );

    expect(screen.getByText('目前子階段')).toBeInTheDocument();
    expect(screen.getAllByText('正在重排序結果').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Collect retrieval evidence')).toHaveLength(1);
    expect(screen.getAllByText('RAG').length).toBeGreaterThan(0);
  });

  it('switches to report view and opens the report drawer', () => {
    render(
      <ChakraProvider theme={theme}>
        <DeepResearchPanel
          researchState={buildResearchState({
            isExecuting: false,
            progress: [],
            currentPhase: 'complete',
            result: {
              question: 'Compare two models',
              summary: 'Final summary',
              detailed_answer: 'Detailed answer body',
              sub_tasks: [],
              all_sources: ['doc-1', 'doc-2'],
              confidence: 0.88,
              total_iterations: 2,
            },
          })}
        />
      </ChakraProvider>
    );

    expect(screen.getByText('研究結果')).toBeInTheDocument();
    fireEvent.click(screen.getByText('開啟完整報告'));
    expect(screen.getByText('完整研究報告')).toBeInTheDocument();
    expect(screen.getByText('Detailed answer body')).toBeInTheDocument();
  });
});
