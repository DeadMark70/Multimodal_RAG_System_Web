import { ChakraProvider } from '@chakra-ui/react';
import { fireEvent, render, screen } from '@testing-library/react';
import { useEffect, type ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { downloadPdf } from '../../services/pdfApi';
import type { SourceEvidence } from '../../types/evidence';
import theme from '../../theme';
import SourceViewerOverlay from './SourceViewerOverlay';

const rendererState = vi.hoisted(() => ({
  shouldThrow: false,
  pageFailure: null as 'load' | 'render' | null,
}));
const downloadPdfMock = vi.hoisted(() => vi.fn());
const revokeObjectUrlMock = vi.hoisted(() => vi.fn());

vi.mock('../../services/pdfApi', () => ({
  downloadPdf: downloadPdfMock,
}));

vi.mock('react-pdf', () => ({
  pdfjs: { GlobalWorkerOptions: {} },
  Document: ({ children, onLoadSuccess }: { children: ReactNode; onLoadSuccess?: (document: { numPages: number }) => void }) => {
    if (rendererState.shouldThrow) {
      throw new Error('PDF renderer failed');
    }

    useEffect(() => {
      onLoadSuccess?.({ numPages: 7 });
    }, [onLoadSuccess]);

    return <div>{children}</div>;
  },
  Page: ({
    pageNumber,
    onLoadError,
    onRenderError,
    renderAnnotationLayer,
    renderTextLayer,
  }: {
    pageNumber: number;
    onLoadError?: (error: Error) => void;
    onRenderError?: (error: Error) => void;
    renderAnnotationLayer?: boolean;
    renderTextLayer?: boolean;
  }) => {
    useEffect(() => {
      if (rendererState.pageFailure === 'load') onLoadError?.(new Error('Page load failed'));
      if (rendererState.pageFailure === 'render') onRenderError?.(new Error('Page render failed'));
    }, [onLoadError, onRenderError]);

    return (
      <div
        data-testid="rendered-page"
        data-render-annotation-layer={String(renderAnnotationLayer)}
        data-render-text-layer={String(renderTextLayer)}
      >
        Rendered page {pageNumber}
      </div>
    );
  },
}));

const baseEvidence: SourceEvidence = {
  docId: 'doc-1',
  filename: 'paper.pdf',
  page: 3,
  quote: 'The selected evidence quote.',
  bbox: null,
  provenanceStatus: 'full',
};

function renderViewer(overrides: Partial<SourceEvidence> = {}) {
  const evidence = { ...baseEvidence, ...overrides };
  const onClose = vi.fn();
  const result = render(
    <ChakraProvider theme={theme}>
      <SourceViewerOverlay evidence={evidence} onClose={onClose} />
    </ChakraProvider>,
  );

  return { ...result, onClose };
}

function renderThrowingViewer() {
  rendererState.shouldThrow = true;
  return renderViewer();
}

describe('SourceViewerOverlay', () => {
  beforeEach(() => {
    rendererState.shouldThrow = false;
    rendererState.pageFailure = null;
    downloadPdfMock.mockReset();
    downloadPdfMock.mockResolvedValue(new Blob(['pdf'], { type: 'application/pdf' }));
    revokeObjectUrlMock.mockReset();
    Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: vi.fn(() => 'blob:pdf') });
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: revokeObjectUrlMock });
    vi.stubGlobal('open', vi.fn());
  });

  it('downloads the authenticated PDF and opens the cited page', async () => {
    renderViewer({ page: 3, bbox: null });

    expect(await screen.findByText('Rendered page 3')).toBeInTheDocument();
    expect(downloadPdf).toHaveBeenCalledWith('doc-1', 'original');
  });

  it('moves between PDF pages after opening the cited page', async () => {
    renderViewer({ page: 3 });

    expect(await screen.findByText('Rendered page 3')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '下一頁' }));
    expect(await screen.findByText('Rendered page 4')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '上一頁' }));
    expect(await screen.findByText('Rendered page 3')).toBeInTheDocument();
  });

  it('renders a normalized evidence rectangle', async () => {
    renderViewer({ page: 2, bbox: [0.1, 0.2, 0.6, 0.5] });

    const highlight = await screen.findByTestId('source-bbox-highlight');
    expect(highlight).toHaveStyle({ left: '10%', top: '20%', width: '50%', height: '30%' });
  });

  it('renders a rectangle only on its cited page', async () => {
    renderViewer({ page: 2, bbox: [0.1, 0.2, 0.6, 0.5] });

    expect(await screen.findByTestId('source-bbox-highlight')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '下一頁' }));
    expect(screen.queryByTestId('source-bbox-highlight')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '上一頁' }));
    expect(await screen.findByTestId('source-bbox-highlight')).toBeInTheDocument();
  });

  it('does not render a rectangle when the evidence page is unresolved', async () => {
    renderViewer({ page: null, bbox: [0.1, 0.2, 0.6, 0.5] });

    await screen.findByText('Rendered page 1');
    expect(screen.queryByTestId('source-bbox-highlight')).not.toBeInTheDocument();
  });

  it('disables PDF text and annotation layers in the lazy viewer', async () => {
    renderViewer();

    const page = await screen.findByTestId('rendered-page');
    expect(page).toHaveAttribute('data-render-text-layer', 'false');
    expect(page).toHaveAttribute('data-render-annotation-layer', 'false');
  });

  it('revokes the blob URL when closed', async () => {
    const { unmount } = renderViewer({ page: 1, bbox: null });

    await screen.findByText('Rendered page 1');
    unmount();

    expect(revokeObjectUrlMock).toHaveBeenCalledWith('blob:pdf');
  });

  it('falls back without replacing the owning page when PDF rendering throws', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const preventExpectedRendererError = (event: ErrorEvent) => event.preventDefault();
    window.addEventListener('error', preventExpectedRendererError);
    try {
      renderThrowingViewer();

      expect(await screen.findByText('PDF 預覽載入失敗')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '使用瀏覽器開啟' })).toBeInTheDocument();
    } finally {
      window.removeEventListener('error', preventExpectedRendererError);
      consoleError.mockRestore();
    }
  });

  it.each(['load', 'render'] as const)('falls back when the PDF page %s callback reports an error', async (failure) => {
    rendererState.pageFailure = failure;
    renderViewer();

    expect(await screen.findByText('PDF 預覽載入失敗')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '再試一次' })).toBeInTheDocument();
  });

  it('retries a callback-driven PDF page failure', async () => {
    rendererState.pageFailure = 'render';
    renderViewer();

    expect(await screen.findByText('PDF 預覽載入失敗')).toBeInTheDocument();
    rendererState.pageFailure = null;
    fireEvent.click(screen.getByRole('button', { name: '再試一次' }));

    expect(await screen.findByText('Rendered page 3')).toBeInTheDocument();
  });

  it('uses a relationship note instead of an original-text heading for source-only evidence', async () => {
    renderViewer({
      page: null,
      quote: null,
      provenanceStatus: 'source_only',
    });

    await screen.findByText('Rendered page 1');
    expect(screen.getByText('文件關聯')).toBeInTheDocument();
    expect(screen.getByText('僅確認文件關聯，沒有可驗證的原文片段。')).toBeInTheDocument();
    expect(screen.queryByText('原文')).not.toBeInTheDocument();
  });

  it('reports an expired session while keeping the selected quote visible', async () => {
    vi.mocked(downloadPdf).mockRejectedValueOnce({ response: { status: 401 } });
    renderViewer({ page: 3, bbox: null, quote: 'Keep this quote visible.' });

    expect(await screen.findByText('登入狀態已失效，請重新登入。')).toBeInTheDocument();
    expect(screen.getByText('Keep this quote visible.')).toBeInTheDocument();
  });
});
