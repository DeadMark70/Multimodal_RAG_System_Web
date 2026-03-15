import { beforeEach, describe, expect, it } from 'vitest';

import { useSettingsStore } from './useSettingsStore';

describe('useSettingsStore', () => {
  beforeEach(() => {
    localStorage.clear();
    useSettingsStore.setState({
      ragSettings: {
        enable_hyde: false,
        enable_multi_query: true,
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

  it('defaults to Multi-Query with GraphRAG generic mode enabled', () => {
    const { ragSettings } = useSettingsStore.getState();

    expect(ragSettings.enable_hyde).toBe(false);
    expect(ragSettings.enable_multi_query).toBe(true);
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
    expect(ragSettings.enable_hyde).toBe(false);
    expect(ragSettings.enable_multi_query).toBe(true);
  });

  it('keeps HyDE and Multi-Query mutually exclusive for single-setting updates', () => {
    const { actions } = useSettingsStore.getState();

    actions.setRagSetting('enable_hyde', true);
    let { ragSettings } = useSettingsStore.getState();
    expect(ragSettings.enable_hyde).toBe(true);
    expect(ragSettings.enable_multi_query).toBe(false);

    actions.setRagSetting('enable_multi_query', true);
    ragSettings = useSettingsStore.getState().ragSettings;
    expect(ragSettings.enable_hyde).toBe(false);
    expect(ragSettings.enable_multi_query).toBe(true);
  });

  it('normalizes invalid bulk settings back to a single active query mode', () => {
    const { actions } = useSettingsStore.getState();

    actions.setRagSettings({
      enable_hyde: true,
      enable_multi_query: true,
    });

    let { ragSettings } = useSettingsStore.getState();
    expect(ragSettings.enable_hyde).toBe(true);
    expect(ragSettings.enable_multi_query).toBe(false);

    actions.setRagSettings({
      enable_hyde: false,
      enable_multi_query: false,
    });

    ragSettings = useSettingsStore.getState().ragSettings;
    expect(ragSettings.enable_hyde).toBe(false);
    expect(ragSettings.enable_multi_query).toBe(true);
  });
});
