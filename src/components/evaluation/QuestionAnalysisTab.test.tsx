import { ChakraProvider } from '@chakra-ui/react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import theme from '../../theme';
import QuestionAnalysisTab from './QuestionAnalysisTab';

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
    evidenceCoverage: 0.58,
    unsupportedClaimRatio: 0.31,
    status: 'attention',
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
    evidenceCoverage: 0.92,
    unsupportedClaimRatio: 0.02,
    status: 'healthy',
    risks: ['Missing required docs'],
  },
];

function renderWithTheme(node: React.ReactNode) {
  return render(<ChakraProvider theme={theme}>{node}</ChakraProvider>);
}

describe('QuestionAnalysisTab', () => {
  it('shows one comparison table, percentage-point deltas and expandable detail', () => {
    renderWithTheme(<QuestionAnalysisTab rows={rows} />);
    expect(screen.getAllByRole('table')).toHaveLength(1);
    expect(screen.getAllByText('Q-17')).toHaveLength(1);
    expect(screen.getByText('+22.0 個百分點')).toBeInTheDocument();
    expect(screen.getByText('-11.0 個百分點')).toBeInTheDocument();
    expect(screen.getByText('+6.10 秒')).toBeInTheDocument();
    expect(screen.queryByText(/ECR 正確度效率/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '題目 Q-17 詳細資料' }));
    expect(screen.getByText('Token 差異：9,200')).toBeInTheDocument();
    expect(screen.getByText('正確度優先排名：Agentic RAG')).toBeInTheDocument();
    expect(screen.getByText('證據涵蓋率：58.0%')).toBeInTheDocument();
    expect(screen.getByText('Faithfulness drop')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '題目 Q-17 詳細資料' }));
    expect(screen.queryByText(/ECR 正確度效率/)).not.toBeInTheDocument();
  });

  it('filters rows by category and status', () => {
    renderWithTheme(<QuestionAnalysisTab rows={rows} />);
    fireEvent.change(screen.getByLabelText('題目分類'), { target: { value: 'table-comparison' } });
    fireEvent.change(screen.getByLabelText('資料狀態'), { target: { value: 'attention' } });
    expect(screen.getByText('Q-17')).toBeInTheDocument();
    expect(screen.queryByText('Q-02')).not.toBeInTheDocument();
  });

  it('naturally sorts IDs and puts missing values last when sorting quality', () => {
    const unordered = [
      { ...rows[0], questionId: 'Q10', deltaFaithfulness: null },
      { ...rows[0], questionId: 'Q2', deltaFaithfulness: -0.2 },
      { ...rows[1], questionId: 'Q1' },
    ];
    renderWithTheme(<QuestionAnalysisTab rows={unordered} />);
    const ids = () => within(screen.getByRole('table')).getAllByRole('button').map((button) => button.textContent);
    expect(ids()).toEqual(['Q1', 'Q2', 'Q10']);
    fireEvent.change(screen.getByLabelText('排序'), { target: { value: 'faithfulness-asc' } });
    expect(ids()).toEqual(['Q2', 'Q1', 'Q10']);
    expect(screen.getByText('N/A')).toBeInTheDocument();
    expect(unordered[0].questionId).toBe('Q10');
  });
});
