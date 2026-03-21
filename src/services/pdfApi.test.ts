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
  const mockedApi = api as unknown as {
    get: ReturnType<typeof vi.fn>;
    post: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('lists documents via GET /pdfmd/list', async () => {
    mockedApi.get.mockResolvedValue({
      data: {
        documents: [{
          id: '1',
          file_name: 'demo.pdf',
          created_at: '2026-03-20T00:00:00Z',
          status: 'ready',
          processing_step: 'ocr_completed',
          has_original_pdf: true,
          has_translated_pdf: false,
          can_translate: true,
          error_message: null,
        }],
        total: 1,
      },
    });

    const result = await pdfApi.listDocuments();

    expect(mockedApi.get).toHaveBeenCalledWith('/pdfmd/list');
    expect(result.total).toBe(1);
  });

  it('uploads PDF and returns JSON status without real API call', async () => {
    const payload = {
      doc_id: 'doc-1',
      status: 'ready',
      message: 'OCR 已完成，背景索引進行中；如需翻譯請從歷史列表手動觸發。',
      pdf_available: true,
      pdf_download_url: '/pdfmd/file/doc-1?type=original',
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

  it('downloads a typed PDF blob', async () => {
    const pdfBlob = new Blob(['pdf'], { type: 'application/pdf' });
    mockedApi.get.mockResolvedValue({ data: pdfBlob });

    const result = await pdfApi.downloadPdf('doc-1', 'translated');

    expect(mockedApi.get).toHaveBeenCalledWith('/pdfmd/file/doc-1', {
      params: { type: 'translated' },
      responseType: 'blob',
    });
    expect(result).toBe(pdfBlob);
  });

  it('gets status by doc id', async () => {
    mockedApi.get.mockResolvedValue({
      data: {
        step: 'index_failed',
        step_label: '索引失敗',
        is_pdf_ready: true,
        is_fully_complete: false,
        error_message: 'Graph indexing failed: quota exceeded',
      },
    });

    const result = await pdfApi.getDocumentStatus('doc-1');

    expect(mockedApi.get).toHaveBeenCalledWith('/pdfmd/file/doc-1/status');
    expect(result.step).toBe('index_failed');
    expect(result.error_message).toBe('Graph indexing failed: quota exceeded');
  });

  it('translates a document via POST endpoint', async () => {
    mockedApi.post.mockResolvedValue({
      data: {
        doc_id: 'doc-1',
        status: 'completed',
        message: 'Translation completed successfully.',
        pdf_available: true,
        pdf_download_url: '/pdfmd/file/doc-1?type=translated',
        pdf_error: null,
      },
    });

    const result = await pdfApi.translateDocument('doc-1');

    expect(mockedApi.post).toHaveBeenCalledWith('/pdfmd/file/doc-1/translate');
    expect(result.pdf_download_url).toBe('/pdfmd/file/doc-1?type=translated');
  });
});
