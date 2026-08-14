/**
 * Immutable semantic hash for the backend contract consumed by the agentic-v9 UI.
 * Update this fixture only when the generated OpenAPI contract changes.
 */
export const AGENTIC_V9_API_CONTRACT = {
  openapi_sha256: 'a0af135a0c5d65fda0c0e37067b0a6ed692a0d4473377df933b20ebb0809d58a',
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
