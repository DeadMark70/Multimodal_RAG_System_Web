# Bug Fix: 白畫面問題 - BoxProps Import 錯誤

**日期**: 2026-01-18  
**狀態**: ✅ 已修復  
**影響範圍**: 全部頁面無法渲染（白畫面）

---

## 問題描述

應用程式所有頁面都顯示為全白畫面，React 應用程式無法正常初始化。

### 症狀

- 所有路由（`/dashboard`, `/knowledge`, `/chat` 等）都是空白頁面
- `<div id="root"></div>` 內沒有任何內容
- 瀏覽器 console 無明顯錯誤訊息（需要手動 dynamic import 才能看到錯誤）

### 錯誤訊息

```
The requested module '/node_modules/.vite/deps/@chakra-ui_react.js'
does not provide an export named 'BoxProps'
```

---

## 根本原因

在 `GlassPane.tsx` 和 `GlassCard.tsx` 中，`BoxProps` 使用了錯誤的 import 方式。

### 問題說明

`BoxProps` 是一個 **TypeScript 類型（Type）**，不是 JavaScript 值（Value）。在 ESM 模組系統中（Vite 使用的方式），TypeScript 類型會在編譯時被移除，不會作為 JavaScript export 存在。

當程式碼使用一般的 import 語法：

```tsx
import { Box, BoxProps, useColorModeValue } from "@chakra-ui/react";
```

Vite 的 ESM bundler 會嘗試在 runtime 導入 `BoxProps` 這個「值」，但該模組並不導出這個名稱作為 JavaScript 值，因此導致模組解析失敗，整個應用程式無法啟動。

---

## 解決方案

將 `BoxProps` 改為 **type-only import**：

```tsx
// ❌ 錯誤的寫法
import { Box, BoxProps, useColorModeValue } from "@chakra-ui/react";

// ✅ 正確的寫法
import { Box, useColorModeValue } from "@chakra-ui/react";
import type { BoxProps } from "@chakra-ui/react";
```

使用 `import type` 語法告訴 TypeScript 編譯器這只是一個類型導入，在編譯後的 JavaScript 中將被完全移除，不會產生 runtime import。

---

## 修改的檔案

### 1. `src/components/common/GlassPane.tsx`

```diff
-import { Box, BoxProps, useColorModeValue } from '@chakra-ui/react';
+import { Box, useColorModeValue } from '@chakra-ui/react';
+import type { BoxProps } from '@chakra-ui/react';
```

### 2. `src/components/common/GlassCard.tsx`

```diff
-import { Box, BoxProps, useColorModeValue } from '@chakra-ui/react';
+import { Box, useColorModeValue } from '@chakra-ui/react';
+import type { BoxProps } from '@chakra-ui/react';
```

---

## 驗證結果

修改後，所有頁面正常渲染：

| 頁面          | 狀態    |
| ------------- | ------- |
| `/dashboard`  | ✅ 正常 |
| `/knowledge`  | ✅ 正常 |
| `/chat`       | ✅ 正常 |
| `/experiment` | ✅ 正常 |
| `/graph-demo` | ✅ 正常 |
| `/login`      | ✅ 正常 |

---

## 預防措施

為避免未來發生類似問題，建議：

1. **啟用 TypeScript `verbatimModuleSyntax`**
   在 `tsconfig.json` 中加入：

   ```json
   {
     "compilerOptions": {
       "verbatimModuleSyntax": true
     }
   }
   ```

   這會強制要求所有 type-only imports 必須使用 `import type` 語法。

2. **ESLint 規則**
   使用 `@typescript-eslint/consistent-type-imports` 規則來自動檢測和修正：

   ```json
   {
     "rules": {
       "@typescript-eslint/consistent-type-imports": "error"
     }
   }
   ```

3. **Code Review 注意事項**
   當從 Chakra UI 或類似的 UI 庫導入 Props 類型時（如 `BoxProps`, `ButtonProps`, `InputProps` 等），務必使用 `import type` 語法。

---

## 相關資源

- [TypeScript 3.8: Type-Only Imports](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-3-8.html#type-only-imports-and-export)
- [Vite ESM 處理機制](https://vitejs.dev/guide/features.html#typescript)
- [Chakra UI TypeScript Guide](https://chakra-ui.com/docs/styled-system/typescript)
