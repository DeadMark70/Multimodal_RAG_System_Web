import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { SourceEvidence, SourceEvidencePayload } from '../types/evidence';
import { useEvidenceNavigation } from './useEvidenceNavigation';

const evidence: SourceEvidence = {
  docId: 'doc-1',
  filename: 'paper.pdf',
  page: 3,
  quote: 'Transformer uses self-attention.',
  bbox: null,
  provenanceStatus: 'full',
};

const payload: SourceEvidencePayload = {
  title: 'Transformer architecture',
  items: [evidence],
};

describe('useEvidenceNavigation', () => {
  it('resets its drawer and viewer state after closing', () => {
    const { result } = renderHook(() => useEvidenceNavigation());

    act(() => {
      result.current.open('Loading evidence', [], true);
    });
    expect(result.current.state).toMatchObject({
      isOpen: true,
      title: 'Loading evidence',
      items: [],
      isLoading: true,
      error: null,
      viewerEvidence: null,
    });

    act(() => {
      result.current.setPayload(payload);
    });
    expect(result.current.state).toMatchObject({
      isOpen: true,
      title: 'Transformer architecture',
      items: [evidence],
      isLoading: false,
      error: null,
    });

    act(() => {
      result.current.openViewer(evidence);
    });
    expect(result.current.state.viewerEvidence).toBe(evidence);

    act(() => {
      result.current.closeViewer();
    });
    expect(result.current.state.viewerEvidence).toBeNull();

    act(() => {
      result.current.close();
    });
    expect(result.current.state).toEqual({
      isOpen: false,
      title: '',
      items: [],
      isLoading: false,
      error: null,
      viewerEvidence: null,
    });
  });
});
