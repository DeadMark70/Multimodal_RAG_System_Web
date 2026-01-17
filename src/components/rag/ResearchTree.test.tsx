import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import ResearchTree from './ResearchTree';
import { ChakraProvider } from '@chakra-ui/react';
import theme from '../../theme';
import React from 'react';

const mockPlan = {
  original_question: 'Root Question',
  estimated_complexity: 'medium',
  sub_tasks: [
    { id: 1, question: 'Subtask 1', status: 'done', enabled: true, task_type: 'rag', iteration: 0 },
    { id: 2, question: 'Subtask 2', status: 'running', enabled: true, task_type: 'rag', iteration: 0 }
  ]
};

describe('ResearchTree', () => {
  it('renders the root question', () => {
    render(
      <ChakraProvider theme={theme}>
        <ResearchTree plan={mockPlan} />
      </ChakraProvider>
    );
    expect(screen.getByText('Root Question')).toBeInTheDocument();
  });

  it('renders sub-tasks', () => {
    render(
      <ChakraProvider theme={theme}>
        <ResearchTree plan={mockPlan} />
      </ChakraProvider>
    );
    expect(screen.getByText('Subtask 1')).toBeInTheDocument();
    expect(screen.getByText('Subtask 2')).toBeInTheDocument();
  });
});
