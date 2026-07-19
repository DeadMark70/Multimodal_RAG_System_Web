import { ChakraProvider } from '@chakra-ui/react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import theme from '../../theme';
import AgentBehaviorTab from './AgentBehaviorTab';

const rows = [
  {
    runId: 'run-17',
    campaignId: 'cmp-1',
    questionId: 'Q-17',
    mode: 'agentic',
    repeat: 1,
    traceStatus: 'completed',
    subtasks: 4,
    toolCalls: 6,
    visualCalls: 2,
    graphCalls: 1,
    drilldownDepth: 3,
    correctness: 0.88,
    faithfulness: 0.8,
    tokens: 20400,
  },
];

function renderWithTheme(node: React.ReactNode) {
  return render(<ChakraProvider theme={theme}>{node}</ChakraProvider>);
}

describe('AgentBehaviorTab', () => {
  it('renders behavior metrics and tool analysis rows', () => {
    renderWithTheme(<AgentBehaviorTab rows={rows} />);

    expect(screen.getAllByText('Subtasks').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Tool Calls').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Visual Calls').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Graph Calls').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Drilldown Depth').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Correctness').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Faithfulness').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Tokens').length).toBeGreaterThan(0);
    expect(screen.getByText('Q-17')).toBeInTheDocument();
    expect(screen.getByText('run-17')).toBeInTheDocument();
    expect(screen.getByText('agentic')).toBeInTheDocument();
  });

  it('keeps missing trace metrics as N/A', () => {
    renderWithTheme(
      <AgentBehaviorTab
        rows={[{
          runId: 'run-missing',
          campaignId: 'cmp-1',
          questionId: 'Q-18',
          mode: 'naive',
          repeat: 1,
          traceStatus: 'not_instrumented',
          subtasks: null,
          toolCalls: null,
          visualCalls: null,
          graphCalls: null,
          drilldownDepth: null,
          correctness: null,
          faithfulness: null,
          tokens: null,
        }]}
      />
    );

    expect(screen.getAllByText('N/A').length).toBeGreaterThan(0);
    expect(screen.getByText('not_instrumented')).toBeInTheDocument();
  });
});
