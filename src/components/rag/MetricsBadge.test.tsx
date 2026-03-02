/**
 * MetricsBadge 單元測試
 */

import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { ChakraProvider } from '@chakra-ui/react';
import { MetricsBadge } from './MetricsBadge';
import type { EvaluationMetrics } from '../../types/rag';

vi.mock('@chakra-ui/react', async () => {
  const actual = await vi.importActual('@chakra-ui/react');
  return {
    ...actual,
    Tooltip: ({ label, children }: { label: ReactNode; children: ReactNode }) => (
      <span>
        {children}
        <span data-testid="tooltip-content">{label}</span>
      </span>
    ),
  };
});

// ========== 測試資料 ==========

const highScoreMetrics: EvaluationMetrics = {
  accuracy: 9.5,
  completeness: 9.0,
  clarity: 9.0,
  weighted_score: 9.2,
  is_passing: true,
  suggestion: '',
  faithfulness: 'grounded',
  confidence_score: 0.92,
};

const mediumScoreMetrics: EvaluationMetrics = {
  accuracy: 7.2,
  completeness: 7.0,
  clarity: 7.5,
  weighted_score: 7.2,
  is_passing: true,
  suggestion: '',
  faithfulness: 'grounded',
  confidence_score: 0.72,
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
      renderWithChakra(<MetricsBadge metrics={null} />);
      expect(screen.queryByText(/\(\s*(高信賴|建議查證|可能幻覺)\s*\)/)).not.toBeInTheDocument();
    });

    it('當 metrics 為 undefined 時不應渲染任何內容', () => {
      renderWithChakra(<MetricsBadge metrics={undefined} />);
      expect(screen.queryByText(/\(\s*(高信賴|建議查證|可能幻覺)\s*\)/)).not.toBeInTheDocument();
    });
  });

  describe('分數區間顏色邏輯', () => {
    it('高分 (≥8.0) 應顯示綠色和「高信賴」', () => {
      renderWithChakra(<MetricsBadge metrics={highScoreMetrics} />);
      
      expect(screen.getByText('9.2/10')).toBeInTheDocument();
      expect(screen.getByText('(高信賴)')).toBeInTheDocument();
    });

    it('中分 (6.0-7.9) 應顯示黃色和「建議查證」', () => {
      renderWithChakra(<MetricsBadge metrics={mediumScoreMetrics} />);
      
      expect(screen.getAllByText('7.2/10').length).toBeGreaterThan(0);
      expect(screen.getByText('(建議查證)')).toBeInTheDocument();
    });

    it('低分 (<6.0) 應顯示紅色和「可能幻覺」', () => {
      renderWithChakra(<MetricsBadge metrics={lowScoreMetrics} />);
      
      expect(screen.getByText('4.4/10')).toBeInTheDocument();
      expect(screen.getByText('(可能幻覺)')).toBeInTheDocument();
    });
  });

  describe('Tooltip 內容', () => {
    it('應顯示詳細 Tooltip', () => {
      renderWithChakra(<MetricsBadge metrics={highScoreMetrics} />);

      expect(screen.getByText('📊 學術品質評估')).toBeInTheDocument();
    });

    it('Tooltip 應顯示分項分數', () => {
      renderWithChakra(<MetricsBadge metrics={highScoreMetrics} />);

      expect(screen.getByText('精確度')).toBeInTheDocument();
      expect(screen.getByText('完整性')).toBeInTheDocument();
      expect(screen.getByText('清晰度')).toBeInTheDocument();
    });
  });

  describe('及格/不及格狀態', () => {
    it('及格時應顯示 ✅', () => {
      renderWithChakra(<MetricsBadge metrics={highScoreMetrics} />);

      expect(screen.getByText(/9\.2\/10 ✅ 及格/)).toBeInTheDocument();
    });

    it('不及格時應顯示 ❌ 和改進建議', () => {
      renderWithChakra(<MetricsBadge metrics={lowScoreMetrics} />);

      expect(screen.getByText(/4\.4\/10 ❌ 不及格/)).toBeInTheDocument();
      expect(screen.getByText('💡 建議：')).toBeInTheDocument();
    });
  });

  describe('showSuggestion 屬性', () => {
    it('當 showSuggestion 為 false 時不應顯示建議', () => {
      renderWithChakra(
        <MetricsBadge metrics={lowScoreMetrics} showSuggestion={false} />
      );

      expect(screen.queryByText('💡 建議：')).not.toBeInTheDocument();
    });
  });

  describe('showDetailedTooltip 屬性', () => {
    it('當 showDetailedTooltip 為 false 時應顯示簡易 Tooltip', () => {
      renderWithChakra(
        <MetricsBadge metrics={highScoreMetrics} showDetailedTooltip={false} />
      );

      expect(screen.getByText('信心分數: 9.2/10')).toBeInTheDocument();
      expect(screen.queryByText('精確度')).not.toBeInTheDocument();
    });
  });
});
