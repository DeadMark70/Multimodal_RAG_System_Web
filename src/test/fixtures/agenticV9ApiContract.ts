/**
 * Immutable pin for the backend contract consumed by the agentic-v9 UI.
 * Update this fixture only when the backend commit and generated OpenAPI hash
 * are intentionally advanced together.
 */
export const AGENTIC_V9_API_CONTRACT = {
  backend_commit: 'fa064545a06bf3915eb5ac77c57a7a7b30203c17',
  openapi_sha256: '231f287c6a3ffb3075158ee735897a4ed68d42e24e3abb97fd52efb09bac5548',
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
