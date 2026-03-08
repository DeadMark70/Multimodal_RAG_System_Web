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
          metric="answer_correctness"
          rows={[
            {
              campaign_result_id: 'r1',
              question_id: 'Q1',
              question: 'Question 1',
              mode: 'naive',
              run_number: 1,
              total_tokens: 100,
              faithfulness: 0.5,
              answer_correctness: 0.4,
            },
            {
              campaign_result_id: 'r2',
              question_id: 'Q1',
              question: 'Question 1',
              mode: 'naive',
              run_number: 2,
              total_tokens: 110,
              faithfulness: 0.6,
              answer_correctness: 0.7,
            },
          ]}
        />
      </ChakraProvider>
    );

    expect(screen.getByRole('img', { name: 'Answer Correctness box and violin plot' })).toBeInTheDocument();
    expect(screen.getByText(/Naive: mean 0\.550 \/ max 0\.700 \/ σ 0\.212/)).toBeInTheDocument();
  });
});
