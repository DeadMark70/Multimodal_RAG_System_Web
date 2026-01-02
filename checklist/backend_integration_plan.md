# Multimodal RAG System - 前後端整合與視覺化架構計畫書 (v2.0)

這份文件詳細說明了將 FastAPI 後端服務整合至 React 前端的策略。本版本融入了 **Zustand** 狀態管理與 **GraphRAG 視覺化** 的深度技術規範。

## 1. 專案目標

-   **全功能介面化**: 將 RAG 策略、圖譜模式等後端參數完全暴露給前端控制。
-   **高效狀態管理**: 使用 Zustand 實現設定持久化與即時 UI 狀態同步。
-   **沉浸式視覺化**:
    -   使用力導向圖 (Force-Directed Graph) 展示知識圖譜。
    -   使用流程圖 (Node-Edge Flow) 展示深度研究步驟。
-   **類型安全**: 前後端共用一致的 TypeScript 類型定義。

## 2. 架構與標準

### 2.1 目錄結構優化

標準化 `src` 目錄結構，引入 Stores 與 Visual Components：

```text
src/
├── services/           # API 服務層 (Axios)
│   ├── api.ts          # 攔截器與 Token 處理
│   ├── ragApi.ts       # RAG / Research
│   ├── pdfApi.ts       # PDF CRUD
│   ├── graphApi.ts     # GraphRAG
│   └── statsApi.ts     # Dashboard
├── stores/             # Zustand 狀態管理
│   ├── useSettingsStore.ts # 持久化設定 (RAG 開關、主題)
│   └── useSessionStore.ts  # 暫態 Session (選中節點、PDF 頁碼)
├── components/
│   ├── graph/          # 視覺化元件
│   │   ├── KnowledgeGraph.tsx  # react-force-graph-2d 封裝
│   │   └── ResearchFlow.tsx    # @xyflow/react 封裝
│   └── settings/
│       └── SettingsPanel.tsx   # 功能開關面板
├── types/              # TypeScript 定義
│   ├── api.ts
│   ├── rag.ts
│   ├── graph.ts        # GraphData, Node, Link 定義
│   └── ...
└── hooks/              # React Query Hooks
```

### 2.2 技術選型
-   **狀態管理**: `zustand` (取代 React Context)。
-   **資料快取**: `@tanstack/react-query`。
-   **知識圖譜**: `react-force-graph-2d` (基於 HTML5 Canvas，高效能)。
-   **流程視覺化**: `@xyflow/react` (原 React Flow，用於 Plan-and-Solve)。

## 3. 狀態管理設計 (Zustand)

將狀態分為「持久化設定」與「暫態 Session」兩類。

### 3.1 `useSettingsStore` (持久化)
負責管理所有 RAG 參數與使用者偏好，自動同步至 `localStorage`。

**State 定義參考:**
```typescript
interface RagSettings {
  enable_hyde: boolean;         // HyDE 檢索
  enable_multi_query: boolean;  // 多重查詢
  enable_reranking: boolean;    // 精準重排序 (Default: true)
  enable_evaluation: boolean;   // Self-RAG 評估
  enable_graph_rag: boolean;    // 啟用知識圖譜
  graph_search_mode: 'local' | 'global' | 'hybrid' | 'auto';
  enable_graph_planning: boolean; // 圖譜輔助規劃
  max_subtasks: number;         // 研究子任務數 (1-10)
}

interface SettingsState {
  ragSettings: RagSettings;
  theme: 'light' | 'dark';
  sidebarOpen: boolean;
  actions: {
    setRagSetting: <K extends keyof RagSettings>(key: K, value: RagSettings[K]) => void;
    // ...其他 actions
  }
}
```

### 3.2 `useSessionStore` (暫態)
負責管理當前互動狀態，重新整理後重置。

**State 定義參考:**
```typescript
interface SessionState {
  // Graph 互動
  selectedNodeId: string | null; // 當前點擊的實體節點
  graphCameraPosition: { x: number; y: number; k: number } | null;
  
  // PDF 閱讀器
  currentPdfPage: number;
  
  // 對話相關
  currentChatId: string | null;
}
```

## 4. 視覺化方案實作

### 4.1 知識圖譜 (Knowledge Graph)
目標：展示實體 (Entities) 與關係 (Relationships) 的網狀結構。

*   **庫**: `react-force-graph-2d`
*   **資料轉換**: 後端 NetworkX -> 前端 `GraphData`
    ```typescript
    interface GraphData {
      nodes: { id: string; group: number; val: number; desc?: string }[];
      links: { source: string; target: string; label?: string }[];
    }
    ```
*   **互動功能**:
    *   **點擊 (OnNodeClick)**: 更新 `useSessionStore.selectedNodeId`，觸發側邊欄顯示實體摘要。
    *   **著色 (NodeColor)**: 根據 `group` (社群 ID) 自動分配顏色。
    *   **縮放 (Zoom)**: 支援滑鼠滾輪縮放與平移。

### 4.2 深度研究流程 (Deep Research Flow)
目標：展示 Plan-and-Solve 的任務拆解與執行狀態。

*   **庫**: `@xyflow/react`
*   **呈現方式**: DAG (有向無環圖)，從「原始問題」分支出多個「子任務」，最後匯聚至「總結」。
*   **節點狀態**:
    *   🔵 `Pending`: 等待執行
    *   🟡 `Loading`: 檢索/生成中 (Spinner)
    *   🟢 `Success`: 完成 (點擊查看子報告)
    *   🔴 `Error`: 失敗

## 5. 整合階段規劃

### 第一階段：基礎建設 (Foundation)
1.  **安裝依賴**:
    ```bash
    npm install zustand @tanstack/react-query react-force-graph-2d @xyflow/react
    ```
2.  **建立 Stores**: 實作 `useSettingsStore` (含 persist) 與 `useSessionStore`。
3.  **類型定義**: 建立 `src/types/rag.ts` 與 `src/types/graph.ts`。

### 第二階段：核心 RAG 與設定整合
1.  **設定面板 (UI)**: 建立 `SettingsPanel` 元件，綁定 `useSettingsStore`。
2.  **API 串接**: 修改 `useChat` hook，在發送 `/rag/ask` 請求時，從 Store 讀取當前的 RAG 設定並注入 Request Body。
3.  **文件管理**: 實作 PDF 上傳與列表 (React Query)。

### 第三階段：視覺化整合
1.  **圖譜頁面**:
    *   串接 `/graph/status` 取得節點數據。
    *   實作 `KnowledgeGraph` 元件，渲染力導向圖。
2.  **研究模式**:
    *   串接 `/rag/research`。
    *   實作 `ResearchFlow` 元件，即時顯示 `sub_tasks` 的執行進度。

## 6. 安全性與優化
-   **Token 管理**: Axios 攔截器統一處理 Supabase JWT。
-   **效能優化**: Graph 渲染時，若節點過多 (>1000)，自動降級渲染品質 (如隱藏 Label)。
-   **錯誤處理**: API 錯誤需反饋至 UI Toast，避免靜默失敗。

## 7. 測試驗證
-   驗證 Zustand 的 persist 是否在 F5 重整後保留設定。
-   驗證 Graph 點擊事件是否正確觸發 Store 更新與 UI 連動。
