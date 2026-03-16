import { render, screen } from '@testing-library/react';
import { ChakraProvider } from '@chakra-ui/react';
import { describe, expect, it } from 'vitest';

import theme from '../../theme';
import DeepResearchPanel from './DeepResearchPanel';
import type { UseDeepResearchReturn } from '../../hooks/useDeepResearch';

function buildResearchState(): UseDeepResearchReturn {
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
  };
}

describe('DeepResearchPanel', () => {
  it('renders task-level stage cards during execution', () => {
    render(
      <ChakraProvider theme={theme}>
        <DeepResearchPanel researchState={buildResearchState()} />
      </ChakraProvider>
    );

    expect(screen.getByText('目前子階段')).toBeInTheDocument();
    expect(screen.getByText('正在重排序結果')).toBeInTheDocument();
    expect(screen.getAllByText('Collect retrieval evidence')).toHaveLength(2);
    expect(screen.getAllByText('RAG').length).toBeGreaterThan(0);
  });
});
