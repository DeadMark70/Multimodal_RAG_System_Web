import { useMemo } from 'react';
import { Box, Heading, Text, VStack } from '@chakra-ui/react';
import type { CampaignMetricName, CampaignMetricRow, CampaignMode } from '../../types/evaluation';

type StabilityMetric = CampaignMetricName;

interface StabilityChartProps {
  rows: CampaignMetricRow[];
  metric: StabilityMetric;
}

interface BoxStats {
  mode: CampaignMode;
  values: number[];
  min: number;
  q1: number;
  mean: number;
  median: number;
  q3: number;
  max: number;
  stddev: number;
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

function average(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }
  return values.reduce((total, value) => total + value, 0) / values.length;
}

function sampleStddev(values: number[]): number {
  if (values.length <= 1) {
    return 0;
  }
  const mean = average(values);
  const variance =
    values.reduce((total, value) => total + (value - mean) ** 2, 0) / (values.length - 1);
  return Math.sqrt(variance);
}

function violinPath(
  values: number[],
  {
    x,
    maxHalfWidth,
    yFor,
  }: {
    x: number;
    maxHalfWidth: number;
    yFor: (value: number) => number;
  }
): string {
  if (values.length < 2) {
    return '';
  }

  const sorted = [...values].sort((left, right) => left - right);
  const min = sorted[0];
  const max = sorted[sorted.length - 1];

  if (min === max) {
    const y = yFor(min);
    return `M ${x - 4} ${y} L ${x + 4} ${y}`;
  }

  const bandwidth = Math.max((max - min) / 6, Number.EPSILON);
  const steps = 24;
  const points = Array.from({ length: steps + 1 }, (_, index) => {
    const value = min + ((max - min) * index) / steps;
    const density = sorted.reduce((total, sample) => {
      const normalized = (value - sample) / bandwidth;
      return total + Math.exp(-0.5 * normalized * normalized);
    }, 0);
    return { value, density };
  });

  const peakDensity = Math.max(...points.map((point) => point.density), Number.EPSILON);
  const left = points.map((point) => {
    const halfWidth = (point.density / peakDensity) * maxHalfWidth;
    return `${(x - halfWidth).toFixed(2)} ${yFor(point.value).toFixed(2)}`;
  });
  const right = [...points]
    .reverse()
    .map((point) => {
      const halfWidth = (point.density / peakDensity) * maxHalfWidth;
      return `${(x + halfWidth).toFixed(2)} ${yFor(point.value).toFixed(2)}`;
    });

  return `M ${left[0]} L ${left.slice(1).join(' L ')} L ${right.join(' L ')} Z`;
}

function metricLabel(metric: StabilityMetric): string {
  if (metric === 'total_tokens') {
    return 'Total Tokens';
  }
  return metric
    .split('_')
    .map((token) => token.charAt(0).toUpperCase() + token.slice(1))
    .join(' ');
}

function metricValue(row: CampaignMetricRow, metric: StabilityMetric): number {
  if (metric === 'total_tokens') {
    return row.total_tokens;
  }
  if (metric === 'faithfulness') {
    return row.faithfulness;
  }
  if (metric === 'answer_correctness') {
    return row.answer_correctness;
  }
  return row.metric_values[metric] ?? 0;
}

export default function StabilityChart({ rows, metric }: StabilityChartProps) {
  const stats = useMemo(() => {
    const grouped = new Map<CampaignMode, number[]>();
    rows.forEach((row) => {
      const value = metricValue(row, metric);
      const current = grouped.get(row.mode) ?? [];
      current.push(value);
      grouped.set(row.mode, current);
    });

    return Array.from(grouped.entries()).map(([mode, values]) => {
      const sorted = [...values].sort((left, right) => left - right);
      return {
        mode,
        values: sorted,
        min: sorted[0] ?? 0,
        q1: percentile(sorted, 0.25),
        mean: average(sorted),
        median: percentile(sorted, 0.5),
        q3: percentile(sorted, 0.75),
        max: sorted[sorted.length - 1] ?? 0,
        stddev: sampleStddev(sorted),
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

  const yFor = (value: number) => topPadding + ((maxValue - value) / range) * innerHeight;

  if (stats.length === 0) {
    return (
      <Box borderWidth="1px" borderRadius="lg" p={5}>
        <Heading size="md" mb={4}>穩定性分佈</Heading>
        <Text color="gray.500">沒有足夠資料可繪製 box / violin plot。</Text>
      </Box>
    );
  }

  return (
    <Box borderWidth="1px" borderRadius="lg" p={5}>
      <Heading size="md" mb={4}>穩定性分佈：{metricLabel(metric)}</Heading>
      <VStack align="stretch" spacing={3}>
        <Box overflowX="auto">
          <svg
            width={chartWidth}
            height={chartHeight}
            role="img"
            aria-label={`${metricLabel(metric)} box and violin plot`}
          >
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
              const violinWidth = Math.max(boxWidth, 28);
              const color = MODE_COLORS[entry.mode];
              return (
                <g key={entry.mode}>
                  <path
                    d={violinPath(entry.values, {
                      x,
                      maxHalfWidth: violinWidth,
                      yFor,
                    })}
                    fill={color}
                    fillOpacity="0.12"
                    stroke="none"
                  />
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
          顯示每個 mode 的 violin density 與 min / Q1 / median / Q3 / max。
        </Text>
        <VStack align="stretch" spacing={1}>
          {stats.map((entry) => (
            <Text key={entry.mode} color="gray.600" fontSize="sm">
              {MODE_LABELS[entry.mode]}: mean {entry.mean.toFixed(3)} / max {entry.max.toFixed(3)} / σ{' '}
              {entry.stddev.toFixed(3)}
            </Text>
          ))}
        </VStack>
      </VStack>
    </Box>
  );
}

export type { StabilityChartProps, StabilityMetric };
