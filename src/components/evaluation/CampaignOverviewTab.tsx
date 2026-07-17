import { Divider, Grid, GridItem, Heading, Stack, Text } from '@chakra-ui/react';
import CostQualityScatter, { type CostQualityPoint } from './CostQualityScatter';
import LatencyWaterfall, { type LatencyStage } from './LatencyWaterfall';
import MetricCard from './MetricCard';
import ModeComparisonChart, { type ModeComparisonRow } from './ModeComparisonChart';
import TokenBreakdownChart, { type TokenBreakdownRow } from './TokenBreakdownChart';

interface CampaignOverviewSummary {
  completedRuns: number;
  totalRuns: number;
  avgCorrectness: number | null | undefined;
  avgFaithfulness: number | null | undefined;
  avgRelevancy: number | null | undefined;
  avgTokens: number | null;
  avgCostUsd: number | null;
  avgLatencyMs: number | null;
  failedRuns?: number;
  errorRate?: number;
}

interface CampaignOverviewData {
  summary: CampaignOverviewSummary;
  modes?: ModeComparisonRow[];
  costQuality?: CostQualityPoint[];
  latency?: LatencyStage[];
  tokens?: TokenBreakdownRow[];
}

const formatPercent = (value: number | null | undefined) => value == null ? '—' : `${(value * 100).toFixed(1)}%`;
const formatNumber = (value: number | null) => value == null ? '—' : value.toLocaleString();
const formatCost = (value: number | null) => value == null ? '—' : `$${value.toFixed(2)}`;

export default function CampaignOverviewTab({ data }: { data?: CampaignOverviewData }) {
  if (!data) {
    return <Text color="text.secondary">Select a campaign to view overview metrics.</Text>;
  }

  const { summary } = data;

  return (
    <Stack spacing={5}>
      <Grid templateColumns={{ base: 'repeat(2, 1fr)', xl: 'repeat(4, 1fr)' }} gap={3}>
        <MetricCard label="Completed Runs" value={`${summary.completedRuns} / ${summary.totalRuns}`} />
        <MetricCard label="Average Correctness" value={formatPercent(summary.avgCorrectness)} />
        <MetricCard label="Average Faithfulness" value={formatPercent(summary.avgFaithfulness)} />
        <MetricCard label="Average Relevancy" value={formatPercent(summary.avgRelevancy)} />
        <MetricCard label="Total Tokens" value={formatNumber(summary.avgTokens)} />
        <MetricCard label="Benchmark Cost" value={formatCost(summary.avgCostUsd)} />
        <MetricCard label="Mean Latency" value={summary.avgLatencyMs == null ? '—' : `${summary.avgLatencyMs.toLocaleString()} ms`} />
        <MetricCard label="Failed Runs" value={summary.failedRuns == null ? '—' : `${summary.failedRuns}`} />
      </Grid>

      <Stack spacing={4}>
        <Grid templateColumns={{ base: '1fr', xl: '1.2fr 1fr' }} gap={5}>
          <GridItem>
            <Heading size="sm" mb={3}>
              Mode Comparison
            </Heading>
            <ModeComparisonChart rows={data.modes} />
          </GridItem>
          <GridItem>
            <Heading size="sm" mb={3}>
              Cost vs Quality
            </Heading>
            <CostQualityScatter points={data.costQuality} />
          </GridItem>
        </Grid>
        <Divider />
        <Grid templateColumns={{ base: '1fr', xl: '1fr 1fr' }} gap={5}>
          <GridItem>
            <Heading size="sm" mb={3}>
              Latency Waterfall
            </Heading>
            <LatencyWaterfall stages={data.latency} />
          </GridItem>
          <GridItem>
            <Heading size="sm" mb={3}>
              Token Breakdown
            </Heading>
            <TokenBreakdownChart rows={data.tokens} />
          </GridItem>
        </Grid>
      </Stack>
    </Stack>
  );
}
