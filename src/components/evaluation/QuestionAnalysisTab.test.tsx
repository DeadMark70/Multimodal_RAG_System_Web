import { ChakraProvider } from '@chakra-ui/react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import theme from '../../theme';
import QuestionAnalysisTab from './QuestionAnalysisTab';
import { fourModeQuestions, modeSample } from './multiModeFixtures';

const rows = [
  {
    questionId: 'Q-17',
    byMode: [modeSample('naive'), modeSample('agentic', { answer_correctness: 0.72, faithfulness: 0.69, mean_tokens: 10200, mean_latency_ms: 8100 })],
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
    byMode: [modeSample('naive'), modeSample('agentic', { answer_correctness: 0.54, faithfulness: 0.82, mean_tokens: 1500, mean_latency_ms: 2320, accounting_status: 'partial' })],
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
    fireEvent.click(screen.getByRole('button', { name: '題目 Q-17 詳細資料' }));
    expect(screen.queryByText(/ECR 正確度效率/)).not.toBeInTheDocument();
  });

  it('filters rows by category and status', () => {
    renderWithTheme(<QuestionAnalysisTab rows={rows} />);
    fireEvent.change(screen.getByLabelText('題目分類'), { target: { value: 'table-comparison' } });
    fireEvent.change(screen.getByLabelText('資料狀態'), { target: { value: 'complete' } });
    expect(screen.getByText('Q-17')).toBeInTheDocument();
    expect(screen.queryByText('Q-02')).not.toBeInTheDocument();
  });

  it('naturally sorts IDs and puts missing values last when sorting quality', () => {
    const unordered = [
      { ...rows[0], questionId: 'Q10', byMode: [modeSample('naive'), modeSample('agentic', { faithfulness: null, quality_status: 'partial' })] },
      { ...rows[0], questionId: 'Q2', byMode: [modeSample('naive'), modeSample('agentic', { faithfulness: 0.6 })] },
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

  it('compares any of four modes, preserves missing scores and resets the status filter on pair changes', () => {
    renderWithTheme(<QuestionAnalysisTab rows={fourModeQuestions} />);
    expect(within(screen.getByLabelText('基準模式')).getAllByRole('option')).toHaveLength(4);
    expect(screen.getAllByText('+30.0 個百分點')).toHaveLength(3);
    fireEvent.change(screen.getByLabelText('比較模式'), { target: { value: 'graph' } });
    expect(screen.getAllByText('+20.0 個百分點')).toHaveLength(2);
    expect(screen.getByText('N/A')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('資料狀態'), { target: { value: 'incomplete_quality' } });
    expect(screen.queryByText('Q1')).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('基準模式'), { target: { value: 'advanced' } });
    expect(screen.getByLabelText('資料狀態')).toHaveValue('all');
    expect(screen.getAllByText('+10.0 個百分點')).toHaveLength(2);
    expect(screen.getByText(/Graph RAG − Advanced RAG/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '題目 Q2 詳細資料' }));
    expect(screen.getByText(/完成樣本：Advanced RAG 3 份 · Graph RAG 3 份/)).toBeInTheDocument();
  });

  it('does not compare a single mode against itself or zero-fill missing runs', () => {
    const view = renderWithTheme(<QuestionAnalysisTab rows={[{ ...fourModeQuestions[0], byMode: [modeSample('graph')] }]} />);
    expect(screen.getByLabelText('比較模式')).toBeDisabled();
    expect(screen.getByText(/至少需要兩種模式/)).toBeInTheDocument();
    view.rerender(<ChakraProvider theme={theme}><QuestionAnalysisTab rows={[{ ...fourModeQuestions[0], byMode: [modeSample('graph'), modeSample('naive', { sample_count: 0 })] }]} /></ChakraProvider>);
    expect(within(screen.getByRole('table')).getByText('缺少基準模式結果')).toBeInTheDocument();
    expect(screen.queryByText('0.0 個百分點')).not.toBeInTheDocument();
  });
});
