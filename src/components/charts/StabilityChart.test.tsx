import { ChakraProvider } from '@chakra-ui/react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import theme from '../../theme';
import StabilityChart from './StabilityChart';

describe('StabilityChart', () => {
  it('renders fallback when no rows exist', () => {
    render(
      <ChakraProvider theme={theme}>
        <StabilityChart rows={[]} metric="answer_correctness" />
      </ChakraProvider>
    );

    expect(screen.getByText('沒有足夠資料可繪製 box / violin plot。')).toBeInTheDocument();
  });

  it('renders svg box and violin plot with summary stats when rows exist', () => {
    render(
      <ChakraProvider theme={theme}>
        <StabilityChart
          metric="answer_relevancy"
          rows={[
            {
              campaign_result_id: 'r1',
              question_id: 'Q1',
              question: 'Question 1',
              mode: 'naive',
              run_number: 1,
              category: '綜合比較題',
              difficulty: 'hard',
              ragas_focus: ['answer_relevancy'],
              reference_source: 'ground_truth_short',
              total_tokens: 100,
              metric_values: {
                faithfulness: 0.5,
                answer_correctness: 0.4,
                answer_relevancy: 0.45,
              },
              faithfulness: 0.5,
              answer_correctness: 0.4,
            },
            {
              campaign_result_id: 'r2',
              question_id: 'Q1',
              question: 'Question 1',
              mode: 'naive',
              run_number: 2,
              category: '綜合比較題',
              difficulty: 'hard',
              ragas_focus: ['answer_relevancy'],
              reference_source: 'ground_truth_short',
              total_tokens: 110,
              metric_values: {
                faithfulness: 0.6,
                answer_correctness: 0.7,
                answer_relevancy: 0.75,
              },
              faithfulness: 0.6,
              answer_correctness: 0.7,
            },
          ]}
        />
      </ChakraProvider>
    );

    expect(screen.getByRole('img', { name: 'Answer Relevancy box and violin plot' })).toBeInTheDocument();
    expect(screen.getByText(/Naive: mean 0\.600 \/ max 0\.750 \/ σ 0\.212/)).toBeInTheDocument();
  });
});
