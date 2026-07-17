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

## Campaign Overview: Research Accounting

The Campaign Overview is a strict, read-only view of `GET /api/evaluation/campaigns/{campaign_id}/research-summary`. Its response is the version-2 research-summary contract, not a compatibility projection of legacy result analytics.

- The response separates official completed-run execution accounting from `evaluation_overhead`, which represents RAGAS evaluator batches. The UI must preserve this separation.
- Quality labels are official RAGAS observations only: answer correctness, faithfulness, and answer relevancy; optional context metrics appear only when requested. No heuristic, answer text, or legacy aggregate may be relabeled as an official quality score.
- The campaign carries independent quality, token-accounting, pricing, and phase-attribution statuses. Per-metric quality and per-token/phase status are also displayed where supplied. A partial or unavailable dimension must not be hidden by a completed campaign count.
- `null` measurements mean `N/A`; unknown price/cost means `Unknown`. The client must never convert missing token categories, cost, latency percentile, or quality values to zero.
- Latency mean/P50/P95 are backend measurements. P50/P95 use nearest-rank observed percentiles, and one-to-four latency samples are explicitly flagged as low sample size.
- Benchmark cost is official strict execution cost. Operational cost includes all associated execution calls. RAGAS overhead is separately priced evaluator work; it is not execution benchmark cost.
- Token output preserves the input, output-text, reasoning, and other categories, plus phase attribution. The `Unclassified` remainder is visible rather than folded into another phase/category.
- A mode is eligible for the cost/quality comparison only when the backend marks it comparable and it has benchmark pricing plus correctness and faithfulness. Excluded modes remain visible with not-comparable/missing-data reasons.
- Legacy accounting is supported as a display condition only: `incomplete_legacy` warns that totals may be incomplete. The overview must not reconstruct legacy totals or imply schema-v2 completeness.
