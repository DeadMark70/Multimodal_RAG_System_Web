import { ChakraProvider } from '@chakra-ui/react';
import { fireEvent, render, screen } from '@testing-library/react';
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
});
