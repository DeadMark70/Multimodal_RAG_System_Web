import { render, screen } from '@testing-library/react';
import { ChakraProvider } from '@chakra-ui/react';
import { describe, expect, it } from 'vitest';

import theme from '../../theme';
import BenchmarkResultTab from './BenchmarkResultTab';

describe('BenchmarkResultTab', () => {
  it('renders markdown for summary, detailed answer, and subtask answers', () => {
    render(
      <ChakraProvider theme={theme}>
        <BenchmarkResultTab
          result={{
            question: 'Compare two models',
            summary: 'Summary intro\n* bullet one\n* bullet two',
            detailed_answer: 'Detailed body\n\n[來源: 子問題3]',
            sub_tasks: [
              {
                id: 1,
                iteration: 0,
                question: 'Inspect evidence',
                answer: 'Task answer\n1. first step',
                sources: [],
                is_drilldown: false,
              },
            ],
            all_sources: ['doc-a'],
            confidence: 0.91,
            total_iterations: 1,
          }}
        />
      </ChakraProvider>,
    );

    expect(screen.getAllByRole('list').length).toBeGreaterThan(0);
    expect(screen.getByTestId('markdown-source-token')).toHaveTextContent('[來源: 子問題3]');
    expect(screen.getByText('first step')).toBeInTheDocument();
  });
});
