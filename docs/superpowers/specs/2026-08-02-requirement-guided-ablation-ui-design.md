# Requirement-guided v9 ablation UI

## Goal

讓 Evaluation Setup 可以建立同一個 `agentic-v9` campaign 的 requirement-guided A/B 條件，明確比較 baseline（off）與 advisory experiment（on）。後端既有 `ablation_conditions` contract 與 runtime flag 不變。

## Scope

- 在 campaign setup 新增一個「Requirement-guided A/B」開關。
- 開啟後固定建立兩個條件：
  - `v9-baseline`: `requirement_guided_runtime: false`
  - `v9-guided`: `requirement_guided_runtime: true`
- 條件的 mode 固定為 `agentic-v9`，避免把一般 mode 或 shadow campaign 混入同一個 ablation。
- 建立前顯示預估執行數：`selected questions × repeat count × 2`。
- 建立 request 時送出 `ablation_conditions`；未開啟時維持現有 payload 與行為。
- 在 setup 內顯示條件名稱與 flag，讓使用者知道實際比較內容。

## Non-goals

- 不提供任意 JSON 編輯器或任意 flag 輸入。
- 不修改後端 schema、campaign engine、v9 runtime 或環境變數解析。
- 不把 requirement guidance 直接變成全域預設值。
- 不改現有 Naive k=4 ablation 行為；兩者需互斥，避免產生混合條件。

## UI and state

`CampaignRunner` 維持既有 mode、question、repeat、batch 與 prompt capture state，新增 `requirementGuidedAblation` boolean。啟用時：

1. 自動選取或要求選取 Agentic v9，並停用其他 RAG mode checkbox。
2. 若 Naive k=4 已開啟，顯示互斥提示並阻止送出。
3. 顯示兩列唯讀 condition preview（label、mode、flag value）。
4. 預估 units 以兩個 conditions 計算；未啟用時仍使用目前的估算。

## Request mapping

```ts
{
  modes: ['agentic-v9'],
  ablation_conditions: [
    {
      condition_id: 'v9-baseline',
      label: 'Requirement guidance off',
      mode: 'agentic-v9',
      ablation_flags: { requirement_guided_runtime: false },
    },
    {
      condition_id: 'v9-guided',
      label: 'Requirement guidance on',
      mode: 'agentic-v9',
      ablation_flags: { requirement_guided_runtime: true },
    },
  ],
}
```

The existing campaign request fields remain unchanged. When the toggle is off, omit `ablation_conditions` rather than sending an empty array so historical/default behavior remains identical.

## Validation and errors

- The submit guard must reject requirement-guided A/B when no test case or model config is selected.
- The submit guard must reject combinations with Naive k=4 or v9 shadow.
- If the selected agentic version is v8, the UI must either switch to v9 or show a clear incompatibility message before preflight/creation.
- Backend errors continue to surface through the existing toast path.

## Verification

Add/extend `CampaignRunner.test.tsx` to cover:

1. Toggle off omits `ablation_conditions`.
2. Toggle on sends exactly two conditions with the expected IDs, mode, and boolean flags.
3. Toggle on sends `modes: ['agentic-v9']` and estimates two condition arms.
4. Naive k=4 and requirement-guided A/B cannot be submitted together.
5. Existing normal-mode and Naive k=4 tests remain unchanged.

