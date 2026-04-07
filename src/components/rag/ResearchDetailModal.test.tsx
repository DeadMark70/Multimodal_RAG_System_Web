import { fireEvent, render, screen } from '@testing-library/react';
import { ChakraProvider } from '@chakra-ui/react';
import { describe, expect, it } from 'vitest';

import theme from '../../theme';
import { ResearchDetailModal } from './ResearchDetailModal';

describe('ResearchDetailModal', () => {
  it('renders markdown inside the detailed report tab', () => {
    render(
      <ChakraProvider theme={theme}>
        <ResearchDetailModal
          isOpen={true}
          onClose={() => {}}
          data={{
            question: 'Why is markdown broken?',
            summary: 'Short summary',
            detailed_answer: 'Detailed answer\n* bullet item\n\n[來源: 子問題2]',
            sub_tasks: [],
            all_sources: [],
            confidence: 0.82,
            total_iterations: 1,
          }}
        />
      </ChakraProvider>,
    );

    fireEvent.click(screen.getByRole('tab', { name: '完整報告' }));

    expect(screen.getByRole('list')).toBeInTheDocument();
    expect(screen.getByTestId('markdown-source-token')).toHaveTextContent('[來源: 子問題2]');
  });
});
