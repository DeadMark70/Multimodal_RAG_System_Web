# Multimodal RAG Frontend

React + TypeScript + Vite 前端，提供：
- 文件導向問答（RAG Chat）
- Deep Research 規劃與執行流程
- 對話歷史管理與設定持久化

此專案為前端工作區，後端 API 預設對接 `http://127.0.0.1:8000`。

## 快速開始

### 1. 安裝與啟動

```bash
npm ci
cp .env.example .env
npm run dev
```

預設開發網址：`http://localhost:5173`

### 2. 必要環境變數

請在 `.env` 設定：

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_API_BASE_URL=http://127.0.0.1:8000
VITE_TEST_MODE=false
VITE_MOCK_MODE=false
```

## API 模式說明

### 測試 / CI 模式

設定：
- `VITE_TEST_MODE=true`
- `VITE_MOCK_MODE=true`

效果：
- 禁止呼叫非本機 API 目標
- 避免在測試中誤打外部服務（包含 SSE 路徑）

### 一般開發 / 實際串接

設定：
- `VITE_TEST_MODE=false`
- `VITE_MOCK_MODE=false`

並將 `VITE_API_BASE_URL` 指向你的後端服務。

## 常用指令

```bash
npm run dev       # 開發模式
npm run build     # 型別檢查 + 建置
npm run preview   # 預覽建置結果
npm run test      # Vitest
npm run lint      # ESLint
npm run lint:ci   # ESLint (0 warning gate)
```

## 專案結構

```text
src/
  components/   # UI 元件
  hooks/        # 領域邏輯 hooks
  pages/        # 頁面
  services/     # API / network 層
  stores/       # Zustand 狀態管理
  test/         # 測試 setup 與 helper
docs/           # 設計與規範文件
```

## 文件入口

- 主索引：`docs/index.md`
- 前端架構：`docs/FRONTEND.md`
- 可靠性：`docs/RELIABILITY.md`
- 安全性：`docs/SECURITY.md`
- 其他歷史資料：`conductor/`

## 協作與品質基線

- 提交前至少執行：

```bash
npm run lint:ci
npx tsc --noEmit
npm run test
```

- CI 會將 ESLint warning 視為失敗（`--max-warnings 0`）。
- `.env` 不應提交到 git（僅保留 `.env.example`）。
