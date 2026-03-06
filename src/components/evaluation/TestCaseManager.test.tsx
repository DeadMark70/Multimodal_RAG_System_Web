import { render, screen, waitFor } from '@testing-library/react';
import { ChakraProvider } from '@chakra-ui/react';
import { describe, expect, it, vi } from 'vitest';
import theme from '../../theme';
import TestCaseManager from './TestCaseManager';

vi.mock('../../services/evaluationApi', () => ({
  listTestCases: vi.fn().mockResolvedValue(
    Array.from({ length: 8 }).map((_, index) => ({
      id: `Q${index + 1}`,
      question: `Question ${index + 1}`,
      ground_truth: `Answer ${index + 1}`,
      category: '分類',
      difficulty: 'medium',
      source_docs: [],
      requires_multi_doc_reasoning: false,
    }))
  ),
  createTestCase: vi.fn(),
  updateTestCase: vi.fn(),
  deleteTestCase: vi.fn(),
  importTestCases: vi.fn(),
}));

describe('TestCaseManager', () => {
  it('loads and shows 8 test cases', async () => {
    render(
      <ChakraProvider theme={theme}>
        <TestCaseManager />
      </ChakraProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('總題數 8')).toBeInTheDocument();
    });
    expect(screen.getByText('Q1')).toBeInTheDocument();
    expect(screen.getByText('Q8')).toBeInTheDocument();
  });
});

