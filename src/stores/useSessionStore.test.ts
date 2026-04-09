import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import {
  useCurrentChatId,
  useCurrentPdfDocId,
  useCurrentPdfPage,
  useIsResearchMode,
  usePdfState,
  useResearchState,
  useSessionStore,
  useSubTasks,
} from './useSessionStore';

function resetSessionStore(): void {
  const actions = useSessionStore.getState().actions;
  useSessionStore.setState({
    selectedNodeId: null,
    graphCameraPosition: null,
    currentPdfPage: 1,
    currentPdfDocId: null,
    currentChatId: null,
    isResearchMode: false,
    subTasks: [],
    actions,
  });
}

describe('useSessionStore selectors', () => {
  beforeEach(() => {
    resetSessionStore();
  });

  it('keeps usePdfState stable when unrelated session state changes', () => {
    const { result } = renderHook(() => usePdfState());
    const firstSnapshot = result.current;

    act(() => {
      useSessionStore.getState().actions.setSelectedNodeId('node-1');
    });

    expect(result.current).toBe(firstSnapshot);

    act(() => {
      useSessionStore.getState().actions.setCurrentPdfPage(3);
    });

    expect(result.current).not.toBe(firstSnapshot);
    expect(result.current).toEqual({ page: 3, docId: null });
  });

  it('keeps useResearchState stable when unrelated session state changes', () => {
    const { result } = renderHook(() => useResearchState());
    const firstSnapshot = result.current;

    act(() => {
      useSessionStore.getState().actions.setCurrentChatId('chat-1');
    });

    expect(result.current).toBe(firstSnapshot);

    act(() => {
      useSessionStore.getState().actions.setResearchMode(true);
    });

    expect(result.current).not.toBe(firstSnapshot);
    expect(result.current).toEqual({ isResearchMode: true, subTasks: [] });
  });

  it('returns primitive selector values without subscribing to the full store', () => {
    act(() => {
      useSessionStore.getState().actions.setCurrentChatId('chat-42');
      useSessionStore.getState().actions.setCurrentPdfPage(9);
      useSessionStore.getState().actions.setCurrentPdfDocId('doc-7');
      useSessionStore.getState().actions.setResearchMode(true);
      useSessionStore.getState().actions.setSubTasks([
        { id: 1, question: 'Q1', status: 'loading' },
      ]);
    });

    const currentChatIdHook = renderHook(() => useCurrentChatId());
    const currentPdfPageHook = renderHook(() => useCurrentPdfPage());
    const currentPdfDocIdHook = renderHook(() => useCurrentPdfDocId());
    const isResearchModeHook = renderHook(() => useIsResearchMode());
    const subTasksHook = renderHook(() => useSubTasks());

    expect(currentChatIdHook.result.current).toBe('chat-42');
    expect(currentPdfPageHook.result.current).toBe(9);
    expect(currentPdfDocIdHook.result.current).toBe('doc-7');
    expect(isResearchModeHook.result.current).toBe(true);
    expect(subTasksHook.result.current).toEqual([
      { id: 1, question: 'Q1', status: 'loading' },
    ]);
  });
});
