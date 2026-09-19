import { fireEvent, render, screen, within } from '@testing-library/react';
import { ChakraProvider } from '@chakra-ui/react';
import { describe, expect, it, vi } from 'vitest';
import theme from '../../theme';
import RunContextSelector, { type EvaluationRunOption } from './RunContextSelector';
import { fourModeRuns } from './multiModeFixtures';

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
  it('separates four modes and three repeats and follows newly loaded records without additional requests', () => {
    const onChange = vi.fn();
    const view = render(<ChakraProvider theme={theme}><RunContextSelector runOptions={fourModeRuns} selectedRunId="Q1-naive-2" onSelectedRunIdChange={onChange} /></ChakraProvider>);
    const mode = screen.getByRole('combobox', { name: 'Mode selector' });
    expect(within(mode).getAllByRole('option')).toHaveLength(4);
    expect(within(screen.getByRole('combobox', { name: 'Repeat selector' })).getAllByRole('option')).toHaveLength(3);
    fireEvent.change(mode, { target: { value: 'Q1-graph-3' } });
    expect(onChange).toHaveBeenLastCalledWith('Q1-graph-2');
    fireEvent.change(screen.getByRole('combobox', { name: 'Repeat selector' }), { target: { value: 'Q1-naive-3' } });
    expect(onChange).toHaveBeenLastCalledWith('Q1-naive-3');
    view.rerender(<ChakraProvider theme={theme}><RunContextSelector runOptions={fourModeRuns.filter((run) => run.repeat === 1)} selectedRunId="Q1-naive-1" onSelectedRunIdChange={onChange} /></ChakraProvider>);
    expect(screen.queryByRole('combobox', { name: 'Repeat selector' })).not.toBeInTheDocument();
    expect(screen.getByText('第 1 次')).toBeInTheDocument();
    expect(screen.getByText(/未列出不代表整批沒有/)).toBeInTheDocument();
    view.rerender(<ChakraProvider theme={theme}><RunContextSelector runOptions={fourModeRuns} selectedRunId="Q1-naive-1" onSelectedRunIdChange={onChange} /></ChakraProvider>);
    expect(screen.getByRole('combobox', { name: 'Repeat selector' })).toHaveValue('Q1-naive-1');
  });
  it('sorts questions naturally and scopes runs to the selected question while preserving condition and repeat', () => {
    const onChange = vi.fn();
    const runs: EvaluationRunOption[] = [
      { ...sameQuestionRepeatAgenticRuns[0], runId: 'q10-v8', questionId: 'Q10' },
      { ...sameQuestionRepeatAgenticRuns[0], runId: 'q2-v8', questionId: 'Q2' },
      { ...sameQuestionRepeatAgenticRuns[1], runId: 'q2-v9', questionId: 'Q2' },
      { ...sameQuestionRepeatAgenticRuns[1], runId: 'q2-v9-repeat2', questionId: 'Q2', repeat: 2 },
      { ...sameQuestionRepeatAgenticRuns[1], runId: 'q1-v9-repeat2', repeat: 2 },
      ...sameQuestionRepeatAgenticRuns,
    ];
    const view = render(<ChakraProvider theme={theme}><RunContextSelector runOptions={runs} selectedRunId="q1-v9-repeat2" onSelectedRunIdChange={onChange} /></ChakraProvider>);
    const question = screen.getByRole('combobox', { name: 'Question selector' });
    expect(within(question).getAllByRole('option').map((option) => option.textContent)).toEqual(['Q1', 'Q2', 'Q10']);
    const run = screen.getByRole('combobox', { name: 'Mode selector' });
    expect(within(run).getAllByRole('option')).toHaveLength(3);
    fireEvent.change(question, { target: { value: 'Q2' } });
    expect(onChange).toHaveBeenLastCalledWith('q2-v9-repeat2');
    view.rerender(<ChakraProvider theme={theme}><RunContextSelector runOptions={runs} selectedRunId="q2-v9-repeat2" onSelectedRunIdChange={onChange} /></ChakraProvider>);
    expect(within(run).getAllByRole('option')).toHaveLength(2);
    expect(run).toHaveValue('q2-v9-repeat2');
    fireEvent.change(question, { target: { value: 'Q10' } });
    expect(onChange).toHaveBeenLastCalledWith('q10-v8');
    view.rerender(<ChakraProvider theme={theme}><RunContextSelector runOptions={[]} onSelectedRunIdChange={onChange} /></ChakraProvider>);
    expect(question).toBeDisabled();
    expect(run).toBeDisabled();
  });
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

    const selector = screen.getByRole('combobox', { name: 'Mode selector' });
    expect(screen.getByRole('option', { name: /Agentic v8/ })).toHaveValue('run-v8');
    expect(screen.getByRole('option', { name: /Agentic v9 ·/ })).toHaveValue('run-v9');
    expect(screen.getByRole('option', { name: /Agentic v9 shadow/ })).toHaveValue('run-v9-shadow');

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

    expect(screen.getByRole('option', { name: /Agentic v8/ })).toHaveValue('alias-v8');
    expect(screen.getByRole('option', { name: /Agentic v9/ })).toHaveValue('alias-v9');
  });
});
