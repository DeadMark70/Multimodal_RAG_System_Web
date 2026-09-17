# Evaluation Results And Traces

## User Outcomes

- Users can manage test cases and model presets.
- Users can launch evaluation campaigns and watch progress live.
- Users can inspect persisted result analysis after refresh.
- Users can open agent traces for supported campaign results.

## Acceptance Notes

- Evaluation campaigns should recover from backend snapshots after reconnect.
- Results analysis and agent traces must be separate views because they serve different operator questions.
- Campaign execution is preset-driven; the UI should not imply arbitrary unsaved model execution.
- Results analysis must remain readable on standard desktop widths by placing dense tables in horizontal scroll containers instead of allowing page overflow.
- Delta analysis should use a tabbed `Category / Difficulty / Question` view so operators can switch comparison dimensions without stacking multiple 12-column tables side by side.
- ECR note reasons should be discoverable via tooltip triggers, not rendered as always-visible full-width note columns in the main tables.
- Claim Evidence and Run Trace must preserve selected-run claim telemetry semantics: `empty` reports that extraction ran with zero claims; `not_instrumented` reports that claim extraction telemetry is absent.
- Retrieval Evidence must display provenance, availability status, and availability reasons within the matching chunk row, using the canonical retrieval chunk ID for row identity.
- The selected-run observability client contract must use canonical backend field names and preserve required, nullable, zero, and unknown values without compatibility aliases.
- Export Schema v2 validation must accept fields that the backend contract explicitly omits when not applicable, while continuing to reject unknown shapes. Rejections may expose bounded schema paths and validation codes for diagnosis, but must not echo question, answer, prompt, evidence, or trace values.

## Rerun Controls

- Header buttons must keep readable labels and wrap with the campaign selector on narrow screens.
- The job panel describes latest-job counts as work items, not question counts or accuracy, and places the technical job ID inside attempt history.
- The collapsed rerun form defaults to `補齊缺少的評分`: `scope=missing_only`, `stages=ragas`, preserving existing answers and scores.
- `重新評分（保留答案）` uses `stages=ragas` and `scope=selected` for explicit IDs or `scope=all` for blank IDs. Selected mode and metric filters remain in the request.
- `重新作答並評分` requires explicit question IDs, uses `scope=selected`, `stages=execution_and_ragas`, and sends an empty metric list for all enabled metrics. Its disabled metric selector and selection preview must show this same scope.
- Operation-specific guidance and a question/mode/metric summary appear before the submit button. Chinese separators and repeated question IDs are supported.

## Campaign Overview: Research Accounting

The Campaign Overview is a strict, read-only view of `GET /api/evaluation/campaigns/{campaign_id}/research-summary`. Its response is the version-2 research-summary contract, not a compatibility projection of legacy result analytics.

- The response separates official completed-run execution accounting from `evaluation_overhead`, which represents RAGAS evaluator batches. The UI must preserve this separation.
- Quality labels are official RAGAS observations only: answer correctness, faithfulness, and answer relevancy; optional context metrics appear only when requested. No heuristic, answer text, or legacy aggregate may be relabeled as an official quality score.
- The campaign carries independent quality, token-accounting, pricing, and phase-attribution statuses. Per-metric quality and per-token/phase status are also displayed where supplied. A partial or unavailable dimension must not be hidden by a completed campaign count.
- `null` measurements mean `N/A`; unknown price/cost means `Unknown`. The client must never convert missing token categories, cost, latency percentile, or quality values to zero.
- Latency mean/P50/P95 are backend measurements. P50/P95 use nearest-rank observed percentiles, and one-to-four latency samples are explicitly flagged as low sample size.
- Benchmark cost is official strict execution cost. Operational cost includes all associated execution calls. RAGAS overhead is separately priced evaluator work; it is not execution benchmark cost.
- Token output preserves the input, output-text, reasoning, and other categories, plus measured phase attribution. An explicit `by_phase.unclassified` subtotal is authoritative; when that key is absent, `Unclassified` is `0` only for complete phase attribution and otherwise `N/A`. The client must not derive a remainder or fold partial values into another phase/category. Historical evaluation-overhead retry counts can be unknown (`null`) and must remain unknown rather than becoming zero.
- A mode is eligible for the cost/quality comparison only when the backend marks it comparable and it has benchmark pricing plus correctness and faithfulness. Excluded modes remain visible with not-comparable/missing-data reasons.
- Legacy accounting is supported as a display condition only: `incomplete_legacy` warns that totals may be incomplete. The overview must not reconstruct legacy totals or imply schema-v2 completeness.

## Ablation Condition Metrics

- The Ablation tab consumes `AblationResponse.summaries.condition_comparison` when a campaign records at least two condition IDs. It is the only condition-level quality/token/latency view; Mode Comparison remains a mode-level view.
- Each condition row displays the persisted condition ID, label, flags, completed/failed run counts, and backend-provided finite means for answer correctness, faithfulness, answer relevancy, tokens, and latency.
- A compatible two-arm campaign also displays `Paired Delta (guided - baseline)`, matching `(question_id, repeat_number)` and showing completed-pair count, per-metric valid pairs, guided-minus-baseline deltas, and exclusion reasons for failed, unpaired, or missing-metric rows.
- Missing or non-finite measurements render as `N/A`; the client never treats them as zero or recomputes the paired statistics. Campaigns without condition comparison data retain the existing generic ablation display.
# Gemini cache and pricing (2026-09-17)

Overview reports Gemini server-side prompt cache, not answer reuse. Cached/input
ratio, request hit ratio and coverage are distinct; missing data is N/A. The
price panel shows evaluator model, price freshness and manual refresh. A server
price-file override is labelled explicitly. Setup controls apply only to scoring:
Flex, request timeout, attempts and opt-in Standard fallback. Campaigns retain
their saved settings and historical costs retain their price snapshot.
The execution/rerun panel displays current campaign answer and score totals from
the research summary. Latest-job counts are labelled separately so a 15-item
partial rerun does not appear to replace the campaign's complete score count.
An updating summary is explicitly labelled until fresh aggregates arrive.
