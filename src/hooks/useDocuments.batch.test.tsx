import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useBatchUploadDocuments } from './useDocuments';

const toastMock = vi.fn();
const uploadPdfMock = vi.fn();
const getDocumentStatusMock = vi.fn();

vi.mock('../services/pdfApi', () => ({
  listDocuments: vi.fn(),
  uploadPdf: (...args: unknown[]) => uploadPdfMock(...args),
  getDocumentStatus: (...args: unknown[]) => getDocumentStatusMock(...args),
  deleteDocument: vi.fn(),
  translateDocument: vi.fn(),
}));

vi.mock('@chakra-ui/react', async () => {
  const actual = await vi.importActual<typeof import('@chakra-ui/react')>('@chakra-ui/react');
  return {
    ...actual,
    useToast: () => toastMock,
  };
});

function createWrapper(queryClient: QueryClient) {
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { promise, resolve, reject };
}

describe('useBatchUploadDocuments', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('starts uploads with concurrency 2 instead of sending the whole batch at once', async () => {
    const queryClient = new QueryClient();
    const first = deferred<{
      doc_id: string;
      status: 'ready';
      message: string;
      pdf_available: boolean;
      pdf_download_url: string;
      pdf_error: null;
      rag_status: 'processing_background';
    }>();
    const second = deferred<{
      doc_id: string;
      status: 'ready';
      message: string;
      pdf_available: boolean;
      pdf_download_url: string;
      pdf_error: null;
      rag_status: 'processing_background';
    }>();
    const third = deferred<{
      doc_id: string;
      status: 'ready';
      message: string;
      pdf_available: boolean;
      pdf_download_url: string;
      pdf_error: null;
      rag_status: 'processing_background';
    }>();

    uploadPdfMock
      .mockImplementationOnce(() => first.promise)
      .mockImplementationOnce(() => second.promise)
      .mockImplementationOnce(() => third.promise);
    getDocumentStatusMock.mockResolvedValue({
      step: 'indexed',
      step_label: '全部完成',
      is_pdf_ready: true,
      is_fully_complete: true,
      error_message: null,
    });

    const { result } = renderHook(() => useBatchUploadDocuments(), {
      wrapper: createWrapper(queryClient),
    });

    const files = [
      new File(['a'], 'a.pdf', { type: 'application/pdf' }),
      new File(['b'], 'b.pdf', { type: 'application/pdf' }),
      new File(['c'], 'c.pdf', { type: 'application/pdf' }),
    ];

    let batchPromise!: Promise<void>;
    await act(async () => {
      batchPromise = result.current.uploadFiles(files);
      await Promise.resolve();
    });

    expect(uploadPdfMock).toHaveBeenCalledTimes(2);

    await act(async () => {
      first.resolve({
        doc_id: 'doc-1',
        status: 'ready',
        message: 'ok',
        pdf_available: true,
        pdf_download_url: '/pdfmd/file/doc-1?type=original',
        pdf_error: null,
        rag_status: 'processing_background',
      });
      await Promise.resolve();
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(uploadPdfMock).toHaveBeenCalledTimes(3);
    });

    await act(async () => {
      second.resolve({
        doc_id: 'doc-2',
        status: 'ready',
        message: 'ok',
        pdf_available: true,
        pdf_download_url: '/pdfmd/file/doc-2?type=original',
        pdf_error: null,
        rag_status: 'processing_background',
      });
      third.resolve({
        doc_id: 'doc-3',
        status: 'ready',
        message: 'ok',
        pdf_available: true,
        pdf_download_url: '/pdfmd/file/doc-3?type=original',
        pdf_error: null,
        rag_status: 'processing_background',
      });
      await batchPromise;
    });

    expect(result.current.uploads).toHaveLength(3);
    expect(result.current.uploads.every((upload) => upload.status === 'indexed')).toBe(true);
  });

  it('keeps processing other files when one upload request fails', async () => {
    const queryClient = new QueryClient();
    uploadPdfMock
      .mockRejectedValueOnce(new Error('network down'))
      .mockResolvedValueOnce({
        doc_id: 'doc-2',
        status: 'ready',
        message: 'ok',
        pdf_available: true,
        pdf_download_url: '/pdfmd/file/doc-2?type=original',
        pdf_error: null,
        rag_status: 'processing_background',
      });
    getDocumentStatusMock.mockResolvedValue({
      step: 'indexed',
      step_label: '全部完成',
      is_pdf_ready: true,
      is_fully_complete: true,
      error_message: null,
    });

    const { result } = renderHook(() => useBatchUploadDocuments(), {
      wrapper: createWrapper(queryClient),
    });

    await act(async () => {
      await result.current.uploadFiles([
        new File(['a'], 'broken.pdf', { type: 'application/pdf' }),
        new File(['b'], 'good.pdf', { type: 'application/pdf' }),
      ]);
    });

    expect(result.current.uploads).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          fileName: 'broken.pdf',
          status: 'failed',
          errorMessage: 'network down',
        }),
        expect.objectContaining({
          fileName: 'good.pdf',
          status: 'indexed',
        }),
      ])
    );
  });

  it('surfaces index_failed polling results with the backend error message', async () => {
    const queryClient = new QueryClient();
    uploadPdfMock.mockResolvedValue({
      doc_id: 'doc-1',
      status: 'ready',
      message: 'ok',
      pdf_available: true,
      pdf_download_url: '/pdfmd/file/doc-1?type=original',
      pdf_error: null,
      rag_status: 'processing_background',
    });
    getDocumentStatusMock.mockResolvedValue({
      step: 'index_failed',
      step_label: '索引失敗',
      is_pdf_ready: true,
      is_fully_complete: false,
      error_message: 'Graph indexing failed: quota exceeded',
    });

    const { result } = renderHook(() => useBatchUploadDocuments(), {
      wrapper: createWrapper(queryClient),
    });

    await act(async () => {
      await result.current.uploadFiles([new File(['a'], 'paper.pdf', { type: 'application/pdf' })]);
    });

    expect(result.current.uploads).toEqual([
      expect.objectContaining({
        fileName: 'paper.pdf',
        status: 'index_failed',
        errorMessage: 'Graph indexing failed: quota exceeded',
      }),
    ]);
  });
});
