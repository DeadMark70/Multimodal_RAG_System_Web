import { useState } from 'react';

import type { SourceEvidence, SourceEvidencePayload } from '../types/evidence';

export interface EvidenceNavigationState {
  isOpen: boolean;
  title: string;
  items: SourceEvidence[];
  isLoading: boolean;
  error: string | null;
  viewerEvidence: SourceEvidence | null;
}

const initialState: EvidenceNavigationState = {
  isOpen: false,
  title: '',
  items: [],
  isLoading: false,
  error: null,
  viewerEvidence: null,
};

export function useEvidenceNavigation() {
  const [state, setState] = useState(initialState);

  return {
    state,
    open: (title: string, items: SourceEvidence[] = [], isLoading = false) =>
      setState({ ...initialState, isOpen: true, title, items, isLoading }),
    setPayload: (payload: SourceEvidencePayload) =>
      setState((current) => ({
        ...current,
        title: payload.title,
        items: payload.items,
        isLoading: false,
        error: null,
      })),
    setError: (message: string) =>
      setState((current) => ({ ...current, isLoading: false, error: message })),
    close: () => setState(initialState),
    openViewer: (evidence: SourceEvidence) =>
      setState((current) => ({ ...current, viewerEvidence: evidence })),
    closeViewer: () =>
      setState((current) => ({ ...current, viewerEvidence: null })),
  };
}

export type EvidenceNavigationController = ReturnType<typeof useEvidenceNavigation>;
