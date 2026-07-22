import { Alert, AlertIcon, Badge, Divider, Grid, GridItem, Heading, Stack, Table, Tbody, Td, Text, Th, Thead, Tr } from '@chakra-ui/react';
import type { CampaignResearchSummaryResponse, ReleaseMetric, ReleaseMetricsReport, ResearchMetricObservation } from '../../types/evaluation';
import LatencyWaterfall from './LatencyWaterfall';
import MetricCard from './MetricCard';
import ModeComparisonChart from './ModeComparisonChart';
import TokenQualityTable from './TokenQualityTable';
import TokenBreakdownChart from './TokenBreakdownChart';

const percent = (value: number | null) => value == null ? 'N/A' : `${(value * 100).toFixed(1)}%`;
const number = (value: number | null) => value == null ? 'N/A' : value.toLocaleString();

function releaseMetric(metric: ReleaseMetric | undefined, options?: { percent?: boolean; suffix?: string }) {
  if (!metric || metric.value == null) {
    return metric?.reason ? `N/A — ${metric.reason}` : 'N/A';
  }
  if (options?.percent) return `${(metric.value * 100).toFixed(1)}%`;
  const value = metric.value.toLocaleString();
  return options?.suffix ? `${value} ${options.suffix}` : value;
}

function ReleaseMetricCard({ label, metric, percent: asPercent, suffix }: {
  label: string;
  metric: ReleaseMetric;
  percent?: boolean;
  suffix?: string;
}) {
  return <MetricCard label={label} value={releaseMetric(metric, { percent: asPercent, suffix })} />;
}

function ReleaseDeltaTable({
  heading,
  rows,
}: {
  heading: string;
  rows: Record<string, ReleaseMetric>;
}) {
  const entries = Object.entries(rows);
  if (entries.length === 0) return null;
  return (
    <Stack spacing={1}>
      <Heading size="xs">{heading}</Heading>
      <Table size="sm" variant="simple">
        <Thead><Tr><Th>Group</Th><Th isNumeric>Paired quality delta</Th></Tr></Thead>
        <Tbody>
          {entries.map(([name, metric]) => (
            <Tr key={name}>
              <Td>{name}</Td>
              <Td isNumeric>{releaseMetric(metric)}</Td>
            </Tr>
          ))}
        </Tbody>
      </Table>
    </Stack>
  );
}

function ReleaseMetricsPanel({ report }: { report?: ReleaseMetricsReport }) {
  if (!report) return null;
  const benchmarkLabel = report.benchmark_kind === 'smoke'
    ? 'Smoke'
    : report.benchmark_kind === 'formal'
      ? 'Formal'
      : 'Insufficient';
  const ci = report.paired_quality_ci_lower.value == null || report.paired_quality_ci_upper.value == null
    ? 'N/A'
    : `[${report.paired_quality_ci_lower.value.toFixed(3)}, ${report.paired_quality_ci_upper.value.toFixed(3)}]`;

  return (
    <Stack spacing={3} aria-label="Authoritative release metrics">
      <Heading size="sm">Release Metrics</Heading>
      <Stack direction={{ base: 'column', md: 'row' }} spacing={2}>
        <Badge colorScheme={benchmarkLabel === 'Formal' ? 'green' : benchmarkLabel === 'Smoke' ? 'blue' : 'orange'}>{benchmarkLabel}</Badge>
        <Badge colorScheme={report.comparable ? 'green' : 'orange'}>Comparable: {report.comparable ? 'yes' : 'no'}</Badge>
        <Text fontSize="sm" color="text.secondary">Benchmark: {report.benchmark_id}</Text>
      </Stack>
      {report.gate_reasons.length > 0 ? <Alert status="warning"><AlertIcon />Release gates blocked: {report.gate_reasons.join(', ')}</Alert> : null}
      <Grid templateColumns={{ base: 'repeat(2, 1fr)', xl: 'repeat(4, 1fr)' }} gap={3}>
        <ReleaseMetricCard label="Required-slot coverage" metric={report.required_slot_coverage} percent />
        <ReleaseMetricCard label="Important unsupported claims" metric={report.important_unsupported_claim_rate} percent />
        <ReleaseMetricCard label="Provenance failures" metric={report.provenance_failure_rate} percent />
        <ReleaseMetricCard label="Pack efficiency" metric={report.pack_efficiency} percent />
        <ReleaseMetricCard label="Graph locator success" metric={report.graph_locator_success} />
        <ReleaseMetricCard label="Graph locator fallback" metric={report.graph_locator_fallback} />
        <ReleaseMetricCard label="Final generations" metric={report.final_generation_count} />
        <ReleaseMetricCard label="P95 latency" metric={report.latency_p95_ms} suffix="ms" />
        <ReleaseMetricCard label="Official v9 / naive tokens" metric={report.token_ratio} suffix="×" />
        <ReleaseMetricCard label="Paired quality delta" metric={report.paired_quality_delta} />
        <MetricCard label="Paired quality CI" value={ci} />
      </Grid>
      <Text fontSize="sm" color="text.secondary">
        Paired confidence intervals are clustered by question; official token ratio is the ratio of summed official runtime tokens.
      </Text>
      <ReleaseDeltaTable heading="Category quality deltas" rows={report.category_quality_deltas} />
      <ReleaseDeltaTable heading="Per-question quality deltas" rows={report.per_question_quality_deltas} />
      <Heading size="xs">Benchmark arms</Heading>
      <Table size="sm" variant="simple">
        <Thead><Tr><Th>Arm</Th><Th>Runs</Th><Th>Status counts</Th><Th>Accounting complete</Th></Tr></Thead>
        <Tbody>
          {report.arms.map((arm) => (
            <Tr key={`${arm.mode}:${arm.condition_id}:${arm.execution_profile}`}>
              <Td>{[arm.mode, arm.condition_id, arm.execution_profile, arm.agentic_execution_version].filter(Boolean).join(' · ')}{arm.shadow_evaluation_policy ? ` · shadow:${arm.shadow_evaluation_policy}` : ''}</Td>
              <Td>{arm.complete_run_count} / {arm.run_count}</Td>
              <Td>{Object.entries(arm.response_status_counts).map(([status, count]) => `${status}: ${count}`).join(', ') || 'N/A'}</Td>
              <Td>{arm.accounting_complete_run_count} / {arm.run_count}</Td>
            </Tr>
          ))}
        </Tbody>
      </Table>
    </Stack>
  );
}

function QualityCard({ label, observation }: { label: string; observation?: ResearchMetricObservation }) {
  if (!observation) return <MetricCard label={label} value="N/A" helper="No observation" />;
  return <MetricCard label={label} value={percent(observation.value)} helper={`${observation.status}: ${observation.valid_samples} valid, ${observation.missing_samples} missing, ${observation.failed_samples} failed`} />;
}

export default function CampaignOverviewTab({ data, releaseMetrics }: { data?: CampaignResearchSummaryResponse; releaseMetrics?: ReleaseMetricsReport }) {
  if (!data) return <Text color="text.secondary">Select a campaign to view overview metrics.</Text>;

  return (
    <Stack spacing={5}>
      <Stack direction={{ base: 'column', md: 'row' }} spacing={2} aria-label="Research accounting statuses"><Badge>Quality: {data.quality_status}</Badge><Badge>Tokens: {data.token_accounting_status}</Badge><Badge>Phase attribution: {data.phase_attribution_status}</Badge></Stack>
      {data.token_accounting_status === 'incomplete_legacy' ? <Alert status="warning"><AlertIcon />Legacy accounting: token totals may be incomplete.</Alert> : null}
      {data.token_accounting_status === 'partial' ? <Alert status="warning"><AlertIcon />Token accounting is partial; token-derived comparisons are marked N/A when incomplete.</Alert> : null}
      {data.phase_attribution_status === 'partial' ? <Alert status="warning"><AlertIcon />Phase attribution is partial; phase breakdowns may be incomplete.</Alert> : null}
      <ReleaseMetricsPanel report={releaseMetrics} />
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
