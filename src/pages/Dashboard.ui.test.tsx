import { render, screen } from '@testing-library/react';
import { ChakraProvider } from '@chakra-ui/react';
import { describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import theme from '../theme';
import Dashboard from './Dashboard';

vi.mock('../components/layout/Layout', () => ({
  default: ({ children }: { children: ReactNode }) => <div data-testid="layout">{children}</div>,
}));

vi.mock('../hooks/useDashboardStats', () => ({
  default: () => ({
    data: {
      total_queries: 12450,
      accuracy_rate: 0.965,
      grounded_count: 250,
      hallucinated_count: 15,
      uncertain_count: 5,
      avg_confidence: 0.82,
      queries_last_7_days: [35, 40, 38, 42, 52, 49, 55],
      top_documents: [
        { doc_id: '1', filename: 'Q3 Financial Report.pdf', query_count: 1450 },
      ],
    },
    isLoading: false,
    error: null,
  }),
}));

vi.mock('../components/charts/AccuracyPieChart', () => ({
  default: () => <div>AccuracyChart</div>,
}));

vi.mock('../components/charts/QueryTrendChart', () => ({
  default: () => <div>TrendChart</div>,
}));

describe('Dashboard UI Smoke', () => {
  it('renders KPI, chart, and top-document sections', () => {
    render(
      <ChakraProvider theme={theme}>
        <Dashboard />
      </ChakraProvider>
    );

    expect(screen.getByTestId('dashboard-kpis')).toBeInTheDocument();
    expect(screen.getByTestId('dashboard-charts')).toBeInTheDocument();
    expect(screen.getByTestId('dashboard-top-documents')).toBeInTheDocument();
    expect(screen.getByText('Q3 Financial Report.pdf')).toBeInTheDocument();
  });
});
