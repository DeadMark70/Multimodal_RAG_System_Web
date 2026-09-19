import { Alert, AlertIcon, Badge, Box, Divider, Grid, Heading, Stack, Table, Tbody, Td, Text, Th, Thead, Tr } from '@chakra-ui/react';
import type { CampaignConfigInput, CampaignResearchSummaryResponse, ReleaseMetric, ReleaseMetricsReport } from '../../types/evaluation';
import LatencyWaterfall from './LatencyWaterfall';
import MetricCard from './MetricCard';
import ModeComparisonChart from './ModeComparisonChart';
import ModeCostComparison from './ModeCostComparison';
import TokenQualityTable from './TokenQualityTable';
import TokenBreakdownChart, { ScoringCost } from './TokenBreakdownChart';
import EvaluationPricingPanel from './EvaluationPricingPanel';

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

export default function CampaignOverviewTab({
  data,
  config,
  releaseMetrics,
  releaseMetricsNotApplicable = false,
}: {
  data?: CampaignResearchSummaryResponse;
  config?: Pick<CampaignConfigInput, 'test_case_ids' | 'modes' | 'repeat_count'>;
  releaseMetrics?: ReleaseMetricsReport;
  releaseMetricsNotApplicable?: boolean;
}) {
  if (!data) return <Text color="text.secondary">Select a campaign to view overview metrics.</Text>;
  const releaseMetricsAreNotApplicable = releaseMetricsNotApplicable || releaseMetrics?.availability === 'not_applicable';

  return (
    <Stack spacing={5}>
      {data.analysis_status === 'updating' ? <Alert status="info"><AlertIcon />統計更新中，目前顯示上一版摘要。</Alert> : null}
      {data.token_accounting_status !== 'complete' ? <Alert status="warning"><AlertIcon />作答 Token 用量不完整；缺少資料的比較仍顯示 N/A。</Alert> : null}
      <Box>
        <Heading size="sm" mb={3}>模式比較</Heading>
        <Text fontSize="sm" mb={2}>
          {config ? `設定：${new Set(config.test_case_ids).size} 題 · ${new Set(config.modes).size} 種模式 · 每題每個條件 ${config.repeat_count} 次。` : '原始題數與重複次數設定未載入。'}
          {` 完成答案：${number(data.completed_run_count)} / ${number(data.total_run_count)} 份`}
        </Text>
        <ModeComparisonChart rows={data.modes} />
        <Text fontSize="xs" color="text.secondary" mt={2}>各模式彙整目前保留的答案，跨題目、重複次數與實驗條件計算平均；有效評分數依指標列出。品質越高越好；時間與費用為每份完成答案的平均值。N/A 表示尚無完整資料。</Text>
        <Text fontSize="xs" color="text.secondary" mt={1}>完成答案數包含重複執行；失敗重試與補評分不增加設定的重複次數。重新作答會更新保留答案，歷次費用另列於累計費用。</Text>
      </Box>
      <Divider />
      <ModeCostComparison rows={data.mode_costs ?? data.modes.map((row) => ({
        mode: row.mode, completed_run_count: row.sample_count, execution_cost: row.execution_cost,
      }))} />
      <Box borderWidth="1px" borderRadius="md" p={4}>
        <Heading size="sm" mb={2}>評分成本（RAGAS）</Heading>
        <ScoringCost overhead={data.evaluation_overhead} />
      </Box>
      <Box as="details" borderWidth="1px" borderRadius="md" p={4}>
        <Box as="summary" cursor="pointer" fontWeight="semibold">用量、快取與時間明細</Box>
        <Stack spacing={5} mt={4}>
          <Stack direction={{ base: 'column', md: 'row' }} spacing={2} aria-label="Research accounting statuses"><Badge>評分：{data.quality_status}</Badge><Badge>Token 用量：{data.token_accounting_status}</Badge><Badge>階段分類：{data.phase_attribution_status}</Badge></Stack>
          {data.phase_attribution_status === 'partial' ? <Text fontSize="sm" color="text.secondary">部分 Token 尚未分類到作答階段；總用量完整的模式仍可比較。</Text> : null}
          <Text fontSize="sm">作答完成：{data.completed_run_count} / {data.total_run_count} · 作答失敗：{data.failed_run_count} · 總 Token：{number(data.tokens.total_tokens)}</Text>
          <Box><Heading size="sm" mb={3}>Token 與品質</Heading><TokenQualityTable modes={data.modes} /></Box>
          <Box><Heading size="sm" mb={3}>作答時間分布</Heading><LatencyWaterfall rows={data.modes} /></Box>
          <Box><Heading size="sm" mb={3}>Token 與 Gemini 快取明細</Heading><TokenBreakdownChart rows={data.modes} evaluationOverhead={data.evaluation_overhead} showScoringCost={false} /></Box>
          <EvaluationPricingPanel />
        </Stack>
      </Box>
      <Box as="details" borderWidth="1px" borderRadius="md" p={4}>
        <Box as="summary" cursor="pointer" fontWeight="semibold">基準測試指標</Box>
        <Box mt={4}>{releaseMetricsAreNotApplicable ? <Text color="text.secondary">Release Metrics 不適用：尚未設定 benchmark。</Text> : <ReleaseMetricsPanel report={releaseMetrics} />}</Box>
      </Box>
      {data.analysis_updated_at ? <Text fontSize="xs" color="text.secondary">摘要更新時間：{new Date(data.analysis_updated_at).toLocaleString()}</Text> : null}
    </Stack>
  );
}
