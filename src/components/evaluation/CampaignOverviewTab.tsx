import { Alert, AlertIcon, Badge, Divider, Grid, GridItem, Heading, Stack, Text } from '@chakra-ui/react';
import type { CampaignResearchSummaryResponse, ResearchMetricObservation } from '../../types/evaluation';
import LatencyWaterfall from './LatencyWaterfall';
import MetricCard from './MetricCard';
import ModeComparisonChart from './ModeComparisonChart';
import TokenQualityTable from './TokenQualityTable';
import TokenBreakdownChart from './TokenBreakdownChart';

const percent = (value: number | null) => value == null ? 'N/A' : `${(value * 100).toFixed(1)}%`;
const number = (value: number | null) => value == null ? 'N/A' : value.toLocaleString();

function QualityCard({ label, observation }: { label: string; observation?: ResearchMetricObservation }) {
  if (!observation) return <MetricCard label={label} value="N/A" helper="No observation" />;
  return <MetricCard label={label} value={percent(observation.value)} helper={`${observation.status}: ${observation.valid_samples} valid, ${observation.missing_samples} missing, ${observation.failed_samples} failed`} />;
}

export default function CampaignOverviewTab({ data }: { data?: CampaignResearchSummaryResponse }) {
  if (!data) return <Text color="text.secondary">Select a campaign to view overview metrics.</Text>;

  return (
    <Stack spacing={5}>
      <Stack direction={{ base: 'column', md: 'row' }} spacing={2} aria-label="Research accounting statuses"><Badge>Quality: {data.quality_status}</Badge><Badge>Tokens: {data.token_accounting_status}</Badge><Badge>Phase attribution: {data.phase_attribution_status}</Badge></Stack>
      {data.token_accounting_status === 'incomplete_legacy' ? <Alert status="warning"><AlertIcon />Legacy accounting: token totals may be incomplete.</Alert> : null}
      {data.token_accounting_status === 'partial' ? <Alert status="warning"><AlertIcon />Token accounting is partial; token-derived comparisons are marked N/A when incomplete.</Alert> : null}
      {data.phase_attribution_status === 'partial' ? <Alert status="warning"><AlertIcon />Phase attribution is partial; phase breakdowns may be incomplete.</Alert> : null}
      <Grid templateColumns={{ base: 'repeat(2, 1fr)', xl: 'repeat(4, 1fr)' }} gap={3}>
        <MetricCard label="Completed Runs" value={`${data.completed_run_count} / ${data.total_run_count}`} />
        <MetricCard label="Failed Runs" value={data.failed_run_count.toLocaleString()} />
        <QualityCard label="Average Correctness" observation={data.quality.answer_correctness} />
        <QualityCard label="Average Faithfulness" observation={data.quality.faithfulness} />
        <QualityCard label="Average Relevancy" observation={data.quality.answer_relevancy} />
        <MetricCard label="Total Tokens" value={number(data.tokens.total_tokens)} helper={`Accounting: ${data.tokens.accounting_status}`} />
        <MetricCard label="Mean Latency" value={data.latency.mean_ms == null ? 'N/A' : `${data.latency.mean_ms.toLocaleString()} ms`} />
        <MetricCard label="Latency Samples" value={data.latency.sample_count.toLocaleString()} helper={data.latency.low_sample_size ? 'Low sample size' : data.latency.method} />
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
              Tokens vs Quality
            </Heading>
            <TokenQualityTable modes={data.modes} />
          </GridItem>
        </Grid>
        <Divider />
        <Grid templateColumns={{ base: '1fr', xl: '1fr 1fr' }} gap={5}>
          <GridItem>
            <Heading size="sm" mb={3}>
              Latency Waterfall
            </Heading>
            <LatencyWaterfall rows={data.modes} />
          </GridItem>
          <GridItem>
            <Heading size="sm" mb={3}>
              Token Breakdown
            </Heading>
            <TokenBreakdownChart rows={data.modes} evaluationOverhead={data.evaluation_overhead} />
          </GridItem>
        </Grid>
      </Stack>
    </Stack>
  );
}
