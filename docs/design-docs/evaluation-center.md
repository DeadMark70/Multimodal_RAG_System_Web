# Evaluation Center

## Purpose

Describe the current evaluation UI as a first-class subsystem rather than a release note. This document is intentionally code-aligned with `src/pages/EvaluationCenter.tsx` and the setup/admin components under `src/components/evaluation`.

## Route Shell

- Route: `/evaluation`
- Page shell: `src/pages/EvaluationCenter.tsx`
- Layout:
  - shared `Layout` shell
  - `PageHeader` stays outside the page scroll area
  - `evaluation-scroll-region` owns vertical scrolling for the route body
- Header actions:
  - campaign selector fed by `listCampaigns()`
  - `Setup evaluation` button opening `EvaluationSetupDrawer.tsx`
- Data strategy:
  - this page does not use TanStack Query
  - it uses page-local `useState` + `useEffect`
  - initial load fetches only campaign inventory
  - selecting a campaign fetches the strict campaign overview through `getCampaignResearchSummary(...)`; tab-specific payloads load only after that tab is selected

## Strict Research Summary Contract (schema v2)

`Campaign Overview` is backed by `GET /api/evaluation/campaigns/{campaign_id}/research-summary`, via `getCampaignResearchSummary(...)`. It is the overview's authoritative source; the tab does not derive accounting, quality, latency, or cost from the legacy analytics payloads.

- The response has `research_schema_version: "2"` and separates campaign totals, one `modes[]` summary per completed mode, and `evaluation_overhead`.
- The campaign-level research summary carries four independent top-level statuses: `quality_status`, `token_accounting_status`, `pricing_status`, and `phase_attribution_status`. A successful campaign must not be presented as though all four dimensions are complete. Mode entries instead expose nested quality-observation, token/phase-attribution, and cost/pricing statuses.
- Nullable measurements are intentionally rendered as `N/A`; a missing price/cost is rendered as `Unknown`. The UI does not substitute `0`, reuse an average as P50/P95, or infer a quality result from another metric.
- Version-2 execution totals include only completed, schema-v2, official execution scopes matched to the durable campaign result/attempt. Older or incomplete accounting remains visible as `incomplete_legacy` or `partial`, with a legacy warning rather than a synthesized total.

### Quality, latency, and comparability

- The official quality observations are RAGAS-only: `answer_correctness`, `faithfulness`, and `answer_relevancy` (with context metrics only when requested). Each observation preserves its value, status, valid/missing/failed sample counts, and evaluator metadata.
- Quality status is independent of token, pricing, and phase-attribution status. A value may therefore be `N/A` while other accounting data is available, or be marked `partial`, `evaluating`, `failed`, or `not_requested` without implying a zero score.
- Latency is reported from measured completed-run latencies. P50 and P95 use the deterministic nearest-rank method over observed values; they are not interpolated. `low_sample_size` is shown when there are one to four samples.
- Cost-versus-quality displays only comparable modes with benchmark pricing and both correctness and faithfulness. Excluded modes are retained as explanatory text with their server-provided `not_comparable_reasons` plus any missing-pricing or missing-quality reason; they are not silently charted.

### Accounting views

- `Benchmark Cost` is the price of official, strict execution calls only. `Operational Cost` is the price of all execution calls associated with the mode/campaign. `RAGAS Overhead` is evaluator-batch cost and token use, shown separately from execution cost.
- Token rows keep input, output-text, reasoning, and other categories separate. `by_phase` is server-attributed execution/RAGAS phase data; any remainder is shown as `Unclassified`. An `unclassified` phase or incomplete measurement makes phase attribution/status explicit rather than redistributing tokens.
- The token panel displays RAGAS evaluation overhead independently, including its own accounting and phase-attribution state. It does not add evaluator tokens into the execution token total.

## Boundaries

- Page shell: `src/pages/EvaluationCenter.tsx`
- REST + SSE client: `src/services/evaluationApi.ts`
- Main dashboard tabs:
  - `CampaignOverviewTab`
  - `QuestionAnalysisTab`
  - `RunTraceTab`
  - `RetrievalEvidenceTab`
  - `AgentBehaviorTab`
  - `ClaimEvidenceTab`
  - `RouterLabTab`
  - `AblationDashboardTab`
- Setup / admin drawer:
  - `TestCaseManager`
  - `ModelConfigPanel`
  - `CampaignRunner`
- Legacy standalone surfaces still in the repo but not mounted on `/evaluation`:
  - `EvaluationResults`
  - `AgentTraceViewer`

## Main Dashboard Tabs

The primary analytics surface is an 8-tab Chakra `Tabs` control rendered directly in `EvaluationCenter.tsx`.

1. `Campaign Overview`
   - component: `CampaignOverviewTab.tsx`
   - page inputs:
     - `getCampaignResearchSummary(...)` is the sole source for Overview research metrics and rows
     - `getCampaignErrors(...)`, when requested by page/tab orchestration, supplies background error data for other surfaces and is not an Overview research-metric source
   - mapped outputs:
     - summary cards
     - mode comparison rows
     - cost/quality rows
     - latency summary rows
     - token rows
   - rendering behavior:
     - uses compact table-based "charts"
     - each child panel has explicit empty-copy text instead of placeholder graphics

2. `Question Analysis`
   - component: `QuestionAnalysisTab.tsx`
   - page inputs:
     - `getQuestionComparison(...)`
   - rendering behavior:
     - local category/status filters only
     - `QuestionDeltaHeatmap.tsx` renders a tint-based table, not a canvas heatmap
     - full detail table is wrapped in `overflowX="auto"`

3. `Run Trace`
   - component: `RunTraceTab.tsx`
   - page inputs:
     - `getCampaignRuns(...)`
     - `getRunDetail(...)` for the first run only
   - rendering behavior:
     - current page implementation shows the first run from the run list
     - display-only selects show campaign/question/mode/repeat metadata
     - `RunTraceTree.tsx` sorts persisted events by `sequence`
     - payload and error blobs stay collapsed behind disclosure buttons
   - legacy compatibility:
     - `RunTraceTab.tsx` still supports a `legacySteps` prop and a simplified "legacy trace" renderer, but the route currently feeds `traceEvents`

4. `Retrieval Evidence`
   - component: `RetrievalEvidenceTab.tsx`
   - page inputs:
     - `getRunDetail(...)`
   - rendering behavior:
     - query cards
     - `RetrievedChunksTable.tsx`
     - `EvidenceCoveragePanel.tsx`
   - note:
     - `EvaluationCenter.tsx` currently maps chunk and retrieval rows, but does not yet map evidence coverage rows, so coverage usually lands on its empty state

5. `Agent Behavior`
   - component: `AgentBehaviorTab.tsx`
   - page inputs:
     - `getCampaignResults(...)`
     - `getRunDetail(...)`
   - rendering behavior:
     - aggregate cards are derived client-side from row totals
     - tool-call categorization is heuristic string matching against serialized tool calls

6. `Claim Evidence`
   - component: `ClaimEvidenceTab.tsx`
   - page inputs:
     - `getRunDetail(...)`
   - rendering behavior:
     - `ClaimEvidenceTable.tsx` for row details
     - separate unsupported-reasons list

7. `Router Lab`
   - component: `RouterLabTab.tsx`
   - page inputs:
     - `getRouterAnalysis(...)`
   - rendering behavior:
     - warns when the campaign only has retrospective router analysis
     - shows KPI cards, utility formula text, policy comparison table, and optional confusion matrix

8. `Ablation`
   - component: `AblationDashboardTab.tsx`
   - page inputs:
     - `getAblationAnalysis(...)`
     - `getHumanVsAuto(...)`
     - `getHumanEvalQueue(...)`
     - `getCampaignErrors(...)`
     - `exportCampaignAnalysis(...)`
   - rendering behavior:
     - one tab owns ablation counts, human-calibration queue, export preview, and sanitized errors
     - export option checkboxes are local UI state; the visible button does not issue a fresh export request

## Setup / Admin Surfaces

`EvaluationSetupDrawer.tsx` is the actual setup/admin entry point for the route. It opens as a right-side `Drawer` (`size="xl"`) and contains its own 3-tab surface.

1. `Test Cases`
   - component: `TestCaseManager.tsx`
   - service calls:
     - `listTestCases`
     - `createTestCase`
     - `updateTestCase`
     - `deleteTestCase`
     - `importTestCases`
   - behavior:
     - JSON import/export
     - filterable dataset table
     - create/edit modal covering long answer, short answer, key points, ragas focus, category, difficulty, and source docs
     - preserves backend-managed research metadata fields on update

2. `Model Configs`
   - component: `ModelConfigPanel.tsx`
   - service calls:
     - `listAvailableModels`
     - `listModelConfigs`
     - `createModelConfig`
     - `updateModelConfig`
     - `deleteModelConfig`
   - behavior:
     - per-model reasoning controls via `ThinkingConfigControl.tsx`
     - explicit `Refresh models` action
     - saved preset CRUD
     - auth/model-load failures surface as warning/error copy rather than breaking the drawer layout

3. `Campaigns`
   - component: `CampaignRunner.tsx`
   - service calls:
     - `listTestCases`
     - `listModelConfigs`
     - `listCampaigns`
     - `createCampaign`
     - `cancelCampaign`
     - `getCampaignResults`
     - `streamCampaign`
   - behavior:
     - starts campaigns from saved presets only
     - resumes the first non-terminal campaign on mount
     - displays live progress, campaign history, reconnect/cancel controls, and a raw results preview table

## Legacy Surfaces

- `EvaluationResults.tsx`
  - still exists as a standalone metrics/results page-level component
  - service calls:
    - `listCampaigns`
    - `getCampaignMetrics`
    - `evaluateCampaign`
  - notable behavior:
    - runtime metric selector from `available_metrics`
    - `reference_source` column for short-answer vs long-answer fallback debugging
    - tabbed Delta / ECR explorer for category, difficulty, and question summaries
- `AgentTraceViewer.tsx`
  - still exists as a standalone trace-comparison tool
  - service calls:
    - `listCampaigns`
    - `listCampaignTraces`
    - `getCampaignResultTrace`
  - notable behavior:
    - compares one primary trace and one optional secondary trace
    - execution profile labels fall back to `legacy`

## Empty-State and Legacy Campaign Rules

- `CampaignOverviewTab.tsx`
  - `Select a campaign to view overview metrics.`
- `QuestionAnalysisTab.tsx`
  - `Question-level analysis will appear after run comparisons are available.`
- `RunTraceTab.tsx`
  - `Select a run to inspect trace details.`
- `RunTraceTree.tsx`
  - `No trace events are available for this run yet.`
- `RetrievalEvidenceTab.tsx`
  - `Retrieval evidence will appear after a run records chunk-level details.`
- `RetrievedChunksTable.tsx`
  - `No retrieved chunks were recorded for this run.`
- `EvidenceCoveragePanel.tsx`
  - `No evidence coverage rows are available for this run.`
- `AgentBehaviorTab.tsx`
  - `Agent behavior metrics will appear after trace aggregation is available.`
- `ClaimEvidenceTab.tsx`
  - `Claim-evidence alignment will appear after claim extraction is available.`
- `RouterLabTab.tsx`
  - `Router lab metrics will appear after router analysis is available.`
  - plus an explicit warning when there are no actual router runs
- `AblationDashboardTab.tsx`
  - if no tab data at all: `Ablation, human calibration, export, and debug surfaces will appear after selecting a campaign.`
  - section-level empty rows:
    - `No ablation conditions recorded.`
    - `No human review queue rows.`
    - `No sanitized errors.`
- `CampaignRunner.tsx`
  - no matching cases for a filter: `目前篩選沒有題目。`
  - no active campaign: `目前沒有執行中的 campaign。`
  - no history: `尚未建立任何 campaign。`
  - no selected raw results: `選擇一個 campaign 以查看逐題結果。`
- `EvaluationResults.tsx`
  - no campaigns: `尚未建立任何 campaign，因此目前沒有可分析的結果。`
  - no visualizable RAGAS rows: `此 campaign 目前尚無可視覺化的 RAGAS 指標。`
- `AgentTraceViewer.tsx`
  - no campaigns: `尚未建立任何 campaign，因此目前沒有可檢視的 trace。`

## SSE and Observability Compatibility

- Campaign progress is recovered from backend snapshots after reconnect.
- `streamCampaign(...)` uses authenticated `fetch` + manual line parsing, not browser `EventSource`.
- The parser recognizes only the known evaluation event names and ignores unknown events or malformed payload JSON.
- Granular stream payloads are typed with:
  - `event_schema_version`
  - `sequence`
  - `campaign_id`
  - `run_id`
  - `span_id`
  - `parent_span_id`
  - `stage_type`
  - `stage_name`
  - `status`
  - `created_at`
  - `payload`
- Current client behavior:
  - does not branch on `event_schema_version`
  - does not reorder live SSE events by `sequence`
  - does use `sequence` when rendering stored run-detail trace rows through `RunTraceTree.tsx`
- Campaign resiliency:
  - `CampaignRunner.tsx` retries SSE reconnect with backoff
  - when reconnects are exhausted it falls back to polling `listCampaigns()`
  - on reload it resumes the first non-terminal campaign from backend snapshots
- Agent traces and observability details are fetched from dedicated endpoints instead of inflating the base results payload.
- Evaluation stays separate from day-to-day chat, but shares auth/session and API-client infrastructure.

## Model-Aware Thinking Controls

- The model settings tab must not expose one generic reasoning control for every model.
- Backend discovery returns a per-model `thinking` capability object; the frontend maps it to one of three UI states: budget slider/presets, level segmented buttons, or unavailable.
- Saved presets and campaign snapshots carry normalized reasoning fields, which lets the campaign runner and legacy results analysis display the exact setting used.
- UX goal: users should know before launching a campaign whether a preset is using budget, level, dynamic budget, or no reasoning control, and they should be able to audit that choice from history/results later.
