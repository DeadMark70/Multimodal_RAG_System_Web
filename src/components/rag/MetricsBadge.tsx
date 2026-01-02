import { Badge, Tooltip } from '@chakra-ui/react';
import type { EvaluationMetrics } from '../../types/rag';

interface MetricsBadgeProps {
  metrics: EvaluationMetrics | undefined;
}

export const MetricsBadge = ({ metrics }: MetricsBadgeProps) => {
  if (!metrics) return null;

  const colorScheme =
    metrics.faithfulness === 'grounded'
      ? 'success'
      : metrics.faithfulness === 'hallucinated'
      ? 'error'
      : 'warning';

  const label =
    metrics.faithfulness === 'grounded'
      ? 'Grounded'
      : metrics.faithfulness === 'hallucinated'
      ? 'Hallucination Risk'
      : 'Uncertain';

  return (
    <Tooltip label={`Confidence Score: ${metrics.confidence_score * 100}%`}>
      <Badge colorScheme={colorScheme} variant="solid" borderRadius="full" px={2}>
        {label}
      </Badge>
    </Tooltip>
  );
};
