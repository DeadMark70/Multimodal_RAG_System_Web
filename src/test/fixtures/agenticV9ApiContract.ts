/**
 * Immutable pin for the backend contract consumed by the agentic-v9 UI.
 * Update this fixture only when the backend commit and generated OpenAPI hash
 * are intentionally advanced together.
 */
export const AGENTIC_V9_API_CONTRACT = {
  backend_commit: 'a77ec66fbe2c834236486f5029a43b927600d145',
  openapi_sha256: '28821c9601e0f281312f0a9923d971c9457fde6ebf223e012840d1edd2d3a62b',
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
