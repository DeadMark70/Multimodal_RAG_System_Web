import { beforeEach, describe, expect, it } from 'vitest';

import { useSettingsStore } from './useSettingsStore';

describe('useSettingsStore', () => {
  beforeEach(() => {
    localStorage.clear();
    useSettingsStore.setState({
      ragSettings: {
        enable_hyde: false,
        enable_multi_query: false,
        enable_reranking: true,
        enable_evaluation: false,
        enable_graph_rag: true,
        graph_search_mode: 'generic',
        enable_graph_planning: false,
        enable_deep_image_analysis: false,
        max_subtasks: 5,
      },
      theme: 'system',
      sidebarOpen: true,
      actions: useSettingsStore.getState().actions,
    });
  });

  it('defaults GraphRAG to enabled generic mode', () => {
    const { ragSettings } = useSettingsStore.getState();

    expect(ragSettings.enable_graph_rag).toBe(true);
    expect(ragSettings.graph_search_mode).toBe('generic');
  });

  it('reset restores generic mode defaults', () => {
    const { actions } = useSettingsStore.getState();
    actions.setRagSettings({
      enable_graph_rag: false,
      graph_search_mode: 'local',
    });

    actions.resetRagSettings();

    const { ragSettings } = useSettingsStore.getState();
    expect(ragSettings.enable_graph_rag).toBe(true);
    expect(ragSettings.graph_search_mode).toBe('generic');
  });
});
