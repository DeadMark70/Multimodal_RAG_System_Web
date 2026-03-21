import { ChakraProvider } from '@chakra-ui/react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import theme from '../../theme';
import DocumentSelector from './DocumentSelector';
import type { DocumentItem } from '../../types/rag';

const useDocumentListMock = vi.fn<
  () => {
    data: DocumentItem[];
    isLoading: boolean;
    error: Error | null;
    refetch: ReturnType<typeof vi.fn>;
  }
>();

vi.mock('../../hooks/useDocuments', () => ({
  useDocumentList: () => useDocumentListMock(),
}));

describe('DocumentSelector', () => {
  beforeEach(() => {
    useDocumentListMock.mockReset();
  });

  it('filters out ocr_completed documents from selectable results', () => {
    useDocumentListMock.mockReturnValue({
      data: [
        {
          id: 'doc-ocr',
          file_name: 'ocr-only.pdf',
          created_at: '2026-03-20T00:00:00Z',
          status: 'ready',
          processing_step: 'ocr_completed',
          has_original_pdf: true,
          has_translated_pdf: false,
          can_translate: true,
          error_message: null,
        },
        {
          id: 'doc-indexed',
          file_name: 'indexed.pdf',
          created_at: '2026-03-20T00:00:00Z',
          status: 'indexed',
          processing_step: 'indexed',
          has_original_pdf: true,
          has_translated_pdf: false,
          can_translate: false,
          error_message: null,
        },
      ],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(
      <ChakraProvider theme={theme}>
        <DocumentSelector selectedIds={[]} onSelectionChange={vi.fn()} />
      </ChakraProvider>
    );

    expect(screen.getByText('indexed.pdf')).toBeInTheDocument();
    expect(screen.queryByText('ocr-only.pdf')).not.toBeInTheDocument();
  });

  it('selects indexed documents when toggled', () => {
    const onSelectionChange = vi.fn();

    useDocumentListMock.mockReturnValue({
      data: [
        {
          id: 'doc-indexed',
          file_name: 'indexed.pdf',
          created_at: '2026-03-20T00:00:00Z',
          status: 'completed',
          processing_step: 'completed',
          has_original_pdf: true,
          has_translated_pdf: true,
          can_translate: false,
          error_message: null,
        },
      ],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(
      <ChakraProvider theme={theme}>
        <DocumentSelector selectedIds={[]} onSelectionChange={onSelectionChange} />
      </ChakraProvider>
    );

    fireEvent.click(screen.getByRole('checkbox', { name: '選擇文件 indexed.pdf' }));
    expect(onSelectionChange).toHaveBeenCalledWith(['doc-indexed']);
  });
});
