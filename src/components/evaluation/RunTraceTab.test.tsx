import { ChakraProvider } from '@chakra-ui/react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import theme from '../../theme';
import RunTraceTab from './RunTraceTab';
import RunTraceTree from './RunTraceTree';

const traceEvents = [
  {
    eventId: 'evt-1',
    sequence: 1,
    stageName: 'Routing',
    status: 'success',
    startedAt: '2026-07-08T12:00:00Z',
    durationMs: 120,
    tokenCount: 300,
    costUsd: 0.002,
    payload: { selectedMode: 'agentic' },
  },
  {
    eventId: 'evt-2',
    sequence: 2,
    stageName: 'Retrieval',
    status: 'success',
    startedAt: '2026-07-08T12:00:01Z',
    durationMs: 940,
    tokenCount: 0,
    costUsd: 0,
    payload: { chunks: 8 },
  },
  {
    eventId: 'evt-3',
    sequence: 3,
    stageName: 'Generation',
    status: 'success',
    startedAt: '2026-07-08T12:00:02Z',
    durationMs: 2440,
    tokenCount: 4200,
    costUsd: 0.09,
    payload: { answerLength: 312 },
  },
  {
    eventId: 'evt-4',
    sequence: 4,
    stageName: 'Claim Verification',
    status: 'partial',
    startedAt: '2026-07-08T12:00:05Z',
    durationMs: 610,
    tokenCount: 1200,
    costUsd: 0.03,
    error: { code: 'citation_mismatch', message: '2 claims unsupported' },
    payload: { unsupportedClaims: 2 },
  },
  {
    eventId: 'evt-5',
    sequence: 5,
    stageName: 'Evaluation',
    status: 'success',
    startedAt: '2026-07-08T12:00:06Z',
    durationMs: 300,
    tokenCount: 200,
    costUsd: 0.01,
    payload: { correctness: 0.84 },
  },
];

const legacySteps = [
  {
    stepId: 'legacy-1',
    phase: 'planning',
    title: 'Plan subtasks',
    status: 'completed',
    durationMs: 180,
  },
  {
    stepId: 'legacy-2',
    phase: 'execution',
    title: 'Synthesize answer',
    status: 'completed',
    durationMs: 640,
  },
];

const runOptions = [
  { runId: 'run-1', campaignId: 'cmp-1', questionId: 'Q-17', mode: 'agentic', repeat: 1 },
  { runId: 'run-2', campaignId: 'cmp-1', questionId: 'Q-17', mode: 'naive', repeat: 1 },
];

function renderWithTheme(node: React.ReactNode) {
  return render(<ChakraProvider theme={theme}>{node}</ChakraProvider>);
}

describe('RunTraceTab', () => {
  it('renders chronological trace events, durations, payload drawer, and error drawer', () => {
    const onSelectedRunIdChange = vi.fn();
    renderWithTheme(
      <RunTraceTab
        runOptions={runOptions}
        selectedRunId="run-1"
        metadata={{
          questionId: 'Q-17',
          mode: 'agentic',
          repeat: 1,
          finalAnswerPreview: 'Final answer preview',
          retrievalSummary: '8 chunks packed into 3 context blocks',
          claimsSummary: '2 unsupported claims remain',
          totalTokens: 5700,
          accountingStatus: 'complete',
          accountingDiagnostics: {
            observed_call_count: 3,
            measured_call_count: 2,
            missing_usage_call_count: 1,
            unbalanced_call_count: 0,
            unclassified_phase_call_count: 0,
          },
        }}
        onSelectedRunIdChange={onSelectedRunIdChange}
        traceEvents={traceEvents}
      />
    );

    expect(screen.getAllByText('Routing').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Retrieval').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Generation').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Claim Verification').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Evaluation').length).toBeGreaterThan(0);
    expect(screen.getByText('120 ms')).toBeInTheDocument();
    expect(screen.getByText('2,440 ms')).toBeInTheDocument();
    expect(screen.getByText('5,700')).toBeInTheDocument();
    expect(screen.getByText(/Calls 2\/3; missing usage 1/)).toBeInTheDocument();

    fireEvent.change(screen.getByRole('combobox', { name: 'Run selector' }), { target: { value: 'run-2' } });
    expect(onSelectedRunIdChange).toHaveBeenCalledWith('run-2');

    fireEvent.click(screen.getAllByRole('button', { name: 'Payload' })[0]);
    expect(screen.getByText(/selectedMode/)).toBeInTheDocument();
    expect(screen.getAllByText(/agentic/).length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole('button', { name: 'Error' }));
    expect(screen.getByText(/citation_mismatch/)).toBeInTheDocument();
  });

  it('renders compatibility tree when only legacy steps exist', () => {
    renderWithTheme(<RunTraceTab legacySteps={legacySteps} />);

    expect(screen.getByText('legacy trace')).toBeInTheDocument();
    expect(screen.getByText('Plan subtasks')).toBeInTheDocument();
    expect(screen.getByText('Synthesize answer')).toBeInTheDocument();
  });

  it('clears expanded trace disclosure when the selected run ID changes', () => {
    const lifecycle = [
      { ...traceEvents[0], eventId: 'run-1-running', spanId: 'span-1', status: 'running' },
      { ...traceEvents[0], eventId: 'run-1-success', spanId: 'span-1', status: 'success', sequence: 2 },
    ];
    const rendered = renderWithTheme(
      <RunTraceTab selectedRunId="run-1" traceEvents={lifecycle} />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Show lifecycle (2)' }));
    expect(screen.getByRole('button', { name: 'Hide lifecycle' })).toBeInTheDocument();

    rendered.rerender(
      <ChakraProvider theme={theme}>
        <RunTraceTab selectedRunId="run-2" traceEvents={lifecycle} />
      </ChakraProvider>,
    );

    expect(screen.getByRole('button', { name: 'Show lifecycle (2)' })).toBeInTheDocument();
  });
});

describe('RunTraceTree', () => {
  it('renders a compact trace tree without monetary fallbacks', () => {
    renderWithTheme(<RunTraceTree events={traceEvents} />);

    expect(screen.getByText('Sequence')).toBeInTheDocument();
    expect(screen.queryByText('Tokens')).not.toBeInTheDocument();
    expect(screen.queryByText('Cost')).not.toBeInTheDocument();
    expect(screen.queryByText('$0.090')).not.toBeInTheDocument();
  });

  it('folds running and terminal rows for one span until requested', () => {
    renderWithTheme(
      <RunTraceTree
        events={[
          { ...traceEvents[0], eventId: 'evt-running', spanId: 'span-1', status: 'running' },
          { ...traceEvents[0], eventId: 'evt-success', spanId: 'span-1', status: 'success', sequence: 2 },
        ]}
      />
    );

    expect(screen.getAllByText('Routing')).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: 'Show lifecycle (2)' }));
    expect(screen.getAllByText(/Routing/)).toHaveLength(2);
    expect(screen.getByText('running')).toBeInTheDocument();
  });
});
