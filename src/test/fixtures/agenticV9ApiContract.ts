/**
 * Immutable pin for the backend contract consumed by the agentic-v9 UI.
 * Update this fixture only when the backend commit and generated OpenAPI hash
 * are intentionally advanced together.
 */
export const AGENTIC_V9_API_CONTRACT = {
  backend_commit: '782755693d371737069f260d1320d914e849c606',
  openapi_sha256: '7c9516ded44e516f6275a939e4b8f0a7836a880f7cf872aa38fc4fcfa2123486',
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
} as const;
