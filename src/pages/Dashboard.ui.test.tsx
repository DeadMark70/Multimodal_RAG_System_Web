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

vi.mock('../hooks/useDocuments', () => ({
  useDocumentList: () => ({
    data: [
      {
        id: 'doc-1',
        file_name: 'Q3 Financial Report.pdf',
        created_at: '2026-06-08T00:00:00Z',
        status: 'ready',
        processing_step: 'indexed',
        has_original_pdf: true,
        has_translated_pdf: false,
        can_translate: true,
        error_message: null,
      },
      {
        id: 'doc-2',
        file_name: 'Market Analysis.pdf',
        created_at: '2026-06-08T00:00:00Z',
        status: 'ready',
        processing_step: 'ocr',
        has_original_pdf: true,
        has_translated_pdf: false,
        can_translate: true,
        error_message: null,
      },
      {
        id: 'doc-3',
        file_name: 'Appendix.pdf',
        created_at: '2026-06-08T00:00:00Z',
        status: 'failed',
        processing_step: 'index_failed',
        has_original_pdf: true,
        has_translated_pdf: false,
        can_translate: false,
        error_message: 'failed',
      },
    ],
    isLoading: false,
    error: null,
  }),
}));

vi.mock('../hooks/useGraphData', () => ({
  useGraphStatus: () => ({
    data: {
      has_graph: true,
      node_count: 120,
      edge_count: 200,
      community_count: 8,
      pending_resolution: 0,
      needs_optimization: false,
      last_updated: '2026-06-08T00:00:00Z',
      eligible_document_count: 5,
      indexed_document_count: 3,
      failed_document_count: 1,
      partial_document_count: 0,
      empty_document_count: 0,
      active_job_state: null,
    },
    isLoading: false,
    error: null,
  }),
  useGraphDocuments: () => ({
    data: {
      documents: [
        {
          doc_id: 'doc-1',
          status: 'indexed',
          chunk_count: 10,
          chunks_succeeded: 10,
          chunks_failed: 0,
          entities_added: 12,
          edges_added: 20,
          last_error: null,
          last_attempted_at: null,
          last_succeeded_at: null,
          file_name: 'Q3 Financial Report.pdf',
          is_eligible: true,
        },
        {
          doc_id: 'doc-4',
          status: 'skipped',
          chunk_count: 0,
          chunks_succeeded: 0,
          chunks_failed: 0,
          entities_added: 0,
          edges_added: 0,
          last_error: null,
          last_attempted_at: null,
          last_succeeded_at: null,
          file_name: 'Pending Graph.pdf',
          is_eligible: true,
        },
        {
          doc_id: 'doc-5',
          status: 'failed',
          chunk_count: 3,
          chunks_succeeded: 1,
          chunks_failed: 2,
          entities_added: 1,
          edges_added: 0,
          last_error: 'graph failed',
          last_attempted_at: null,
          last_succeeded_at: null,
          file_name: 'Graph Failed.pdf',
          is_eligible: true,
        },
      ],
      total: 3,
    },
    isLoading: false,
    error: null,
  }),
}));

vi.mock('../components/charts/DocumentGraphStatusChart', () => ({
  default: () => <div>StatusChart</div>,
}));

vi.mock('../components/charts/QueryTrendChart', () => ({
  default: () => <div>TrendChart</div>,
}));

describe('Dashboard UI Smoke', () => {
  it('renders updated KPI, chart, and top-document sections', () => {
    render(
      <ChakraProvider theme={theme}>
        <Dashboard />
      </ChakraProvider>
    );

    expect(screen.getByTestId('dashboard-kpis')).toBeInTheDocument();
    expect(screen.getByTestId('dashboard-charts')).toBeInTheDocument();
    expect(screen.getByTestId('dashboard-top-documents')).toBeInTheDocument();
    expect(screen.getByText('文件總數')).toBeInTheDocument();
    expect(screen.getByText('已索引/建圖覆蓋率')).toBeInTheDocument();
    expect(screen.getByText('失敗或待處理數')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('60%')).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument();
    expect(screen.getByText('Q3 Financial Report.pdf')).toBeInTheDocument();
  });
});
