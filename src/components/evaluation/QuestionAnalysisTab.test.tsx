import { ChakraProvider } from '@chakra-ui/react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import theme from '../../theme';
import QuestionAnalysisTab from './QuestionAnalysisTab';
import QuestionDeltaHeatmap from './QuestionDeltaHeatmap';

const rows = [
  {
    questionId: 'Q-17',
    category: 'table-comparison',
    difficulty: 'hard',
    requiredModalities: ['table', 'text'],
    deltaCorrectness: 0.22,
    deltaFaithfulness: -0.11,
    deltaTokens: 9200,
    deltaLatencyMs: 6100,
    ecrCorrectness: 0.000024,
    bestMode: 'agentic',
    routerSelectedMode: 'naive',
    evidenceCoverage: 0.58,
    unsupportedClaimRatio: 0.31,
    status: 'attention',
    ablationFlags: ['visual-off'],
    risks: ['High cost', 'Faithfulness drop', 'Visual required but not triggered'],
  },
  {
    questionId: 'Q-02',
    category: 'text-lookup',
    difficulty: 'medium',
    requiredModalities: ['text'],
    deltaCorrectness: 0.04,
    deltaFaithfulness: 0.02,
    deltaTokens: 500,
    deltaLatencyMs: 320,
    ecrCorrectness: 0.00008,
    bestMode: 'naive',
    routerSelectedMode: 'naive',
    evidenceCoverage: 0.92,
    unsupportedClaimRatio: 0.02,
    status: 'healthy',
    ablationFlags: [],
    risks: ['Missing required docs'],
  },
];

function renderWithTheme(node: React.ReactNode) {
  return render(<ChakraProvider theme={theme}>{node}</ChakraProvider>);
}

describe('QuestionAnalysisTab', () => {
  it('renders dense question analysis rows with required columns and risk badges', () => {
    renderWithTheme(<QuestionAnalysisTab rows={rows} />);

    expect(screen.getAllByText('Q-17').length).toBeGreaterThan(0);
    expect(screen.getAllByText('table-comparison').length).toBeGreaterThan(0);
    expect(screen.getByText('hard')).toBeInTheDocument();
    expect(screen.getByText('table, text')).toBeInTheDocument();
    expect(screen.getAllByText('+0.220').length).toBeGreaterThan(0);
    expect(screen.getAllByText('-0.110').length).toBeGreaterThan(0);
    expect(screen.getByText('9,200')).toBeInTheDocument();
    expect(screen.getByText('6,100 ms')).toBeInTheDocument();
    expect(screen.getByText('0.000024')).toBeInTheDocument();
    expect(screen.getAllByText('agentic').length).toBeGreaterThan(0);
    expect(screen.getAllByText('naive').length).toBeGreaterThan(0);
    expect(screen.getByText('58.0%')).toBeInTheDocument();
    expect(screen.getAllByText('31.0%').length).toBeGreaterThan(0);
    expect(screen.getByText('High cost')).toBeInTheDocument();
    expect(screen.getByText('Faithfulness drop')).toBeInTheDocument();
    expect(screen.getByText('Visual required but not triggered')).toBeInTheDocument();
  });

  it('filters rows by category and status', () => {
    renderWithTheme(<QuestionAnalysisTab rows={rows} />);

    fireEvent.change(screen.getByLabelText('Category Filter'), {
      target: { value: 'table-comparison' },
    });
    fireEvent.change(screen.getByLabelText('Status Filter'), {
      target: { value: 'attention' },
    });

    expect(screen.getAllByText('Q-17').length).toBeGreaterThan(0);
    expect(screen.queryAllByText('Q-02')).toHaveLength(0);
  });
});

describe('QuestionDeltaHeatmap', () => {
  it('renders question delta heatmap values', () => {
    renderWithTheme(<QuestionDeltaHeatmap rows={rows} />);

    expect(screen.getByText('Question Delta Heatmap')).toBeInTheDocument();
    expect(screen.getByText('Delta Correctness')).toBeInTheDocument();
    expect(screen.getByText('Delta Faithfulness')).toBeInTheDocument();
    expect(screen.getByText('Unsupported Claim Ratio')).toBeInTheDocument();
  });
});
