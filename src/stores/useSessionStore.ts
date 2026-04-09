/**
 * useSessionStore - Zustand 暫態 Session Store
 *
 * 管理當前互動狀態，頁面重整後重置
 *
 * @remarks
 * - 用於 UI 暫態：選中節點、相機位置、當前 PDF 頁碼等
 * - 不使用 persist，重新整理後自動重置
 */

import { useMemo } from 'react';
import { create } from 'zustand';

// ========== 介面定義 ==========

/**
 * 圖譜相機位置 (用於 react-force-graph-2d)
 */
export interface GraphCameraPosition {
  x: number;
  y: number;
  k: number; // zoom level
}

/**
 * 深度研究子任務狀態
 */
export interface SubTaskState {
  id: number;
  question: string;
  status: 'pending' | 'loading' | 'success' | 'error';
  answer?: string;
}

/**
 * Session State 介面
 */
interface SessionState {
  // ========== Graph 互動 ==========
  /** 當前點擊的實體節點 ID */
  selectedNodeId: string | null;

  /** 圖譜相機位置 */
  graphCameraPosition: GraphCameraPosition | null;

  // ========== PDF 閱讀器 ==========
  /** 當前 PDF 頁碼 (1-indexed) */
  currentPdfPage: number;

  /** 當前開啟的 PDF 文件 ID */
  currentPdfDocId: string | null;

  // ========== 對話相關 ==========
  /** 當前對話 ID */
  currentChatId: string | null;

  // ========== 深度研究 ==========
  /** 研究模式是否啟用 */
  isResearchMode: boolean;

  /** 深度研究子任務狀態列表 */
  subTasks: SubTaskState[];

  // ========== Actions ==========
  actions: {
    // Graph
    setSelectedNodeId: (id: string | null) => void;
    setGraphCameraPosition: (pos: GraphCameraPosition | null) => void;

    // PDF
    setCurrentPdfPage: (page: number) => void;
    setCurrentPdfDocId: (docId: string | null) => void;

    // Chat
    setCurrentChatId: (chatId: string | null) => void;

    // Research
    setResearchMode: (enabled: boolean) => void;
    setSubTasks: (tasks: SubTaskState[]) => void;
    updateSubTaskStatus: (id: number, status: SubTaskState['status'], answer?: string) => void;

    // Reset
    resetSession: () => void;
  };
}

// ========== 初始狀態 ==========

const INITIAL_STATE = {
  selectedNodeId: null,
  graphCameraPosition: null,
  currentPdfPage: 1,
  currentPdfDocId: null,
  currentChatId: null,
  isResearchMode: false,
  subTasks: [],
};

// ========== Store 實作 ==========

/**
 * useSessionStore - 暫態 Session Store
 *
 * @example
 * ```tsx
 * const { selectedNodeId, actions } = useSessionStore();
 *
 * // 讀取選中節點
 * console.log(selectedNodeId);
 *
 * // 設定選中節點
 * actions.setSelectedNodeId('node-123');
 *
 * // 更新研究子任務狀態
 * actions.updateSubTaskStatus(1, 'success', 'Answer content...');
 * ```
 */
export const useSessionStore = create<SessionState>()((set) => ({
  // Initial State
  ...INITIAL_STATE,

  // Actions
  actions: {
    // Graph
    setSelectedNodeId: (id) => set({ selectedNodeId: id }),
    setGraphCameraPosition: (pos) => set({ graphCameraPosition: pos }),

    // PDF
    setCurrentPdfPage: (page) => set({ currentPdfPage: page }),
    setCurrentPdfDocId: (docId) => set({ currentPdfDocId: docId }),

    // Chat
    setCurrentChatId: (chatId) => set({ currentChatId: chatId }),

    // Research
    setResearchMode: (enabled) => set({ isResearchMode: enabled }),
    setSubTasks: (tasks) => set({ subTasks: tasks }),
    updateSubTaskStatus: (id, status, answer) =>
      set((state) => ({
        subTasks: state.subTasks.map((task) =>
          task.id === id ? { ...task, status, answer: answer ?? task.answer } : task
        ),
      })),

    // Reset
    resetSession: () => set(INITIAL_STATE),
  },
}));

// ========== Selector Hooks (效能優化) ==========

/**
 * 只選取選中的節點 ID
 */
export const useSelectedNodeId = () => useSessionStore((state) => state.selectedNodeId);

/**
 * 只選取當前對話 ID
 */
export const useCurrentChatId = () => useSessionStore((state) => state.currentChatId);

/**
 * 只選取當前 PDF 頁碼
 */
export const useCurrentPdfPage = () => useSessionStore((state) => state.currentPdfPage);

/**
 * 只選取當前 PDF 文件 ID
 */
export const useCurrentPdfDocId = () => useSessionStore((state) => state.currentPdfDocId);

/**
 * 只選取研究模式開關
 */
export const useIsResearchMode = () => useSessionStore((state) => state.isResearchMode);

/**
 * 只選取研究子任務列表
 */
export const useSubTasks = () => useSessionStore((state) => state.subTasks);

/**
 * 只選取 PDF 狀態
 */
export const usePdfState = () => {
  const page = useCurrentPdfPage();
  const docId = useCurrentPdfDocId();

  return useMemo(
    () => ({
      page,
      docId,
    }),
    [docId, page]
  );
};

/**
 * 只選取研究模式狀態
 */
export const useResearchState = () => {
  const isResearchMode = useIsResearchMode();
  const subTasks = useSubTasks();

  return useMemo(
    () => ({
      isResearchMode,
      subTasks,
    }),
    [isResearchMode, subTasks]
  );
};

/**
 * 只選取 Actions
 */
export const useSessionActions = () => useSessionStore((state) => state.actions);

export default useSessionStore;
