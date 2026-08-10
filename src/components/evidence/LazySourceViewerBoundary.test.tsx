import { ChakraProvider } from '@chakra-ui/react';
import { fireEvent, render, screen } from '@testing-library/react';
import { useEffect } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { SourceEvidence } from '../../types/evidence';
import theme from '../../theme';
import { LazySourceViewerBoundary } from './LazySourceViewerBoundary';

const loadSourceViewerModuleMock = vi.hoisted(() => vi.fn());

vi.mock('./sourceViewerLoader', () => ({
  loadSourceViewerModule: loadSourceViewerModuleMock,
}));

const evidence: SourceEvidence = {
  docId: 'doc-1',
  filename: 'paper.pdf',
  page: 3,
  quote: null,
  bbox: null,
  provenanceStatus: 'source_only',
};

function renderBoundary(onClose = vi.fn(), onOwnerUnmount = vi.fn()) {
  function OwnerState() {
    useEffect(() => () => {
      onOwnerUnmount();
    }, []);
    return <div data-testid="owner-state">Graph zoom remains mounted</div>;
  }

  const result = render(
    <ChakraProvider theme={theme}>
      <OwnerState />
      <LazySourceViewerBoundary evidence={evidence} onClose={onClose} />
    </ChakraProvider>,
  );
  return { ...result, onClose, onOwnerUnmount };
}

describe('LazySourceViewerBoundary', () => {
  beforeEach(() => {
    loadSourceViewerModuleMock.mockReset();
  });

  it('contains a rejected viewer module and closes without unmounting page state', async () => {
    loadSourceViewerModuleMock.mockRejectedValueOnce(new Error('viewer chunk failed'));
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const preventExpectedViewerError = (event: ErrorEvent) => event.preventDefault();
    window.addEventListener('error', preventExpectedViewerError);
    try {
      const { onClose, onOwnerUnmount } = renderBoundary();

      expect(await screen.findByText('PDF 檢視器載入失敗')).toBeInTheDocument();
      expect(screen.getByTestId('owner-state')).toBeInTheDocument();
      expect(onOwnerUnmount).not.toHaveBeenCalled();
      fireEvent.click(screen.getByRole('button', { name: '關閉' }));
      expect(onClose).toHaveBeenCalledOnce();
    } finally {
      window.removeEventListener('error', preventExpectedViewerError);
      consoleError.mockRestore();
    }
  });

  it('retries a rejected viewer module without resetting page state', async () => {
    loadSourceViewerModuleMock
      .mockRejectedValueOnce(new Error('viewer chunk failed'))
      .mockResolvedValueOnce({
        default: () => <div>Loaded source viewer</div>,
      });
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const preventExpectedViewerError = (event: ErrorEvent) => event.preventDefault();
    window.addEventListener('error', preventExpectedViewerError);
    try {
      const { onOwnerUnmount } = renderBoundary();

      expect(await screen.findByText('PDF 檢視器載入失敗')).toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: '再試一次' }));

      await vi.waitFor(() => expect(loadSourceViewerModuleMock).toHaveBeenCalledTimes(2));
      expect(await screen.findByText('Loaded source viewer')).toBeInTheDocument();
      expect(screen.getByTestId('owner-state')).toBeInTheDocument();
      expect(onOwnerUnmount).not.toHaveBeenCalled();
    } finally {
      window.removeEventListener('error', preventExpectedViewerError);
      consoleError.mockRestore();
    }
  });
});
