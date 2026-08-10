import { ChakraProvider } from '@chakra-ui/react';
import { fireEvent, render, screen } from '@testing-library/react';
import { useEffect, type ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { downloadPdf } from '../../services/pdfApi';
import type { SourceEvidence } from '../../types/evidence';
import theme from '../../theme';
import SourceViewerOverlay from './SourceViewerOverlay';

const rendererState = vi.hoisted(() => ({ shouldThrow: false }));
const downloadPdfMock = vi.hoisted(() => vi.fn());

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
  Page: ({ pageNumber }: { pageNumber: number }) => <div>Rendered page {pageNumber}</div>,
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
    downloadPdfMock.mockReset();
    downloadPdfMock.mockResolvedValue(new Blob(['pdf'], { type: 'application/pdf' }));
    Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: vi.fn(() => 'blob:pdf') });
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: vi.fn() });
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

  it('revokes the blob URL when closed', async () => {
    const { unmount } = renderViewer({ page: 1, bbox: null });

    await screen.findByText('Rendered page 1');
    unmount();

    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:pdf');
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

  it('reports an expired session while keeping the selected quote visible', async () => {
    vi.mocked(downloadPdf).mockRejectedValueOnce({ response: { status: 401 } });
    renderViewer({ page: 3, bbox: null, quote: 'Keep this quote visible.' });

    expect(await screen.findByText('登入狀態已失效，請重新登入。')).toBeInTheDocument();
    expect(screen.getByText('Keep this quote visible.')).toBeInTheDocument();
  });
});
