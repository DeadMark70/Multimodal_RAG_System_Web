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
      selectedChatModeId: 'graph',
      customChatPresets: [],
      theme: 'system',
      sidebarOpen: true,
      actions: useSettingsStore.getState().actions,
    });
  });

  it('defaults to graph preset with generic mode enabled', () => {
    const state = useSettingsStore.getState();

    expect(state.selectedChatModeId).toBe('graph');
    expect(state.ragSettings.enable_multi_query).toBe(true);
    expect(state.ragSettings.enable_graph_rag).toBe(true);
    expect(state.ragSettings.graph_search_mode).toBe('generic');
  });

  it('switches to native preset with no query expansion', () => {
    const { actions } = useSettingsStore.getState();

    actions.setChatMode('native');

    const state = useSettingsStore.getState();
    expect(state.selectedChatModeId).toBe('native');
    expect(state.ragSettings.enable_hyde).toBe(false);
    expect(state.ragSettings.enable_multi_query).toBe(false);
    expect(state.ragSettings.enable_reranking).toBe(false);
    expect(state.ragSettings.enable_graph_rag).toBe(false);
  });

  it('keeps HyDE and Multi-Query mutually exclusive but allows both to be off', () => {
    const { actions } = useSettingsStore.getState();

    actions.setRagSetting('enable_hyde', true);
    let ragSettings = useSettingsStore.getState().ragSettings;
    expect(ragSettings.enable_hyde).toBe(true);
    expect(ragSettings.enable_multi_query).toBe(false);

    actions.setRagSetting('enable_multi_query', true);
    ragSettings = useSettingsStore.getState().ragSettings;
    expect(ragSettings.enable_hyde).toBe(false);
    expect(ragSettings.enable_multi_query).toBe(true);

    actions.setRagSettings({
      enable_hyde: false,
      enable_multi_query: false,
    });
    ragSettings = useSettingsStore.getState().ragSettings;
    expect(ragSettings.enable_hyde).toBe(false);
    expect(ragSettings.enable_multi_query).toBe(false);
  });

  it('stores and selects custom presets', () => {
    const { actions } = useSettingsStore.getState();
    actions.setRagSettings({
      enable_hyde: true,
      enable_multi_query: false,
      enable_graph_rag: false,
    });

    const preset = actions.saveCurrentAsCustomPreset('我的模式');
    const state = useSettingsStore.getState();

    expect(state.customChatPresets).toHaveLength(1);
    expect(state.selectedChatModeId).toBe(preset.id);
    expect(state.customChatPresets[0]?.name).toBe('我的模式');
    expect(state.customChatPresets[0]?.config.enable_hyde).toBe(true);
  });

  it('restores legacy research conversations as agentic mode', () => {
    const { actions } = useSettingsStore.getState();

    actions.restoreConversationMode(undefined, 'research');

    const state = useSettingsStore.getState();
    expect(state.selectedChatModeId).toBe('agentic');
    expect(state.ragSettings.enable_graph_rag).toBe(true);
    expect(state.ragSettings.enable_deep_image_analysis).toBe(true);
  });
});
