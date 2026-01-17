/**
 * EvaluationRadarChart 單元測試
 */

import { render, screen } from '@testing-library/react';
import { ChakraProvider } from '@chakra-ui/react';
import EvaluationRadarChart from './EvaluationRadarChart';
import type { EvaluationMetrics } from '../../types/rag';

// Recharts 在測試環境需要 mock ResizeObserver
beforeAll(() => {
  global.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

const mockMetrics: EvaluationMetrics = {
  accuracy: 9.0,
  completeness: 8.0,
  clarity: 8.5,
  weighted_score: 8.6,
  is_passing: true,
  suggestion: '',
  faithfulness: 'grounded',
  confidence_score: 0.86,
};

const lowScoreMetrics: EvaluationMetrics = {
  accuracy: 4.0,
  completeness: 5.0,
  clarity: 4.5,
  weighted_score: 4.4,
  is_passing: false,
  suggestion: '建議補充更多文獻資料',
  faithfulness: 'hallucinated',
  confidence_score: 0.44,
};

const renderWithChakra = (ui: React.ReactElement) => {
  return render(<ChakraProvider>{ui}</ChakraProvider>);
};

describe('EvaluationRadarChart', () => {
  describe('基本渲染', () => {
    it('應正確渲染圖表', () => {
      const { container } = renderWithChakra(
        <EvaluationRadarChart metrics={mockMetrics} />
      );
      
      // Recharts 會渲染 SVG
      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });

    it('應顯示三個指標標籤', () => {
      renderWithChakra(<EvaluationRadarChart metrics={mockMetrics} />);
      
      expect(screen.getByText('精確度')).toBeInTheDocument();
      expect(screen.getByText('完整性')).toBeInTheDocument();
      expect(screen.getByText('清晰度')).toBeInTheDocument();
    });
  });

  describe('空值處理', () => {
    it('當 metrics 為 null 時應顯示「無評估資料」', () => {
      renderWithChakra(<EvaluationRadarChart metrics={null} />);
      
      expect(screen.getByText('無評估資料')).toBeInTheDocument();
    });

    it('當 metrics 為 undefined 時應顯示「無評估資料」', () => {
      renderWithChakra(<EvaluationRadarChart metrics={undefined} />);
      
      expect(screen.getByText('無評估資料')).toBeInTheDocument();
    });
  });

  describe('尺寸變化', () => {
    it('應支援 sm 尺寸', () => {
      const { container } = renderWithChakra(
        <EvaluationRadarChart metrics={mockMetrics} size="sm" />
      );
      
      const box = container.firstChild as HTMLElement;
      expect(box).toHaveStyle({ width: '180px', height: '150px' });
    });

    it('應支援 md 尺寸 (預設)', () => {
      const { container } = renderWithChakra(
        <EvaluationRadarChart metrics={mockMetrics} />
      );
      
      const box = container.firstChild as HTMLElement;
      expect(box).toHaveStyle({ width: '250px', height: '200px' });
    });

    it('應支援 lg 尺寸', () => {
      const { container } = renderWithChakra(
        <EvaluationRadarChart metrics={mockMetrics} size="lg" />
      );
      
      const box = container.firstChild as HTMLElement;
      expect(box).toHaveStyle({ width: '320px', height: '260px' });
    });
  });

  describe('低分數顯示', () => {
    it('應正確渲染低分數資料', () => {
      const { container } = renderWithChakra(
        <EvaluationRadarChart metrics={lowScoreMetrics} />
      );
      
      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });
  });

  describe('showLabels 屬性', () => {
    it('當 showLabels 為 false 時應隱藏半徑軸標籤', () => {
      const { container } = renderWithChakra(
        <EvaluationRadarChart metrics={mockMetrics} showLabels={false} />
      );
      
      // 圖表仍應渲染
      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });
  });
});
