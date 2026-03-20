import { ChakraProvider } from '@chakra-ui/react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import theme from '../theme';
import KnowledgeBase from './KnowledgeBase';

const useDocumentListMock = vi.fn();
const useUploadDocumentMock = vi.fn();
const useDeleteDocumentMock = vi.fn();
const useDocumentStatusMock = vi.fn();
const useTranslateDocumentMock = vi.fn();
const downloadPdfMock = vi.fn();
const toastMock = vi.fn();

vi.mock('../components/layout/Layout', () => ({
  default: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock('../components/common/PageHeader', () => ({
  default: ({ title }: { title: string }) => <div>{title}</div>,
}));

vi.mock('../components/common/SurfaceCard', () => ({
  default: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock('../components/rag/UploadZone', () => ({
  default: () => <div>Upload Zone</div>,
}));

vi.mock('../hooks/useDocuments', () => ({
  useDocumentList: () => useDocumentListMock(),
  useUploadDocument: () => useUploadDocumentMock(),
  useDeleteDocument: () => useDeleteDocumentMock(),
  useDocumentStatus: () => useDocumentStatusMock(),
  useTranslateDocument: () => useTranslateDocumentMock(),
}));

vi.mock('../services/pdfApi', () => ({
  downloadPdf: (...args: unknown[]) => downloadPdfMock(...args),
}));

vi.mock('@chakra-ui/react', async () => {
  const actual = await vi.importActual<typeof import('@chakra-ui/react')>('@chakra-ui/react');
  return {
    ...actual,
    CardBody: ({ children }: { children: ReactNode }) => <div>{children}</div>,
    useToast: () => toastMock,
  };
});

describe('KnowledgeBase', () => {
  beforeEach(() => {
    HTMLElement.prototype.scrollTo = vi.fn();
    useDocumentListMock.mockReset();
    useUploadDocumentMock.mockReset();
    useDeleteDocumentMock.mockReset();
    useDocumentStatusMock.mockReset();
    useTranslateDocumentMock.mockReset();
    downloadPdfMock.mockReset();
    toastMock.mockReset();

    useDocumentListMock.mockReturnValue({
      data: [
        {
          id: 'doc-1',
          file_name: 'demo.pdf',
          created_at: '2026-03-20T00:00:00Z',
          status: 'completed',
          processing_step: 'indexed',
          has_original_pdf: true,
          has_translated_pdf: true,
          can_translate: false,
        },
      ],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });
    useUploadDocumentMock.mockReturnValue({ mutateAsync: vi.fn(), isPending: false });
    useDeleteDocumentMock.mockReturnValue({ mutateAsync: vi.fn(), isPending: false });
    useDocumentStatusMock.mockReturnValue({ data: null });
    useTranslateDocumentMock.mockReturnValue({ mutateAsync: vi.fn(), isPending: false });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('opens translated PDFs via blob URLs instead of direct navigation', async () => {
    const blob = new Blob(['pdf'], { type: 'application/pdf' });
    const createObjectUrlMock = vi.fn(() => 'blob:translated-pdf');
    const revokeObjectUrlMock = vi.fn();
    const openMock = vi.fn(() => ({}));

    downloadPdfMock.mockResolvedValue(blob);
    vi.stubGlobal('open', openMock);
    vi.stubGlobal('URL', {
      createObjectURL: createObjectUrlMock,
      revokeObjectURL: revokeObjectUrlMock,
    });

    render(
      <ChakraProvider theme={theme}>
        <KnowledgeBase />
      </ChakraProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: '文件操作 demo.pdf' }));
    fireEvent.click(screen.getByText('開啟翻譯 PDF'));

    await waitFor(() => {
      expect(downloadPdfMock).toHaveBeenCalledWith('doc-1', 'translated');
      expect(createObjectUrlMock).toHaveBeenCalledWith(blob);
      expect(openMock).toHaveBeenCalledWith('blob:translated-pdf', '_blank', 'noopener,noreferrer');
    });
  });
});
