# Multimodal RAG Frontend

本專案是 `Multimodal_RAG_System` 前端工作區，使用 React + TypeScript + Vite 建立多模態 RAG 研究介面，對接 FastAPI 後端與 Supabase Auth/資料持久化。

## 1. 目標與範圍

前端主要提供 6 大工作面：

1. 使用者驗證與帳號流程（登入、註冊、忘記密碼、重設密碼）
2. 知識庫文件管理（上傳、OCR/索引狀態追蹤、翻譯、刪除、下載）
3. 即時 RAG 對話（SSE 串流）
4. Deep Research / Agentic Benchmark 研究流程
5. GraphRAG 視覺化與維護操作
6. 評估中心（測資、模型設定、活動執行、結果與 trace）

> 注意：本 repo 是前端程式碼主體。後端實作在 `D:\flutterserver\pdftopng`。

---

## 2. 技術棧

- Framework: React 18
- Language: TypeScript 5
- Build Tool: Vite 7
- UI: Chakra UI + Emotion + Framer Motion
- State:
  - Server state: TanStack Query 5
  - Client state: Zustand 5
- Router: React Router DOM 7
- Auth: Supabase Auth (`@supabase/supabase-js`)
- HTTP: Axios + authenticated `fetch` for SSE
- Charts/Graph:
  - Recharts
  - react-force-graph-2d / react-force-graph-3d
  - @xyflow/react
- Markdown rendering: react-markdown + remark-gfm + rehype-sanitize
- Testing: Vitest + Testing Library + jsdom
- Lint: ESLint 9 + typescript-eslint

---

## 3. 目前路由與頁面

路由定義在 `src/App.tsx`：

- Public routes:
  - `/login`
  - `/signup`
  - `/forgot-password`
  - `/reset-password`
- Protected routes (`ProtectedRoute` + `AuthProvider`):
  - `/dashboard`
  - `/knowledge`
  - `/chat`
  - `/experiment`
  - `/evaluation`
  - `/graph-demo`
- `/` 會導向 `/dashboard`

---

## 4. 架構總覽

### 4.1 Provider 層

`src/App.tsx` 組合：

- `QueryClientProvider`
- `ChakraProvider`
- `AuthProvider`
- `BrowserRouter`

### 4.2 Layout 與頁面容器

- `src/components/layout/Layout.tsx`
  - 固定 sidebar shell
  - 內容區 `overflow="hidden"`
- 長內容頁面（例如 `/knowledge`, `/evaluation`, `/graph-demo`）在頁面自身提供 scroll owner（`overflowY="auto"`）

### 4.3 狀態管理分工

- `useSettingsStore`（persist）
  - RAG 設定、模式 preset、主題等偏好
- `useSessionStore`（non-persist）
  - 當前會話/圖譜互動/PDF 游標等暫態
- `useUploadProgressStore`
  - 批次上傳進度

---

## 5. 核心工作流

### 5.1 認證流程

- Supabase client 建於 `src/services/supabase.ts`
- `AuthProvider` 在啟動時 `getSession()`，並監聽 `onAuthStateChange`
- `PASSWORD_RECOVERY` 事件會導向 `/reset-password`
- 登出流程先嘗試 `global`，失敗時 fallback `local`

### 5.2 一般 Chat（SSE）

- Hook: `src/hooks/useChat.ts`
- API: `POST /rag/ask/stream`
- 行為：
  - 送出 user 訊息
  - 讀取 `phase_update` 更新 pipeline stage
  - 收到 `complete` 組裝 assistant 訊息
  - 如有 conversation id，會同步持久化到 `/api/conversations/{id}/messages`

### 5.3 Deep Research

- Hook: `src/hooks/useDeepResearch.ts`
- APIs:
  - `POST /rag/plan`
  - `POST /rag/execute/stream`
- 會在 `conversation.metadata` 記錄：
  - `research_engine=deep_research`
  - `mode_preset`
  - `mode_config_snapshot`
  - `plan/result`

### 5.4 Agentic Benchmark

- Hook: `src/hooks/useAgenticBenchmarkResearch.ts`
- API: `POST /rag/agentic/stream`
- 支援進度、evaluation update、trace step、最終報告整合
- 會話 metadata 以 `research_engine=agentic_benchmark` 區分

### 5.5 文件上傳與狀態輪詢

- Hook: `src/hooks/useDocuments.ts`
- API: `POST /pdfmd/upload_pdf_md`
- 以併發數 `2` 處理批次上傳
- 透過 `GET /pdfmd/file/{doc_id}/status` 輪詢直到結束狀態

### 5.6 GraphRAG 維運

- Hook: `src/hooks/useGraphData.ts`
- 主要操作：
  - `GET /graph/status`
  - `GET /graph/data`
  - `GET /graph/documents`
  - `POST /graph/rebuild`
  - `POST /graph/rebuild-full`
  - `POST /graph/documents/{doc_id}/retry`
  - `DELETE /graph/documents/{doc_id}`
  - `POST /graph/optimize`
  - `POST /graph/node-vector/sync`
  - `GET /graph/node-vector/sync/status`

---

## 6. API 服務層與安全策略

### 6.1 共用 API 客戶端

`src/services/api.ts`：

- 預設 `baseURL = VITE_API_BASE_URL`（fallback `http://127.0.0.1:8000`）
- request interceptor:
  - 檢查允許目標 host
  - 在允許時附加 Bearer token
- response interceptor:
  - 統一錯誤訊息抽取

### 6.2 網路白名單策略

`src/services/networkPolicy.ts`：

- API 與 markdown 外連都受 allowlist 約束
- `VITE_TEST_MODE=true` 或 `VITE_MOCK_MODE=true` 時
  - 禁止非本機 API 目標
- 提供：
  - `assertAllowedApiTarget(...)`
  - `isAllowedMarkdownTarget(...)`

### 6.3 SSE 處理

`src/services/ragApi.ts`, `src/services/evaluationApi.ts`：

- 使用 `fetch + ReadableStream` 手動解析 SSE
- 支援 CRLF (`\r\n`) 結尾，避免事件延遲 flush

---

## 7. 環境變數

`Multimodal_RAG_System/.env.example`：

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_API_BASE_URL=http://127.0.0.1:8000
VITE_TRUSTED_API_HOSTS=
VITE_TRUSTED_MARKDOWN_HOSTS=
VITE_TEST_MODE=false
VITE_MOCK_MODE=false
```

說明：

- `VITE_TRUSTED_API_HOSTS`: 逗號分隔，補充允許附 token 的 API host
- `VITE_TRUSTED_MARKDOWN_HOSTS`: 允許 markdown link/image 的額外 host

---

## 8. 本機開發

### 8.1 安裝

```bash
npm ci
```

### 8.2 建立環境檔

```bash
cp .env.example .env
```

### 8.3 啟動

```bash
npm run dev
```

預設網址：`http://localhost:5173`

---

## 9. NPM Scripts

`package.json`：

```bash
npm run dev       # Vite 開發模式
npm run build     # tsc -b + vite build
npm run preview   # 預覽 build 結果
npm run lint      # eslint .
npm run lint:ci   # eslint . --max-warnings 0
npm run test      # vitest
```

---

## 10. 測試與品質檢查

建議提交前至少執行：

```bash
npm run lint:ci
npx tsc --noEmit
npx vitest run
npm run build
```

Vitest 設定：`vitest.config.ts`

- `environment: 'jsdom'`
- `setupFiles: './src/test/setup.ts'`

`src/test/setup.ts` 會：

- 注入 `jest-dom`
- mock `matchMedia` 與 `scrollIntoView`
- 包裝 `fetch`，透過 `assertAllowedApiTarget` 保護測試網路邊界

---

## 11. 目錄結構（前端）

```text
src/
  components/      # UI 元件
  contexts/        # Auth context
  hooks/           # 功能 hook（chat/research/docs/graph 等）
  pages/           # 路由頁面
  services/        # API 客戶端與服務
  stores/          # Zustand stores
  theme/           # Chakra theme
  types/           # TS 型別契約
  utils/           # 工具函式
  test/            # 測試 setup / helper
  tests/           # 跨模組流程測試

public/
docs/
supabase/migrations/
```

---

## 12. 部署與容器

### 12.1 前端 Docker

`Multimodal_RAG_System/Dockerfile`：

- Stage 1: Node 20 build (`npm ci` + `npm run build`)
- Stage 2: nginx 1.27 提供靜態檔案

### 12.2 nginx 反向代理

`Multimodal_RAG_System/nginx.conf`：

- `/pdfmd|/rag|/imagemd|/multimodal|/stats|/graph|/api` 轉發到 backend:8000
- 保留 SSE 相容設定（`proxy_buffering off` 等）
- 包含 CSP header

### 12.3 Compose

整體 compose 位於 `D:\flutterserver\docker-compose.yml`，前端服務 build context 即本目錄。

---

## 13. 與後端契約（前端視角）

前端依賴主要 API domain：

- `pdfmd`: 文件處理與下載
- `rag`: 問答、規劃、執行、串流
- `graph`: 圖譜狀態與維運
- `api/conversations`: 對話持久化
- `api/evaluation`: 評估流程
- `stats`: 儀表板統計

若要查看後端完整契約，請參考：

- `D:\flutterserver\pdftopng\openapi.json`
- `D:\flutterserver\pdftopng\README.md`

---

## 14. 常見問題

### Q1. 啟動時出現 `Missing Supabase environment variables`

請確認 `.env` 已設定：

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

### Q2. 測試模式下 API 被擋

若你設了 `VITE_TEST_MODE=true` 或 `VITE_MOCK_MODE=true`，非本機 API 會被 `networkPolicy` 阻擋，這是預期行為。

### Q3. 忘記密碼流程無法回到前端重設頁

請在 Supabase Dashboard 的 Redirect URLs 加入：

- `http://localhost:5173/reset-password`

### Q4. Graph / Benchmark 看不到即時更新

確認反向代理沒有開啟 response buffering，並保留 SSE timeout 設定（`nginx.conf` 已包含）。

---

## 15. 延伸閱讀

- `docs/index.md`
- `docs/FRONTEND.md`
- `docs/SECURITY.md`
- `docs/RELIABILITY.md`
- `docs/generated/ui-surface.md`
