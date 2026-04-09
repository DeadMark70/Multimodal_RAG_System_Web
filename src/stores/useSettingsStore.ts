/**
 * useSettingsStore - Zustand 持久化設定 Store
 *
 * 管理 RAG 參數、聊天 mode preset 與使用者偏好，自動同步至 localStorage。
 */

import { useMemo } from 'react';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

import type { ConversationType } from '../types/conversation';

/**
 * RAG 檢索策略設定
 */
export interface RagSettings {
  /** 假設性文件增強檢索 (Hypothetical Document Embeddings) */
  enable_hyde: boolean;

  /** 多重查詢融合檢索 */
  enable_multi_query: boolean;

  /** Cross-Encoder 精準重排序 */
  enable_reranking: boolean;

  /** Self-RAG 評估模式 (增加延遲但提供責任 AI 指標) */
  enable_evaluation: boolean;

  /** 啟用知識圖譜增強檢索 */
  enable_graph_rag: boolean;

  /** 圖譜搜尋模式 */
  graph_search_mode: 'local' | 'global' | 'hybrid' | 'auto' | 'generic';

  /** 啟用圖譜輔助規劃 (Deep Research) */
  enable_graph_planning: boolean;

  /** 啟用進階圖片查證 (Deep Visual Verification) */
  enable_deep_image_analysis: boolean;

  /** 研究子任務數量上限 (1-10) */
  max_subtasks: number;
}

export type OfficialChatMode = 'native' | 'advanced' | 'graph' | 'agentic' | 'agentic_benchmark';
export type ChatModeBase = OfficialChatMode;

export interface CustomChatPreset {
  id: string;
  name: string;
  baseMode: ChatModeBase;
  config: RagSettings;
}

export interface ChatModePreset {
  id: string;
  name: string;
  baseMode: ChatModeBase;
  description: string;
  config: RagSettings;
  isOfficial: boolean;
}

interface SettingsState {
  /** 目前作用中的 RAG 設定 */
  ragSettings: RagSettings;

  /** 當前聊天 mode ID（官方或 custom preset） */
  selectedChatModeId: string;

  /** 使用者自訂 preset */
  customChatPresets: CustomChatPreset[];

  /** 主題模式 */
  theme: 'light' | 'dark' | 'system';

  /** 側邊欄展開狀態 */
  sidebarOpen: boolean;

  actions: {
    setRagSetting: <K extends keyof RagSettings>(key: K, value: RagSettings[K]) => void;
    setRagSettings: (settings: Partial<RagSettings>) => void;
    resetRagSettings: () => void;
    setChatMode: (modeId: string) => void;
    restoreConversationMode: (
      metadata?: Record<string, unknown>,
      conversationType?: ConversationType
    ) => void;
    saveCurrentAsCustomPreset: (name: string, baseMode?: ChatModeBase) => CustomChatPreset;
    updateCustomPreset: (id: string, updates: Partial<Pick<CustomChatPreset, 'name' | 'config' | 'baseMode'>>) => void;
    deleteCustomPreset: (id: string) => void;
    resetCurrentModeToPreset: () => void;
    setTheme: (theme: 'light' | 'dark' | 'system') => void;
    toggleSidebar: () => void;
    setSidebarOpen: (open: boolean) => void;
  };
}

const OFFICIAL_PRESET_ORDER: OfficialChatMode[] = ['native', 'advanced', 'graph', 'agentic', 'agentic_benchmark'];
const DEFAULT_CHAT_MODE_ID: OfficialChatMode = 'graph';

function clampMaxSubtasks(value: number): number {
  if (!Number.isFinite(value)) {
    return 5;
  }
  return Math.min(10, Math.max(1, Math.round(value)));
}

function normalizeRagSettings(
  settings: Partial<RagSettings>,
  base?: RagSettings,
  preferredMode?: 'hyde' | 'multi_query' | 'none'
): RagSettings {
  const merged: RagSettings = {
    enable_hyde: false,
    enable_multi_query: false,
    enable_reranking: true,
    enable_evaluation: false,
    enable_graph_rag: true,
    graph_search_mode: 'generic',
    enable_graph_planning: false,
    enable_deep_image_analysis: false,
    max_subtasks: 5,
    ...base,
    ...settings,
  };

  if (preferredMode === 'hyde') {
    merged.enable_hyde = true;
    merged.enable_multi_query = false;
  } else if (preferredMode === 'multi_query') {
    merged.enable_hyde = false;
    merged.enable_multi_query = true;
  } else if (preferredMode === 'none') {
    merged.enable_hyde = false;
    merged.enable_multi_query = false;
  } else if (merged.enable_hyde && merged.enable_multi_query) {
    merged.enable_multi_query = false;
  }

  merged.max_subtasks = clampMaxSubtasks(merged.max_subtasks);
  if (!merged.enable_graph_rag) {
    merged.graph_search_mode = 'generic';
    merged.enable_graph_planning = false;
  }

  return merged;
}

function createPresetConfig(baseMode: OfficialChatMode): RagSettings {
  switch (baseMode) {
    case 'native':
      return normalizeRagSettings(
        {
          enable_hyde: false,
          enable_multi_query: false,
          enable_reranking: false,
          enable_evaluation: false,
          enable_graph_rag: false,
          graph_search_mode: 'generic',
          enable_graph_planning: false,
          enable_deep_image_analysis: false,
          max_subtasks: 5,
        },
        undefined,
        'none'
      );
    case 'advanced':
      return normalizeRagSettings(
        {
          enable_hyde: false,
          enable_multi_query: true,
          enable_reranking: true,
          enable_evaluation: false,
          enable_graph_rag: false,
          graph_search_mode: 'generic',
          enable_graph_planning: false,
          enable_deep_image_analysis: false,
          max_subtasks: 5,
        },
        undefined,
        'multi_query'
      );
    case 'graph':
      return normalizeRagSettings(
        {
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
        undefined,
        'multi_query'
      );
    case 'agentic':
      return normalizeRagSettings(
        {
          enable_hyde: false,
          enable_multi_query: true,
          enable_reranking: true,
          enable_evaluation: false,
          enable_graph_rag: true,
          graph_search_mode: 'generic',
          enable_graph_planning: true,
          enable_deep_image_analysis: true,
          max_subtasks: 5,
        },
        undefined,
        'multi_query'
      );
    case 'agentic_benchmark':
      return normalizeRagSettings(
        {
          enable_hyde: false,
          enable_multi_query: true,
          enable_reranking: true,
          enable_evaluation: false,
          enable_graph_rag: true,
          graph_search_mode: 'generic',
          enable_graph_planning: false,
          enable_deep_image_analysis: true,
          max_subtasks: 5,
        },
        undefined,
        'multi_query'
      );
  }
}

export const OFFICIAL_CHAT_PRESETS: Record<OfficialChatMode, ChatModePreset> = {
  native: {
    id: 'native',
    name: 'Native',
    baseMode: 'native',
    description: '純 RAG 基線，不加 query expansion、rerank、GraphRAG。',
    config: createPresetConfig('native'),
    isOfficial: true,
  },
  advanced: {
    id: 'advanced',
    name: 'Advanced',
    baseMode: 'advanced',
    description: '加入 query expansion 與 rerank，預設使用 Multi-Query。',
    config: createPresetConfig('advanced'),
    isOfficial: true,
  },
  graph: {
    id: 'graph',
    name: 'Graph RAG',
    baseMode: 'graph',
    description: '包含 Advanced 能力，再加上 Generic GraphRAG。',
    config: createPresetConfig('graph'),
    isOfficial: true,
  },
  agentic: {
    id: 'agentic',
    name: 'Deep Research',
    baseMode: 'agentic',
    description: '可編輯任務計畫、drill-down 與視覺查證的深度研究模式。',
    config: createPresetConfig('agentic'),
    isOfficial: true,
  },
  agentic_benchmark: {
    id: 'agentic_benchmark',
    name: 'Agentic RAG (Benchmark)',
    baseMode: 'agentic_benchmark',
    description: '評估基準 agentic 流程，含任務追蹤、工具調用與 trace。',
    config: createPresetConfig('agentic_benchmark'),
    isOfficial: true,
  },
};

export const DEFAULT_RAG_SETTINGS = OFFICIAL_CHAT_PRESETS[DEFAULT_CHAT_MODE_ID].config;

function buildCustomPreset(
  preset: CustomChatPreset
): ChatModePreset {
  return {
    id: preset.id,
    name: preset.name,
    baseMode: preset.baseMode,
    description: `${OFFICIAL_CHAT_PRESETS[preset.baseMode].name} 的自訂 preset`,
    config: normalizeRagSettings(preset.config),
    isOfficial: false,
  };
}

export function getAllChatPresets(customPresets: CustomChatPreset[]): ChatModePreset[] {
  return [
    ...OFFICIAL_PRESET_ORDER.map((mode) => OFFICIAL_CHAT_PRESETS[mode]),
    ...customPresets.map(buildCustomPreset),
  ];
}

function isOfficialChatMode(value: string): value is OfficialChatMode {
  return value in OFFICIAL_CHAT_PRESETS;
}

function resolvePresetFromState(
  selectedChatModeId: string,
  customChatPresets: CustomChatPreset[]
): ChatModePreset {
  const official = OFFICIAL_CHAT_PRESETS[selectedChatModeId as OfficialChatMode];
  if (official) {
    return official;
  }

  const custom = customChatPresets.find((preset) => preset.id === selectedChatModeId);
  if (custom) {
    return buildCustomPreset(custom);
  }

  return OFFICIAL_CHAT_PRESETS[DEFAULT_CHAT_MODE_ID];
}

function isKnownPresetId(
  presetId: string,
  customChatPresets: CustomChatPreset[]
): boolean {
  return Boolean(
    OFFICIAL_CHAT_PRESETS[presetId as OfficialChatMode] ||
      customChatPresets.some((preset) => preset.id === presetId)
  );
}

function detectPreferredQueryMode(settings: RagSettings): 'hyde' | 'multi_query' | 'none' | undefined {
  if (settings.enable_hyde) {
    return 'hyde';
  }
  if (settings.enable_multi_query) {
    return 'multi_query';
  }
  return 'none';
}

function buildCustomPresetId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `custom-${crypto.randomUUID()}`;
  }

  return `custom-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function normalizeCustomPresets(presets: CustomChatPreset[] | undefined): CustomChatPreset[] {
  if (!Array.isArray(presets)) {
    return [];
  }

  return presets.flatMap((preset, index) => {
    if (!isPlainObject(preset)) {
      return [];
    }

    const baseModeCandidate = typeof preset.baseMode === 'string' ? preset.baseMode : 'graph';
    const configCandidate = isPlainObject(preset.config)
      ? (preset.config as Partial<RagSettings>)
      : {};

    return [{
      id: typeof preset.id === 'string' && preset.id ? preset.id : `custom-${index}`,
      name:
        typeof preset.name === 'string' && preset.name.trim()
          ? preset.name.trim()
          : `自訂模式 ${index + 1}`,
      baseMode: isOfficialChatMode(baseModeCandidate)
        ? OFFICIAL_CHAT_PRESETS[baseModeCandidate].baseMode
        : 'graph',
      config: normalizeRagSettings(configCandidate),
    }];
  });
}

function extractConversationSnapshot(
  metadata?: Record<string, unknown>
): { modeId?: string; snapshot?: RagSettings } {
  if (!metadata) {
    return {};
  }

  const modeId = typeof metadata.mode_preset === 'string' ? metadata.mode_preset : undefined;
  const snapshotCandidate = metadata.mode_config_snapshot;
  const snapshot =
    snapshotCandidate && typeof snapshotCandidate === 'object'
      ? normalizeRagSettings(snapshotCandidate as Partial<RagSettings>)
      : undefined;

  return { modeId, snapshot };
}

function resolveResearchModeFromMetadata(
  metadata?: Record<string, unknown>
): OfficialChatMode | undefined {
  if (!metadata) {
    return undefined;
  }

  const engine =
    typeof metadata.research_engine === 'string'
      ? metadata.research_engine
      : typeof metadata.engine === 'string'
        ? metadata.engine
        : undefined;

  if (engine === 'agentic_benchmark') {
    return 'agentic_benchmark';
  }

  if (engine === 'deep_research' || engine === 'agentic') {
    return 'agentic';
  }

  return undefined;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      ragSettings: DEFAULT_RAG_SETTINGS,
      selectedChatModeId: DEFAULT_CHAT_MODE_ID,
      customChatPresets: [],
      theme: 'system',
      sidebarOpen: true,

      actions: {
        setRagSetting: (key, value) =>
          set((state) => ({
            ragSettings: normalizeRagSettings(
              { ...state.ragSettings, [key]: value },
              state.ragSettings,
              key === 'enable_hyde' && value
                ? 'hyde'
                : key === 'enable_multi_query' && value
                  ? 'multi_query'
                  : key === 'enable_hyde' && value === false && !state.ragSettings.enable_multi_query
                    ? 'none'
                    : key === 'enable_multi_query' && value === false && !state.ragSettings.enable_hyde
                      ? 'none'
                      : undefined
            ),
          })),

        setRagSettings: (settings) =>
          set((state) => ({
            ragSettings: normalizeRagSettings(
              { ...state.ragSettings, ...settings },
              state.ragSettings,
              settings.enable_hyde === true
                ? 'hyde'
                : settings.enable_multi_query === true
                  ? 'multi_query'
                  : settings.enable_hyde === false && settings.enable_multi_query === false
                    ? 'none'
                    : undefined
            ),
          })),

        resetRagSettings: () =>
          set(() => {
            const preset = resolvePresetFromState(
              get().selectedChatModeId,
              get().customChatPresets
            );
            return {
              ragSettings: normalizeRagSettings(preset.config),
            };
          }),

        setChatMode: (modeId) =>
          set((state) => {
            const preset = resolvePresetFromState(modeId, state.customChatPresets);
            return {
              selectedChatModeId: preset.id,
              ragSettings: normalizeRagSettings(preset.config),
            };
          }),

        restoreConversationMode: (metadata, conversationType) =>
          set((state) => {
            const { modeId, snapshot } = extractConversationSnapshot(metadata);
            const researchMode = resolveResearchModeFromMetadata(metadata);
            const fallbackMode: OfficialChatMode =
              conversationType === 'research' ? researchMode ?? 'agentic' : 'graph';
            const resolvedModeId =
              modeId && isKnownPresetId(modeId, state.customChatPresets)
                ? modeId
                : fallbackMode;
            const resolvedPreset = resolvePresetFromState(
              resolvedModeId,
              state.customChatPresets
            );

            return {
              selectedChatModeId: resolvedModeId,
              ragSettings: snapshot
                ? normalizeRagSettings(snapshot)
                : normalizeRagSettings(resolvedPreset.config),
            };
          }),

        saveCurrentAsCustomPreset: (name, baseMode) => {
          const trimmed = name.trim();
          const state = get();
          const activePreset = resolvePresetFromState(state.selectedChatModeId, state.customChatPresets);
          const customPreset: CustomChatPreset = {
            id: buildCustomPresetId(),
            name: trimmed || `${activePreset.name} Custom`,
            baseMode: baseMode ?? activePreset.baseMode,
            config: normalizeRagSettings(state.ragSettings),
          };

          set((current) => ({
            customChatPresets: [...current.customChatPresets, customPreset],
            selectedChatModeId: customPreset.id,
          }));

          return customPreset;
        },

        updateCustomPreset: (id, updates) =>
          set((state) => ({
            customChatPresets: state.customChatPresets.map((preset) => {
              if (preset.id !== id) {
                return preset;
              }

              return {
                ...preset,
                name: updates.name?.trim() || preset.name,
                baseMode: updates.baseMode ?? preset.baseMode,
                config: updates.config
                  ? normalizeRagSettings(
                      updates.config,
                      preset.config,
                      detectPreferredQueryMode(normalizeRagSettings(updates.config, preset.config))
                    )
                  : preset.config,
              };
            }),
          })),

        deleteCustomPreset: (id) =>
          set((state) => {
            const nextPresets = state.customChatPresets.filter((preset) => preset.id !== id);
            const nextSelected =
              state.selectedChatModeId === id ? DEFAULT_CHAT_MODE_ID : state.selectedChatModeId;
            const nextPreset = resolvePresetFromState(nextSelected, nextPresets);

            return {
              customChatPresets: nextPresets,
              selectedChatModeId: nextSelected,
              ragSettings:
                state.selectedChatModeId === id
                  ? normalizeRagSettings(nextPreset.config)
                  : state.ragSettings,
            };
          }),

        resetCurrentModeToPreset: () =>
          set((state) => {
            const preset = resolvePresetFromState(state.selectedChatModeId, state.customChatPresets);
            return {
              ragSettings: normalizeRagSettings(preset.config),
            };
          }),

        setTheme: (theme) => set({ theme }),

        toggleSidebar: () =>
          set((state) => ({ sidebarOpen: !state.sidebarOpen })),

        setSidebarOpen: (open) => set({ sidebarOpen: open }),
      },
    }),
    {
      name: 'rag-settings-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        ragSettings: state.ragSettings,
        selectedChatModeId: state.selectedChatModeId,
        customChatPresets: state.customChatPresets,
        theme: state.theme,
        sidebarOpen: state.sidebarOpen,
      }),
      merge: (persistedState, currentState) => {
        const typedState = persistedState as Partial<SettingsState> | undefined;
        const customChatPresets = normalizeCustomPresets(typedState?.customChatPresets);
        const requestedChatModeId =
          typeof typedState?.selectedChatModeId === 'string' && typedState.selectedChatModeId
            ? typedState.selectedChatModeId
            : DEFAULT_CHAT_MODE_ID;
        const selectedChatModeId = isKnownPresetId(requestedChatModeId, customChatPresets)
          ? requestedChatModeId
          : DEFAULT_CHAT_MODE_ID;
        const preset = resolvePresetFromState(selectedChatModeId, customChatPresets);

        return {
          ...currentState,
          ...typedState,
          customChatPresets,
          selectedChatModeId,
          ragSettings: normalizeRagSettings(
            typedState?.ragSettings ?? preset.config
          ),
        };
      },
    }
  )
);

export const useRagSettings = () => useSettingsStore((state) => state.ragSettings);

export const useSettingsActions = () => useSettingsStore((state) => state.actions);

export const useTheme = () => useSettingsStore((state) => state.theme);

export const useSelectedChatModeId = () =>
  useSettingsStore((state) => state.selectedChatModeId);

export const useCustomChatPresets = () =>
  useSettingsStore((state) => state.customChatPresets);

export const useChatPresetList = () => {
  const customChatPresets = useCustomChatPresets();
  return useMemo(() => getAllChatPresets(customChatPresets), [customChatPresets]);
};

export const useActiveChatPreset = () => {
  const selectedChatModeId = useSelectedChatModeId();
  const customChatPresets = useCustomChatPresets();

  return useMemo(
    () => resolvePresetFromState(selectedChatModeId, customChatPresets),
    [selectedChatModeId, customChatPresets]
  );
};

export function getConversationTypeForMode(baseMode: ChatModeBase): ConversationType {
  return baseMode === 'agentic' || baseMode === 'agentic_benchmark' ? 'research' : 'chat';
}

export function areRagSettingsEqual(left: RagSettings, right: RagSettings): boolean {
  return (
    left.enable_hyde === right.enable_hyde &&
    left.enable_multi_query === right.enable_multi_query &&
    left.enable_reranking === right.enable_reranking &&
    left.enable_evaluation === right.enable_evaluation &&
    left.enable_graph_rag === right.enable_graph_rag &&
    left.graph_search_mode === right.graph_search_mode &&
    left.enable_graph_planning === right.enable_graph_planning &&
    left.enable_deep_image_analysis === right.enable_deep_image_analysis &&
    left.max_subtasks === right.max_subtasks
  );
}

export function getCurrentSettingsSnapshot(): Pick<SettingsState, 'ragSettings' | 'selectedChatModeId'> {
  const state = useSettingsStore.getState();
  return {
    ragSettings: state.ragSettings,
    selectedChatModeId: state.selectedChatModeId,
  };
}

export const useEnableHyde = () => useSettingsStore((state) => state.ragSettings.enable_hyde);

export const useEnableMultiQuery = () =>
  useSettingsStore((state) => state.ragSettings.enable_multi_query);

export const useEnableReranking = () =>
  useSettingsStore((state) => state.ragSettings.enable_reranking);

export const useEnableEvaluation = () =>
  useSettingsStore((state) => state.ragSettings.enable_evaluation);

export const useEnableGraphRag = () =>
  useSettingsStore((state) => state.ragSettings.enable_graph_rag);

export const useGraphSearchMode = () =>
  useSettingsStore((state) => state.ragSettings.graph_search_mode);

export const useEnableGraphPlanning = () =>
  useSettingsStore((state) => state.ragSettings.enable_graph_planning);

export const useEnableDeepImageAnalysis = () =>
  useSettingsStore((state) => state.ragSettings.enable_deep_image_analysis);

export const useMaxSubtasks = () => useSettingsStore((state) => state.ragSettings.max_subtasks);

export const useRagSettingsSnapshot = () => {
  const enableHyde = useEnableHyde();
  const enableMultiQuery = useEnableMultiQuery();
  const enableReranking = useEnableReranking();
  const enableEvaluation = useEnableEvaluation();
  const enableGraphRag = useEnableGraphRag();
  const graphSearchMode = useGraphSearchMode();
  const enableGraphPlanning = useEnableGraphPlanning();
  const enableDeepImageAnalysis = useEnableDeepImageAnalysis();
  const maxSubtasks = useMaxSubtasks();

  return useMemo(
    () => ({
      enable_hyde: enableHyde,
      enable_multi_query: enableMultiQuery,
      enable_reranking: enableReranking,
      enable_evaluation: enableEvaluation,
      enable_graph_rag: enableGraphRag,
      graph_search_mode: graphSearchMode,
      enable_graph_planning: enableGraphPlanning,
      enable_deep_image_analysis: enableDeepImageAnalysis,
      max_subtasks: maxSubtasks,
    }),
    [
      enableDeepImageAnalysis,
      enableEvaluation,
      enableGraphPlanning,
      enableGraphRag,
      enableHyde,
      enableMultiQuery,
      enableReranking,
      graphSearchMode,
      maxSubtasks,
    ]
  );
};

export const useChatRuntimeSettings = () => {
  const enableEvaluation = useEnableEvaluation();
  const enableHyde = useEnableHyde();
  const enableMultiQuery = useEnableMultiQuery();
  const enableReranking = useEnableReranking();
  const enableGraphRag = useEnableGraphRag();
  const graphSearchMode = useGraphSearchMode();

  return useMemo(
    () => ({
      enableEvaluation,
      enableHyde,
      enableMultiQuery,
      enableReranking,
      enableGraphRag,
      graphSearchMode,
    }),
    [
      enableEvaluation,
      enableGraphRag,
      enableHyde,
      enableMultiQuery,
      enableReranking,
      graphSearchMode,
    ]
  );
};

export const useDeepResearchRuntimeSettings = () => {
  const enableGraphPlanning = useEnableGraphPlanning();
  const enableReranking = useEnableReranking();
  const enableDeepImageAnalysis = useEnableDeepImageAnalysis();

  return useMemo(
    () => ({
      enableGraphPlanning,
      enableReranking,
      enableDeepImageAnalysis,
    }),
    [enableDeepImageAnalysis, enableGraphPlanning, enableReranking]
  );
};

export const useBenchmarkRuntimeSettings = () => {
  const enableReranking = useEnableReranking();
  const enableDeepImageAnalysis = useEnableDeepImageAnalysis();

  return useMemo(
    () => ({
      enableReranking,
      enableDeepImageAnalysis,
    }),
    [enableDeepImageAnalysis, enableReranking]
  );
};

export default useSettingsStore;
