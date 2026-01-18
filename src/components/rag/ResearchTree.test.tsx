import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import ResearchTree from './ResearchTree';
import { ChakraProvider } from '@chakra-ui/react';
import theme from '../../theme';

  const mockPlan = {
    original_question: 'How does RAG work?',
    estimated_complexity: 'simple',
    sub_tasks: [
      { id: 1, question: 'Define RAG', status: 'done' as const, enabled: true, task_type: 'rag' as const, iteration: 0 },
      { id: 2, question: 'Explain Embedding', status: 'running' as const, enabled: true, task_type: 'graph' as const, iteration: 0 },
      { id: 3, question: 'Summarize', status: 'pending' as const, enabled: true, task_type: 'rag' as const, iteration: 0 },
    ],
  };

describe('ResearchTree', () => {
  it('renders the root question', () => {
    render(
      <ChakraProvider theme={theme}>
        <ResearchTree plan={mockPlan} />
      </ChakraProvider>
    );
    expect(screen.getByText('How does RAG work?')).toBeInTheDocument();
  });

  it('renders sub-tasks', () => {
    render(
      <ChakraProvider theme={theme}>
        <ResearchTree plan={mockPlan} />
      </ChakraProvider>
    );
    expect(screen.getByText('Define RAG')).toBeInTheDocument();
    expect(screen.getByText('Explain Embedding')).toBeInTheDocument();
  });
});
