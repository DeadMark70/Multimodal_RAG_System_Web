import { useMemo } from 'react';
import { Box, Heading, Text, VStack } from '@chakra-ui/react';
import type { CampaignMetricRow, CampaignMode } from '../../types/evaluation';

type StabilityMetric = 'answer_correctness' | 'faithfulness' | 'total_tokens';

interface StabilityChartProps {
  rows: CampaignMetricRow[];
  metric: StabilityMetric;
}

interface BoxStats {
  mode: CampaignMode;
  min: number;
  q1: number;
  median: number;
  q3: number;
  max: number;
}

const MODE_COLORS: Record<CampaignMode, string> = {
  naive: '#2B6CB0',
  advanced: '#2F855A',
  graph: '#DD6B20',
  agentic: '#C53030',
};

const MODE_LABELS: Record<CampaignMode, string> = {
  naive: 'Naive',
  advanced: 'Advanced',
  graph: 'Graph',
  agentic: 'Agentic',
};

function percentile(sorted: number[], ratio: number): number {
  if (sorted.length === 0) {
    return 0;
  }
  const index = (sorted.length - 1) * ratio;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) {
    return sorted[lower];
  }
  const weight = index - lower;
  return sorted[lower] * (1 - weight) + sorted[upper] * weight;
}

function metricLabel(metric: StabilityMetric): string {
  switch (metric) {
    case 'answer_correctness':
      return 'Answer Correctness';
    case 'faithfulness':
      return 'Faithfulness';
    case 'total_tokens':
      return 'Total Tokens';
    default:
      return metric;
  }
}

export default function StabilityChart({ rows, metric }: StabilityChartProps) {
  const stats = useMemo(() => {
    const grouped = new Map<CampaignMode, number[]>();
    rows.forEach((row) => {
      const current = grouped.get(row.mode) ?? [];
      current.push(row[metric]);
      grouped.set(row.mode, current);
    });

    return Array.from(grouped.entries()).map(([mode, values]) => {
      const sorted = [...values].sort((left, right) => left - right);
      return {
        mode,
        min: sorted[0] ?? 0,
        q1: percentile(sorted, 0.25),
        median: percentile(sorted, 0.5),
        q3: percentile(sorted, 0.75),
        max: sorted[sorted.length - 1] ?? 0,
      } satisfies BoxStats;
    });
  }, [metric, rows]);

  const minValue = Math.min(...stats.map((entry) => entry.min), 0);
  const maxValue = Math.max(...stats.map((entry) => entry.max), 1);
  const range = Math.max(maxValue - minValue, 1);
  const chartHeight = 240;
  const chartWidth = 520;
  const leftPadding = 60;
  const rightPadding = 24;
  const topPadding = 20;
  const bottomPadding = 36;
  const innerWidth = chartWidth - leftPadding - rightPadding;
  const innerHeight = chartHeight - topPadding - bottomPadding;

  const yFor = (value: number) =>
    topPadding + ((maxValue - value) / range) * innerHeight;

  if (stats.length === 0) {
    return (
      <Box borderWidth="1px" borderRadius="lg" p={5}>
        <Heading size="md" mb={4}>穩定性分佈</Heading>
        <Text color="gray.500">沒有足夠資料可繪製 box plot。</Text>
      </Box>
    );
  }

  return (
    <Box borderWidth="1px" borderRadius="lg" p={5}>
      <Heading size="md" mb={4}>穩定性分佈：{metricLabel(metric)}</Heading>
      <VStack align="stretch" spacing={3}>
        <Box overflowX="auto">
          <svg width={chartWidth} height={chartHeight} role="img" aria-label={`${metricLabel(metric)} box plot`}>
            <line
              x1={leftPadding}
              y1={chartHeight - bottomPadding}
              x2={chartWidth - rightPadding}
              y2={chartHeight - bottomPadding}
              stroke="#CBD5E0"
            />
            {stats.map((entry, index) => {
              const x = leftPadding + ((index + 0.5) * innerWidth) / stats.length;
              const boxWidth = Math.min(44, innerWidth / Math.max(stats.length * 2, 2));
              const color = MODE_COLORS[entry.mode];
              return (
                <g key={entry.mode}>
                  <line x1={x} y1={yFor(entry.min)} x2={x} y2={yFor(entry.max)} stroke={color} strokeWidth="2" />
                  <line x1={x - 12} y1={yFor(entry.min)} x2={x + 12} y2={yFor(entry.min)} stroke={color} strokeWidth="2" />
                  <line x1={x - 12} y1={yFor(entry.max)} x2={x + 12} y2={yFor(entry.max)} stroke={color} strokeWidth="2" />
                  <rect
                    x={x - boxWidth / 2}
                    y={yFor(entry.q3)}
                    width={boxWidth}
                    height={Math.max(yFor(entry.q1) - yFor(entry.q3), 2)}
                    fill={color}
                    fillOpacity="0.18"
                    stroke={color}
                    strokeWidth="2"
                  />
                  <line
                    x1={x - boxWidth / 2}
                    y1={yFor(entry.median)}
                    x2={x + boxWidth / 2}
                    y2={yFor(entry.median)}
                    stroke={color}
                    strokeWidth="2"
                  />
                  <text
                    x={x}
                    y={chartHeight - 12}
                    textAnchor="middle"
                    fontSize="12"
                    fill="#4A5568"
                  >
                    {MODE_LABELS[entry.mode]}
                  </text>
                </g>
              );
            })}
          </svg>
        </Box>
        <Text color="gray.600" fontSize="sm">
          顯示每個 mode 的 min / Q1 / median / Q3 / max。
        </Text>
      </VStack>
    </Box>
  );
}

export type { StabilityChartProps };
