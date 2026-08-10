import { ChakraProvider } from '@chakra-ui/react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useRef, useState } from 'react';
import { describe, expect, it, vi } from 'vitest';

import type { EvidenceNavigationState } from '../../hooks/useEvidenceNavigation';
import type { SourceEvidence } from '../../types/evidence';
import theme from '../../theme';
import { EvidenceDrawer } from './EvidenceDrawer';

const verified: SourceEvidence = {
  docId: 'doc-1', filename: 'paper.pdf', page: 3,
  quote: 'Transformer uses self-attention.', bbox: null,
  provenanceStatus: 'full',
};
const sourceOnly: SourceEvidence = {
  docId: 'doc-2', filename: 'related.pdf', page: null,
  quote: null, bbox: null, provenanceStatus: 'source_only',
};

const openState: EvidenceNavigationState = {
  isOpen: true,
  title: '證據',
  items: [verified, sourceOnly],
  isLoading: false,
  error: null,
  viewerEvidence: null,
};

function renderDrawer(
  state: EvidenceNavigationState = openState,
  onClose = vi.fn(),
  onOpenSource = vi.fn(),
) {
  render(
    <ChakraProvider theme={theme}>
      <EvidenceDrawer state={state} onClose={onClose} onOpenSource={onOpenSource} />
    </ChakraProvider>,
  );

  return { onClose, onOpenSource };
}

describe('EvidenceDrawer', () => {
  it('renders verified evidence before related source-only documents', () => {
    renderDrawer();

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('paper.pdf')).toBeInTheDocument();
    expect(screen.getByText('第 3 頁')).toBeInTheDocument();
    expect(screen.getByText('Transformer uses self-attention.')).toBeInTheDocument();
    expect(screen.getByText('原文')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '相關來源文件' })).toBeInTheDocument();
    expect(screen.getByText('related.pdf')).toBeInTheDocument();
    expect(screen.getByText('僅確認文件關聯，沒有可驗證的原文片段')).toBeInTheDocument();
    expect(screen.queryAllByText('原文')).toHaveLength(1);
  });

  it('forwards the selected source evidence and closes on Escape', () => {
    const { onClose, onOpenSource } = renderDrawer();

    fireEvent.click(screen.getByRole('button', { name: '開啟原文' }));
    expect(onOpenSource).toHaveBeenCalledWith(verified);

    fireEvent.click(screen.getByRole('button', { name: '開啟文件' }));
    expect(onOpenSource).toHaveBeenCalledWith(sourceOnly);

    fireEvent.keyDown(screen.getByRole('dialog').parentElement!, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('keeps separate excerpts from one document independently actionable', () => {
    const secondExcerpt: SourceEvidence = {
      ...verified,
      page: 4,
      quote: 'A second excerpt from the same paper.',
    };
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    try {
      const { onOpenSource } = renderDrawer({
        ...openState,
        items: [verified, secondExcerpt],
      });

      const buttons = screen.getAllByRole('button', { name: '開啟原文' });
      fireEvent.click(buttons[0]);
      fireEvent.click(buttons[1]);

      expect(onOpenSource).toHaveBeenNthCalledWith(1, verified);
      expect(onOpenSource).toHaveBeenNthCalledWith(2, secondExcerpt);
      expect(consoleError.mock.calls.flat().join(' ')).not.toContain('unique "key" prop');
    } finally {
      consoleError.mockRestore();
    }
  });

  it('shows a supplied navigation page with neutral copy for source-only evidence', () => {
    renderDrawer({
      ...openState,
      items: [{ ...sourceOnly, page: 7 }],
    });

    expect(screen.getByText('第 7 頁')).toBeInTheDocument();
    expect(screen.getByText('僅確認文件關聯，沒有可驗證的原文片段')).toBeInTheDocument();
    expect(screen.queryByText('原文')).not.toBeInTheDocument();
    expect(screen.queryByText('已驗證')).not.toBeInTheDocument();
  });

  it('restores focus to the exact origin after close and Escape', async () => {
    function FocusHarness() {
      const [isOpen, setIsOpen] = useState(false);
      const triggerRef = useRef<HTMLButtonElement>(null);
      return (
        <>
          <button ref={triggerRef} type="button" onClick={() => setIsOpen(true)}>
            Citation origin
          </button>
          <EvidenceDrawer
            state={{ ...openState, isOpen }}
            onClose={() => setIsOpen(false)}
            onOpenSource={vi.fn()}
            finalFocusRef={triggerRef}
          />
        </>
      );
    }

    render(
      <ChakraProvider theme={theme}>
        <FocusHarness />
      </ChakraProvider>,
    );

    const trigger = screen.getByRole('button', { name: 'Citation origin' });
    fireEvent.click(trigger);
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    await waitFor(() => expect(document.activeElement).toBe(trigger));

    fireEvent.click(trigger);
    fireEvent.keyDown(screen.getByRole('dialog').parentElement!, { key: 'Escape' });
    await waitFor(() => expect(document.activeElement).toBe(trigger));
  });
});
