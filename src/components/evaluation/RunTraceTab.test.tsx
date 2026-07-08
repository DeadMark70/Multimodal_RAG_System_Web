import { ChakraProvider } from '@chakra-ui/react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
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
        }}
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
});

describe('RunTraceTree', () => {
  it('renders a compact trace tree with totals', () => {
    renderWithTheme(<RunTraceTree events={traceEvents} />);

    expect(screen.getByText('Sequence')).toBeInTheDocument();
    expect(screen.getByText('Tokens')).toBeInTheDocument();
    expect(screen.getByText('$0.090')).toBeInTheDocument();
  });
});
