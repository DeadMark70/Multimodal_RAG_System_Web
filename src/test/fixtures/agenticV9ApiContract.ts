/**
 * Immutable pin for the backend contract consumed by the agentic-v9 UI.
 * Update this fixture only when the backend commit and generated OpenAPI hash
 * are intentionally advanced together.
 */
export const AGENTIC_V9_API_CONTRACT = {
  backend_commit: '710a30379d74fea53b8602860926f6cab047419d',
  openapi_sha256: '1da4a8bc4a409e5a33b4cb3dd542fd143ab6f8dde3b0946e9e2c4ae640060e82',
  frontend_baseline_commit: '1ab15449af756886039614fab6b6cc64781d1d23',
  control_plane_fields: {
    campaign_config: ['agentic_execution_version', 'shadow_evaluation_policy'],
    campaign_result: [
      'condition_id',
      'agentic_execution_version',
      'execution_identity',
      'shadow_evaluation_policy',
      'response_status',
    ],
  },
  release_metrics: {
    path: '/api/evaluation/campaigns/{campaign_id}/release-metrics',
    response_schema: 'ReleaseMetricsReport',
    required_fields: [
      'benchmark_id',
      'benchmark_kind',
      'comparable',
      'gate_reasons',
      'category_quality_deltas',
      'per_question_quality_deltas',
    ],
  },
} as const;
