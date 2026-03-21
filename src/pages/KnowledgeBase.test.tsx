import { ChakraProvider } from '@chakra-ui/react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import theme from '../theme';
import type { BatchUploadItem } from '../hooks/useDocuments';
import type { DocumentItem } from '../types/rag';
import KnowledgeBase from './KnowledgeBase';

type DocumentListHookResult = {
  data: DocumentItem[];
  isLoading: boolean;
  error: Error | null;
  refetch: ReturnType<typeof vi.fn>;
};

type MutationHookResult = {
  mutateAsync: ReturnType<typeof vi.fn>;
  isPending: boolean;
};

type BatchUploadHookResult = {
  uploads: BatchUploadItem[];
  uploadFiles: ReturnType<typeof vi.fn>;
  isUploading: boolean;
};

const {
  useDocumentListMock,
  useUploadDocumentMock,
  useBatchUploadDocumentsMock,
  useDeleteDocumentMock,
  useTranslateDocumentMock,
  downloadPdfMock,
  toastMock,
} = vi.hoisted(() => ({
  useDocumentListMock: vi.fn<() => DocumentListHookResult>(),
  useUploadDocumentMock: vi.fn<() => MutationHookResult>(),
  useBatchUploadDocumentsMock: vi.fn<() => BatchUploadHookResult>(),
  useDeleteDocumentMock: vi.fn<() => MutationHookResult>(),
  useTranslateDocumentMock: vi.fn<() => MutationHookResult>(),
  downloadPdfMock: vi.fn<() => Promise<Blob>>(),
  toastMock: vi.fn(),
}));

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
  useBatchUploadDocuments: () => useBatchUploadDocumentsMock(),
  useDeleteDocument: () => useDeleteDocumentMock(),
  useTranslateDocument: () => useTranslateDocumentMock(),
}));

vi.mock('../services/pdfApi', () => ({
  downloadPdf: downloadPdfMock,
}));

vi.mock('@chakra-ui/react', async () => {
  const actual = await vi.importActual<Record<string, unknown>>('@chakra-ui/react');
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
    useBatchUploadDocumentsMock.mockReset();
    useDeleteDocumentMock.mockReset();
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
          error_message: null,
        },
      ],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });
    useUploadDocumentMock.mockReturnValue({ mutateAsync: vi.fn(), isPending: false });
    useBatchUploadDocumentsMock.mockReturnValue({
      uploads: [],
      uploadFiles: vi.fn(),
      isUploading: false,
    });
    useDeleteDocumentMock.mockReturnValue({ mutateAsync: vi.fn(), isPending: false });
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

  it('renders mixed batch upload results with visible error guidance', () => {
    useBatchUploadDocumentsMock.mockReturnValue({
      uploads: [
        {
          id: 'upload-1',
          fileName: 'good.pdf',
          docId: 'doc-good',
          status: 'indexed',
          errorMessage: null,
        },
        {
          id: 'upload-2',
          fileName: 'failed.pdf',
          docId: 'doc-failed',
          status: 'index_failed',
          errorMessage: 'Graph indexing failed: quota exceeded',
        },
      ],
      uploadFiles: vi.fn(),
      isUploading: false,
    });

    render(
      <ChakraProvider theme={theme}>
        <KnowledgeBase />
      </ChakraProvider>
    );

    expect(screen.getByText('批次上傳進度')).toBeInTheDocument();
    expect(screen.getByText('good.pdf')).toBeInTheDocument();
    expect(screen.getByText('failed.pdf')).toBeInTheDocument();
    expect(screen.getByText('Graph indexing failed: quota exceeded')).toBeInTheDocument();
    expect(screen.getByText('部分文件需要處理')).toBeInTheDocument();
  });
});
