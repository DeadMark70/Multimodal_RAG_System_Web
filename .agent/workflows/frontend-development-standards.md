---
description: Frontend Development Standards & Best Practices
---

---

{
type: uploaded file
fileName: checklist/frontend_development_standards.md
fullContent:

# Frontend Development Standards & Best Practices

> **Project:** Responsible RAG Research Dashboard (3R Dashboard)
> **Stack:** React, TypeScript, Horizon UI (Chakra UI), Supabase, Vite
> **Last Updated:** 2025-12-19

---

## 1. 核心原則 (Core Principles)

為確保專案在擴展過程中的**可維護性 (Maintainability)**、**安全性 (Security)** 與**一致性 (Consistency)**，所有前端開發需遵循以下原則：

1. **Strict TypeScript**: 禁止使用 `any`，所有與後端互動的資料結構必須定義 Interface。
2. **Component Driven**: 遵循 Atomic Design 精神，將 UI 拆解為可重用的元件。
3. **Separation of Concerns**: 邏輯 (Hooks) 與 視圖 (Components) 分離。
4. **Theme First**: 嚴禁 Hard-code 顏色碼，必須使用 Horizon UI 的 Theme Variables 以支援 Dark Mode。

---

## 2. 專案結構 (Project Structure)

```
src/
├── assets/                 # 靜態資源 (Images, SVGs)
├── components/             # UI 元件
│   ├── common/             # 通用元件 (Button, Card, Input - 基於 Horizon UI 封裝)
│   ├── layout/             # 佈局元件 (Sidebar, Navbar, Footer)
│   ├── rag/                # RAG 專用元件 (MessageBubble, CitationCard, PdfViewer)
│   └── charts/             # 圖表元件 (Recharts/ApexCharts wrapper)
├── contexts/               # React Context (AuthContext, ThemeContext)
├── hooks/                  # Custom Hooks (useAuth, useChatStream, usePdfUpload)
├── layouts/                # 頁面級佈局 (AdminLayout, AuthLayout)
├── pages/                  # 路由頁面 (Dashboard, KnowledgeBase, Login)
├── services/               # API 服務層 (Axios instance, Endpoints)
├── theme/                  # Horizon UI 主題客製化 (Colors, Fonts, Components Override)
├── types/                  # TypeScript 定義 (User, ChatMessage, RagResponse)
├── utils/                  # 工具函式 (Date formatting, Text truncation)
└── views/                  # 複雜頁面的子視圖拆分

```

---

## 3. TypeScript 與資料定義規範

### 3.1 命名約定

- **Interfaces**: 使用 `I` 前綴或直接命名 (推薦直接命名，如 `User`, `AuthResponse`)。
- **Props**: `ComponentProps` (例如 `MessageBubbleProps`)。

### 3.2 與後端同步

前端 `types/` 目錄下的定義必須與後端 `Pydantic` Schema 對應。

```typescript
// types/rag.ts

export interface ICitation {
  doc_id: string;
  file_name: string;
  page_number: number;
  snippet: string;
}

export interface IChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: ICitation[]; // RAG 特有欄位
  is_grounded?: boolean; // 負責任 AI 指標
  timestamp: number;
}
```

---

## 4. Horizon UI (Chakra UI) 開發規範

### 4.1 樣式與主題 (Theming)

- **禁止**：直接寫 Hex Code (e.g., `color="#4318FF"`).
- **必須**：使用 Theme Token。

```tsx
// ✅ Correct
<Box bg="brand.500" color="white" _dark={{ bg: "brand.400" }}>
  ...
</Box>

// ❌ Incorrect
<div style={{ backgroundColor: "#4318FF" }}>...</div>

```

### 4.2 響應式設計 (Responsive)

使用 Array 或 Object 語法定義響應式斷點。

```tsx
<Flex direction={{ base: "column", md: "row" }} w="100%">
  {/* Mobile 為 column, Desktop 為 row */}
</Flex>
```

---

## 5. 狀態管理與 Hooks (State & Logic)

### 5.1 API 請求

使用 `React Query` (TanStack Query) 或自定義 Hook 封裝 `fetch/axios`，處理 `loading`, `error`, `data` 狀態。

### 5.2 邏輯抽離範例

不要在 Component 內寫長篇大論的 `useEffect`。

```tsx
// hooks/useChat.ts
export const useChat = () => {
  const [messages, setMessages] = useState<IChatMessage[]>([]);

  const sendMessage = async (text: string) => {
    // 處理 API 呼叫、Stream 解析、狀態更新
  };

  return { messages, sendMessage, isLoading };
};
```

---

## 6. 安全性規範 (Security)

### 6.1 身份驗證 (Authentication)

- 所有 API 請求必須透過 `services/api.ts` 中的攔截器 (Interceptor)。
- **必須**：在 Header 自動注入 Supabase JWT Token。

```typescript
// services/api.ts
api.interceptors.request.use((config) => {
  const session = supabase.auth.session();
  if (session?.access_token) {
    config.headers.Authorization = `Bearer ${session.access_token}`;
  }
  return config;
});
```

### 6.2 XSS 防護 (Cross-Site Scripting)

- 由於 RAG 系統會回傳 Markdown，渲染時必須使用安全的 Library。
- **必須**：使用 `react-markdown` 搭配 `rehype-sanitize`。

```tsx
import ReactMarkdown from "react-markdown";
import rehypeSanitize from "rehype-sanitize";

<ReactMarkdown rehypePlugins={[rehypeSanitize]}>
  {markdownContent}
</ReactMarkdown>;
```

---

## 7. RAG 系統特有規範

### 7.1 串流回應處理 (Streaming)

後端 LLM 回應可能為 Server-Sent Events (SSE)。前端必須能夠累加 (Accumulate) 文字塊，以達到打字機效果。

### 7.2 引用來源視覺化

- 引用標記 `[1]` 必須轉化為可點擊的 `Anchor` 或 `Tooltip`。
- 點擊引用時，應觸發事件開啟 PDF 預覽視窗，並跳轉至指定頁數。

---

## 8. 程式碼品質與提交 (Quality Control)

### 8.1 Linting & Formatting

- **ESLint**: 使用 `eslint-config-react-app` 或 `airbnb`.
- **Prettier**: 確保全專案縮排、分號一致 (建議 `.prettierrc` 設定)。

### 8.2 Git Commit Convention

遵循 Conventional Commits：

- `feat: 新增 RAG 模式切換開關`
- `fix: 修正 Markdown 表格渲染跑版問題`
- `refactor: 重構 useAuth Hook`
- `style: 調整 Horizon UI 主題顏色`

---

## 9. 開發流程檢核表 (Pre-push Checklist)

- [ ] 是否已移除所有 `console.log` (除必要的錯誤捕捉外)？
- [ ] 是否檢查過 Dark Mode 下的顯示效果？
- [ ] 是否已處理 API 的錯誤狀態 (Error Boundary / Toast 通知)？
- [ ] 是否使用了 TypeScript Interface 而非 `any`？
- [ ] **關鍵**：是否測試過上傳大檔案 (PDF) 的行為？

}
