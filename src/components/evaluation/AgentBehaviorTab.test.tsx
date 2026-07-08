import { ChakraProvider } from '@chakra-ui/react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import theme from '../../theme';
import AgentBehaviorTab from './AgentBehaviorTab';

const rows = [
  {
    questionId: 'Q-17',
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
  });
});
