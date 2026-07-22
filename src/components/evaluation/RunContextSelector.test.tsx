import { fireEvent, render, screen } from '@testing-library/react';
import { ChakraProvider } from '@chakra-ui/react';
import { describe, expect, it, vi } from 'vitest';
import theme from '../../theme';
import RunContextSelector, { type EvaluationRunOption } from './RunContextSelector';

const sameQuestionRepeatAgenticRuns: EvaluationRunOption[] = [
  {
    runId: 'run-v8',
    campaignId: 'campaign-1',
    questionId: 'Q1',
    mode: 'agentic',
    repeat: 1,
    conditionId: 'agentic-v8',
    executionProfile: 'authoritative',
    agenticExecutionVersion: 'v8',
    responseStatus: 'complete',
  },
  {
    runId: 'run-v9',
    campaignId: 'campaign-1',
    questionId: 'Q1',
    mode: 'agentic',
    repeat: 1,
    conditionId: 'agentic-v9',
    executionProfile: 'authoritative',
    agenticExecutionVersion: 'v9',
    responseStatus: 'complete',
  },
  {
    runId: 'run-v9-shadow',
    campaignId: 'campaign-1',
    questionId: 'Q1',
    mode: 'agentic',
    repeat: 1,
    conditionId: 'agentic-v9-shadow',
    executionProfile: 'shadow',
    agenticExecutionVersion: 'v9',
    responseStatus: 'qualified_partial',
  },
];

describe('RunContextSelector', () => {
  it('keeps v8, v9, and v9 shadow runs distinct by their actual run IDs', () => {
    const onSelectedRunIdChange = vi.fn();

    render(
      <ChakraProvider theme={theme}>
        <RunContextSelector
          runOptions={sameQuestionRepeatAgenticRuns}
          selectedRunId="run-v8"
          onSelectedRunIdChange={onSelectedRunIdChange}
        />
      </ChakraProvider>,
    );

    const selector = screen.getByRole('combobox', { name: 'Run selector' });
    expect(screen.getByRole('option', { name: /Q1 · Agentic v8 · repeat 1/ })).toHaveValue('run-v8');
    expect(screen.getByRole('option', { name: /Q1 · Agentic v9 · repeat 1/ })).toHaveValue('run-v9');
    expect(screen.getByRole('option', { name: /Q1 · Agentic v9 shadow · repeat 1/ })).toHaveValue('run-v9-shadow');

    fireEvent.change(selector, { target: { value: 'run-v9-shadow' } });
    expect(onSelectedRunIdChange).toHaveBeenCalledWith('run-v9-shadow');
  });

  it('classifies server-returned v8 and v9 aliases as their Agentic conditions', () => {
    render(
      <ChakraProvider theme={theme}>
        <RunContextSelector
          runOptions={[
            { runId: 'alias-v8', campaignId: 'campaign-1', questionId: 'Q1', mode: 'v8', repeat: 1 },
            { runId: 'alias-v9', campaignId: 'campaign-1', questionId: 'Q1', mode: 'v9', repeat: 1 },
          ]}
          selectedRunId="alias-v8"
          onSelectedRunIdChange={vi.fn()}
        />
      </ChakraProvider>,
    );

    expect(screen.getByRole('option', { name: /Q1 · Agentic v8 · repeat 1/ })).toHaveValue('alias-v8');
    expect(screen.getByRole('option', { name: /Q1 · Agentic v9 · repeat 1/ })).toHaveValue('alias-v9');
  });
});
