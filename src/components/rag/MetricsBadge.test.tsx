/**
 * MetricsBadge 單元測試
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ChakraProvider } from '@chakra-ui/react';
import { MetricsBadge } from './MetricsBadge';
import type { EvaluationMetrics } from '../../types/rag';

// ========== 測試資料 ==========

const highScoreMetrics: EvaluationMetrics = {
  accuracy: 9.0,
  completeness: 8.5,
  clarity: 9.0,
  weighted_score: 8.8,
  is_passing: true,
  suggestion: '',
  faithfulness: 'grounded',
  confidence_score: 0.88,
};

const mediumScoreMetrics: EvaluationMetrics = {
  accuracy: 7.0,
  completeness: 6.5,
  clarity: 7.0,
  weighted_score: 6.85,
  is_passing: false,
  suggestion: '建議補充更多來源文獻',
  faithfulness: 'uncertain',
  confidence_score: 0.685,
};

const lowScoreMetrics: EvaluationMetrics = {
  accuracy: 4.0,
  completeness: 5.0,
  clarity: 4.5,
  weighted_score: 4.4,
  is_passing: false,
  suggestion: '回答與文獻內容不符，建議重新檢視引用來源',
  faithfulness: 'hallucinated',
  confidence_score: 0.44,
};

// ========== 輔助函數 ==========

const renderWithChakra = (ui: React.ReactElement) => {
  return render(<ChakraProvider>{ui}</ChakraProvider>);
};

// ========== 測試案例 ==========

describe('MetricsBadge', () => {
  describe('空值處理', () => {
    it('當 metrics 為 null 時不應渲染任何內容', () => {
      const { container } = renderWithChakra(<MetricsBadge metrics={null} />);
      expect(container).toBeEmptyDOMElement();
    });

    it('當 metrics 為 undefined 時不應渲染任何內容', () => {
      const { container } = renderWithChakra(<MetricsBadge metrics={undefined} />);
      expect(container).toBeEmptyDOMElement();
    });
  });

  describe('分數區間顏色邏輯', () => {
    it('高分 (≥8.0) 應顯示綠色和「高信賴」', () => {
      renderWithChakra(<MetricsBadge metrics={highScoreMetrics} />);
      
      expect(screen.getByText('8.8/10')).toBeInTheDocument();
      expect(screen.getByText('(高信賴)')).toBeInTheDocument();
    });

    it('中分 (6.0-7.9) 應顯示黃色和「建議查證」', () => {
      renderWithChakra(<MetricsBadge metrics={mediumScoreMetrics} />);
      
      expect(screen.getByText('6.9/10')).toBeInTheDocument();
      expect(screen.getByText('(建議查證)')).toBeInTheDocument();
    });

    it('低分 (<6.0) 應顯示紅色和「可能幻覺」', () => {
      renderWithChakra(<MetricsBadge metrics={lowScoreMetrics} />);
      
      expect(screen.getByText('4.4/10')).toBeInTheDocument();
      expect(screen.getByText('(可能幻覺)')).toBeInTheDocument();
    });
  });

  describe('Tooltip 內容', () => {
    it('hover 時應顯示詳細 Tooltip', async () => {
      renderWithChakra(<MetricsBadge metrics={highScoreMetrics} />);
      
      const badge = screen.getByText('8.8/10').closest('span')?.parentElement;
      if (badge) {
        fireEvent.mouseEnter(badge);
        
        await waitFor(() => {
          expect(screen.getByText('📊 學術品質評估')).toBeInTheDocument();
        });
      }
    });

    it('Tooltip 應顯示分項分數', async () => {
      renderWithChakra(<MetricsBadge metrics={highScoreMetrics} />);
      
      const badge = screen.getByText('8.8/10').closest('span')?.parentElement;
      if (badge) {
        fireEvent.mouseEnter(badge);
        
        await waitFor(() => {
          expect(screen.getByText('精確度')).toBeInTheDocument();
          expect(screen.getByText('完整性')).toBeInTheDocument();
          expect(screen.getByText('清晰度')).toBeInTheDocument();
        });
      }
    });
  });

  describe('及格/不及格狀態', () => {
    it('及格時應顯示 ✅', async () => {
      renderWithChakra(<MetricsBadge metrics={highScoreMetrics} />);
      
      const badge = screen.getByText('8.8/10').closest('span')?.parentElement;
      if (badge) {
        fireEvent.mouseEnter(badge);
        
        await waitFor(() => {
          expect(screen.getByText(/8\.8\/10 ✅ 及格/)).toBeInTheDocument();
        });
      }
    });

    it('不及格時應顯示 ❌ 和改進建議', async () => {
      renderWithChakra(<MetricsBadge metrics={lowScoreMetrics} />);
      
      const badge = screen.getByText('4.4/10').closest('span')?.parentElement;
      if (badge) {
        fireEvent.mouseEnter(badge);
        
        await waitFor(() => {
          expect(screen.getByText(/不及格/)).toBeInTheDocument();
          expect(screen.getByText('💡 建議：')).toBeInTheDocument();
        });
      }
    });
  });

  describe('showSuggestion 屬性', () => {
    it('當 showSuggestion 為 false 時不應顯示建議', async () => {
      renderWithChakra(
        <MetricsBadge metrics={lowScoreMetrics} showSuggestion={false} />
      );
      
      const badge = screen.getByText('4.4/10').closest('span')?.parentElement;
      if (badge) {
        fireEvent.mouseEnter(badge);
        
        await waitFor(() => {
          expect(screen.queryByText('💡 建議：')).not.toBeInTheDocument();
        });
      }
    });
  });

  describe('showDetailedTooltip 屬性', () => {
    it('當 showDetailedTooltip 為 false 時應顯示簡易 Tooltip', async () => {
      renderWithChakra(
        <MetricsBadge metrics={highScoreMetrics} showDetailedTooltip={false} />
      );
      
      const badge = screen.getByText('8.8/10').closest('span')?.parentElement;
      if (badge) {
        fireEvent.mouseEnter(badge);
        
        await waitFor(() => {
          // 簡易模式不顯示「精確度」等分項
          expect(screen.queryByText('精確度')).not.toBeInTheDocument();
        });
      }
    });
  });
});
