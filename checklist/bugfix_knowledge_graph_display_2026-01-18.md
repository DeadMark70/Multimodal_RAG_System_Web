# Bug Fix: 知識圖譜 2D 圖形不顯示

**日期**: 2026-01-18  
**狀態**: ✅ 已修復  
**影響範圍**: `/graph-demo` 頁面的知識圖譜 Tab 無法顯示 2D 圖形

---

## 問題描述

在「視覺化元件展示」頁面中，「🔗 知識圖譜」Tab 內的 2D 力導向圖譜完全不可見，只顯示一片白色區域。

### 症狀

- 頁面標題、控制按鈕、狀態徽章都正常顯示
- Tab 切換功能正常
- 「🔀 研究流程」Tab 的 React Flow 圖正常顯示
- 唯獨「🔗 知識圖譜」Tab 的 ForceGraph2D 圖形區域為空白

### 技術細節

- Canvas 元素存在於 DOM 中
- Canvas 的 `height` 屬性為 `0`
- 容器的 `offsetHeight` 為 `0px`

---

## 根本原因

### Props 接口不完整

在 `GraphDemo.tsx` 中，呼叫 `KnowledgeGraph` 元件時傳入了 `width` 和 `height` props：

```tsx
// GraphDemo.tsx (第 187-191 行)
<KnowledgeGraph
  data={graphData}
  width={1100}        // 傳入了 width
  height={600}        // 傳入了 height
  isLoading={isGraphLoading}
  onNodeClick={...}
/>
```

但 `KnowledgeGraph.tsx` 的 Props 接口**沒有定義這兩個屬性**：

```tsx
// KnowledgeGraph.tsx (修復前)
export interface KnowledgeGraphProps {
  data?: GraphData;
  onNodeClick?: (node: GraphNode) => void;
  isLoading?: boolean;
  // ❌ 缺少 width 和 height
}
```

### 容器高度問題

元件內部的容器使用 `h="full"`：

```tsx
<Box ref={containerRef} w="full" h="full" ...>
```

這表示容器高度為父元素的 100%。但父元素：

```tsx
// GraphDemo.tsx (第 186 行)
<Box borderRadius="xl" overflow="hidden" boxShadow="lg">
```

**沒有設定明確高度**，導致高度計算結果為 `0px`。

### ResizeObserver 行為

`KnowledgeGraph` 使用 `ResizeObserver` 來取得容器尺寸：

```tsx
const observer = new ResizeObserver((entries) => {
  const { width, height } = entries[0].contentRect;
  setDimensions({ width, height }); // height = 0
});
```

由於容器高度為 0，ResizeObserver 回傳的 `height` 也是 0。

接著渲染條件 `dimensions.width > 0` 滿足，但傳入 ForceGraph2D 的 `height` 為 0：

```tsx
<ForceGraph2D
  width={dimensions.width} // 有效值
  height={dimensions.height} // 0 ← 問題點
/>
```

---

## 解決方案

### 修改 `src/components/graph/KnowledgeGraph.tsx`

#### 1. 擴充 Props 接口

```diff
 export interface KnowledgeGraphProps {
   data?: GraphData;
   onNodeClick?: (node: GraphNode) => void;
   isLoading?: boolean;
+  width?: number;
+  height?: number;
 }
```

#### 2. 解構新的 Props

```diff
 export function KnowledgeGraph({
   data,
   onNodeClick,
   isLoading = false,
+  width: propWidth,
+  height: propHeight = 600,
 }: KnowledgeGraphProps) {
```

#### 3. 設定容器明確高度

```diff
-<Box ref={containerRef} w="full" h="full" position="relative" ...>
+<Box ref={containerRef} w="full" h={propHeight ? `${propHeight}px` : "full"} minH="400px" position="relative" ...>
```

#### 4. 修改渲染條件

```diff
-{!isLoading && dimensions.width > 0 && (
+{!isLoading && (dimensions.width > 0 || propWidth) && (
```

#### 5. 使用 Fallback 值

```diff
 <ForceGraph2D
-  width={dimensions.width}
-  height={dimensions.height}
+  width={dimensions.width || propWidth || 800}
+  height={dimensions.height || propHeight || 600}
 />
```

---

## 修改後的完整 Diff

```diff
 export interface KnowledgeGraphProps {
   data?: GraphData;
   onNodeClick?: (node: GraphNode) => void;
   isLoading?: boolean;
+  width?: number;
+  height?: number;
 }

 export function KnowledgeGraph({
   data,
   onNodeClick,
   isLoading = false,
+  width: propWidth,
+  height: propHeight = 600,
 }: KnowledgeGraphProps) {
   // ...

   return (
-    <Box ref={containerRef} w="full" h="full" position="relative" overflow="hidden" borderRadius="xl" bg={bgColor}>
-      {!isLoading && dimensions.width > 0 && (
+    <Box ref={containerRef} w="full" h={propHeight ? `${propHeight}px` : "full"} minH="400px" position="relative" overflow="hidden" borderRadius="xl" bg={bgColor}>
+      {!isLoading && (dimensions.width > 0 || propWidth) && (
         <ForceGraph2D
           // ...
-          width={dimensions.width}
-          height={dimensions.height}
+          width={dimensions.width || propWidth || 800}
+          height={dimensions.height || propHeight || 600}
           // ...
         />
       )}
     </Box>
   );
 }
```

---

## 驗證結果

修改後，知識圖譜正常顯示：

| 項目        | 修復前      | 修復後       |
| ----------- | ----------- | ------------ |
| Canvas 高度 | 0px         | 600px        |
| 節點顯示    | ❌ 不可見   | ✅ 2161 節點 |
| 邊線顯示    | ❌ 不可見   | ✅ 2547 邊   |
| 縮放控制    | ❌ 無法使用 | ✅ 正常      |
| 拖曳互動    | ❌ 無法使用 | ✅ 正常      |

---

## 設計考量

### 為什麼使用 Fallback 而非移除 ResizeObserver？

保留 `ResizeObserver` 的原因：

1. **響應式設計**：當容器尺寸因視窗大小變化時，圖形可以自動調整
2. **向下相容**：如果父容器未來設定了明確高度，元件仍能自動適應
3. **彈性使用**：同一元件可在不同場景（有/無 props）下使用

### Fallback 優先順序

```
dimensions (ResizeObserver) → props → 預設值
```

這確保：

- 有 ResizeObserver 結果時優先使用（最精確）
- 沒有時使用傳入的 props
- 都沒有時使用安全的預設值

---

## 相關檔案

- `src/components/graph/KnowledgeGraph.tsx` - 主要修改
- `src/pages/GraphDemo.tsx` - 呼叫端（未修改）

---

## 預防措施

1. **TypeScript Strict**：確保 TypeScript 嚴格模式開啟，避免未定義的 props 被忽略
2. **PropTypes 或 Interface 完整性**：定義 API 時確保所有傳入的 props 都有對應的類型定義
3. **Container 高度**：使用 Canvas 或 SVG 的元件應避免依賴 `height: 100%`，改用明確的尺寸值
