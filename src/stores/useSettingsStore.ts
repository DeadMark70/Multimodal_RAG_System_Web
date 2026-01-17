/**
 * useSettingsStore - Zustand 持久化設定 Store
 *
 * 管理所有 RAG 參數與使用者偏好，自動同步至 localStorage
 *
 * @remarks
 * - 遵循 Frontend Development Standards 的 Strict TypeScript 規範
 * - 所有設定在頁面重整後仍會保留
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

// ========== RAG 設定介面 ==========

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

  /** 🆕 啟用知識圖譜增強檢索 */
  enable_graph_rag: boolean;

  /** 🆕 圖譜搜尋模式 */
  graph_search_mode: 'local' | 'global' | 'hybrid' | 'auto';

  /** 🆕 啟用圖譜輔助規劃 (Deep Research) */
  enable_graph_planning: boolean;

  /** 🆕 啟用進階圖片查證 (Deep Visual Verification) */
  enable_deep_image_analysis: boolean;

  /** 研究子任務數量上限 (1-10) */
  max_subtasks: number;
}

// ========== Store State 介面 ==========

interface SettingsState {
  /** RAG 設定 */
  ragSettings: RagSettings;

  /** 主題模式 */
  theme: 'light' | 'dark' | 'system';

  /** 側邊欄展開狀態 */
  sidebarOpen: boolean;

  /** Actions */
  actions: {
    /** 更新單一 RAG 設定 */
    setRagSetting: <K extends keyof RagSettings>(key: K, value: RagSettings[K]) => void;

    /** 批量更新 RAG 設定 */
    setRagSettings: (settings: Partial<RagSettings>) => void;

    /** 重置 RAG 設定為預設值 */
    resetRagSettings: () => void;

    /** 切換主題 */
    setTheme: (theme: 'light' | 'dark' | 'system') => void;

    /** 切換側邊欄 */
    toggleSidebar: () => void;

    /** 設定側邊欄狀態 */
    setSidebarOpen: (open: boolean) => void;
  };
}

// ========== 預設值 ==========

const DEFAULT_RAG_SETTINGS: RagSettings = {
  enable_hyde: false,
  enable_multi_query: false,
  enable_reranking: true, // 預設開啟
  enable_evaluation: false,
  enable_graph_rag: false,
  graph_search_mode: 'auto',
  enable_graph_planning: false,
  enable_deep_image_analysis: false, // 預設關閉
  max_subtasks: 5,
};

// ========== Store 實作 ==========

/**
 * useSettingsStore - 持久化設定 Store
 *
 * @example
 * ```tsx
 * const { ragSettings, actions } = useSettingsStore();
 *
 * // 讀取設定
 * console.log(ragSettings.enable_hyde);
 *
 * // 更新單一設定
 * actions.setRagSetting('enable_hyde', true);
 *
 * // 批量更新
 * actions.setRagSettings({ enable_hyde: true, enable_multi_query: true });
 * ```
 */
export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      // Initial State
      ragSettings: DEFAULT_RAG_SETTINGS,
      theme: 'system',
      sidebarOpen: true,

      // Actions (不會被持久化)
      actions: {
        setRagSetting: (key, value) =>
          set((state) => ({
            ragSettings: { ...state.ragSettings, [key]: value },
          })),

        setRagSettings: (settings) =>
          set((state) => ({
            ragSettings: { ...state.ragSettings, ...settings },
          })),

        resetRagSettings: () =>
          set({ ragSettings: DEFAULT_RAG_SETTINGS }),

        setTheme: (theme) => set({ theme }),

        toggleSidebar: () =>
          set((state) => ({ sidebarOpen: !state.sidebarOpen })),

        setSidebarOpen: (open) => set({ sidebarOpen: open }),
      },
    }),
    {
      name: 'rag-settings-storage', // localStorage key
      storage: createJSONStorage(() => localStorage),
      // 只持久化 state，不持久化 actions
      partialize: (state) => ({
        ragSettings: state.ragSettings,
        theme: state.theme,
        sidebarOpen: state.sidebarOpen,
      }),
    }
  )
);

// ========== Selector Hooks (效能優化) ==========

/**
 * 只選取 RAG 設定 (避免不必要的重新渲染)
 */
export const useRagSettings = () => useSettingsStore((state) => state.ragSettings);

/**
 * 只選取 Actions
 */
export const useSettingsActions = () => useSettingsStore((state) => state.actions);

/**
 * 只選取主題
 */
export const useTheme = () => useSettingsStore((state) => state.theme);

export default useSettingsStore;
