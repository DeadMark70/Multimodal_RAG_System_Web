import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ChakraProvider } from '@chakra-ui/react';
import { describe, expect, it, vi } from 'vitest';
import { updateTestCase } from '../../services/evaluationApi';
import theme from '../../theme';
import TestCaseManager from './TestCaseManager';

vi.mock('../../services/evaluationApi', () => ({
  listTestCases: vi.fn().mockResolvedValue(
    Array.from({ length: 8 }).map((_, index) => ({
      id: `Q${index + 1}`,
      question: `Question ${index + 1}`,
      ground_truth: `Answer ${index + 1}`,
      ground_truth_short: `Short ${index + 1}`,
      key_points: ['point-1', 'point-2'],
      ragas_focus: ['answer_correctness'],
      category: '分類',
      difficulty: 'medium',
      source_docs: [],
      requires_multi_doc_reasoning: false,
      question_version: 'v2.0.0',
      required_modalities: ['text', 'table'],
      atomic_facts: [
        {
          atomic_fact_id: `Q${index + 1}-F1`,
          fact_text: 'The reported value is 0.9079.',
        },
      ],
      expected_evidence: [
        {
          evidence_id: `Q${index + 1}-E1`,
          doc_id: 'paper-a.pdf',
          page: 5,
          modality: 'table',
        },
      ],
    }))
  ),
  createTestCase: vi.fn(),
  updateTestCase: vi.fn().mockResolvedValue({}),
  deleteTestCase: vi.fn(),
  importTestCases: vi.fn(),
}));

describe('TestCaseManager', () => {
  it('loads and shows 8 test cases with short-answer metadata badges', async () => {
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
    expect(screen.getAllByText('short GT').length).toBeGreaterThan(0);
  });

  it('preserves research metadata when editing an existing test case', async () => {
    render(
      <ChakraProvider theme={theme}>
        <TestCaseManager />
      </ChakraProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Q1')).toBeInTheDocument();
    });

    fireEvent.click(screen.getAllByRole('button', { name: '編輯' })[0]);
    fireEvent.click(screen.getByRole('button', { name: '儲存' }));

    await waitFor(() => {
      expect(updateTestCase).toHaveBeenCalled();
    });
    expect(updateTestCase).toHaveBeenCalledWith(
      'Q1',
      expect.objectContaining({
        question_version: 'v2.0.0',
        required_modalities: ['text', 'table'],
        atomic_facts: [
          expect.objectContaining({
            atomic_fact_id: 'Q1-F1',
          }),
        ],
        expected_evidence: [
          expect.objectContaining({
            evidence_id: 'Q1-E1',
          }),
        ],
      })
    );
  });
});
