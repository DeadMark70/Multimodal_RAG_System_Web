import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as pdfApi from './pdfApi';
import api from './api';

vi.mock('./api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('pdfApi', () => {
  const mockedApi = api as {
    get: ReturnType<typeof vi.fn>;
    post: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('lists documents via GET /pdfmd/list', async () => {
    mockedApi.get.mockResolvedValue({
      data: { documents: [{ id: '1' }], total: 1 },
    });

    const result = await pdfApi.listDocuments();

    expect(mockedApi.get).toHaveBeenCalledWith('/pdfmd/list');
    expect(result.total).toBe(1);
  });

  it('uploads PDF and returns JSON status without real API call', async () => {
    const payload = {
      doc_id: 'doc-1',
      status: 'completed',
      message: 'Upload accepted. Background indexing started.',
      pdf_available: true,
      pdf_download_url: '/pdfmd/file/doc-1',
      pdf_error: null,
      rag_status: 'processing_background',
    };
    mockedApi.post.mockResolvedValue({
      data: payload,
    });

    const file = new File(['content'], 'demo.pdf', { type: 'application/pdf' });
    const result = await pdfApi.uploadPdf(file);

    expect(mockedApi.post).toHaveBeenCalledWith(
      '/pdfmd/upload_pdf_md',
      expect.any(FormData),
      expect.any(Object)
    );
    expect(result.doc_id).toBe('doc-1');
    expect(result.pdf_available).toBe(true);
  });

  it('gets status by doc id', async () => {
    mockedApi.get.mockResolvedValue({
      data: {
        step: 'indexed',
        step_label: 'completed',
        is_pdf_ready: true,
        is_fully_complete: true,
      },
    });

    const result = await pdfApi.getDocumentStatus('doc-1');

    expect(mockedApi.get).toHaveBeenCalledWith('/pdfmd/file/doc-1/status');
    expect(result.is_fully_complete).toBe(true);
  });
});
