import { useEffect, useRef, useState } from 'react';
import {
  Badge,
  Box,
  Button,
  Checkbox,
  Grid,
  Heading,
  HStack,
  Stack,
  Table,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
} from '@chakra-ui/react';
import type {
  AblationResponse,
  CampaignErrorsResponse,
  CampaignStageWarningsResponse,
  ConditionAggregate,
  ConditionComparisonSummary,
  ConditionMetricName,
  ExportCampaignRequest,
  ExportCampaignResponse,
  HumanEvalQueueResponse,
  HumanVsAutoResponse,
} from '../../types/evaluation';
import { exportCampaignAnalysis } from '../../services/evaluationApi';
import MetricCard from './MetricCard';

interface AblationDashboardData {
  ablation?: AblationResponse;
  humanVsAuto?: HumanVsAutoResponse;
  humanQueue?: HumanEvalQueueResponse;
  errors?: CampaignErrorsResponse;
  stageWarnings?: CampaignStageWarningsResponse;
}

const defaultExportOptions: Required<ExportCampaignRequest> = {
  include_raw_trace_payloads: false,
  include_prompt_previews: true,
  include_full_prompts: false,
  include_answers: true,
  include_retrieved_excerpts: true,
  format: 'json',
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function formatNumber(value: unknown, digits = 2): string {
  return typeof value === 'number' && Number.isFinite(value) ? value.toFixed(digits) : 'n/a';
}

function formatCount(value: unknown): string {
  return typeof value === 'number' && Number.isFinite(value) ? value.toLocaleString() : 'N/A';
}

function summaryCount(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function exportAvailabilityWarnings(
  response: ExportCampaignResponse | undefined,
  fullPromptsRequested: boolean
): string[] {
  if (!response) {
    return [];
  }
  const warnings = new Set(response.availability_warnings ?? []);
  const fullPromptAvailability = response.summary?.full_prompt_availability ?? {};
  const missingAtExecution = fullPromptAvailability.not_captured_at_execution ?? 0;
  if (fullPromptsRequested && missingAtExecution > 0) {
    warnings.add('full_prompts_not_captured_at_execution');
  }
  return Array.from(warnings);
}

function availabilityText(label: string, availability: Record<string, number> | undefined): string {
  if (!availability) return `${label}: N/A`;
  const counts = Object.entries(availability).map(([status, count]) => `${status}: ${formatCount(count)}`);
  return `${label}: ${counts.length ? counts.join(' · ') : 'N/A'}`;
}

function conditionRows(data?: AblationResponse) {
  const summaries = asRecord(data?.summaries);
  const counts = asRecord(summaries.condition_counts);
  const labels = asRecord(summaries.condition_labels);
  return Object.entries(counts).map(([conditionId, count]) => ({
    conditionId,
    label: typeof labels[conditionId] === 'string' ? String(labels[conditionId]) : conditionId,
    sampleCount: typeof count === 'number' ? count : null,
  }));
}

const conditionMetricColumns: Array<{ key: ConditionMetricName; label: string }> = [
  { key: 'answer_correctness', label: 'Correctness' },
  { key: 'faithfulness', label: 'Faithfulness' },
  { key: 'answer_relevancy', label: 'Relevancy' },
];

function conditionComparison(data?: AblationResponse): ConditionComparisonSummary | undefined {
  const comparison = asRecord(data?.summaries?.condition_comparison);
  return Object.keys(comparison).length ? (comparison as unknown as ConditionComparisonSummary) : undefined;
}

function formatConditionMetric(value: number | null | undefined): string {
  return typeof value === 'number' && Number.isFinite(value) ? value.toFixed(2) : 'N/A';
}

function formatConditionFlags(flags: Record<string, unknown>): string {
  const entries = Object.entries(flags);
  return entries.length ? entries.map(([key, value]) => `${key}=${String(value)}`).join(', ') : 'none';
}

function conditionMetricValue(condition: ConditionAggregate, metric: ConditionMetricName): number | null {
  return condition.quality?.[metric]?.mean ?? null;
}

function ConditionMetricsSection({ comparison }: { comparison: ConditionComparisonSummary }) {
  const conditions = Object.values(comparison.conditions);
  const paired = comparison.paired;
  return (
    <Box mb={5}>
      <Heading size="sm" mb={3}>
        Condition Metrics
      </Heading>
      {comparison.availability.warning ? (
        <Text color="orange.600" fontSize="sm" mb={3}>
          {comparison.availability.warning}
        </Text>
      ) : null}
      <Box overflowX="auto">
        <Table size="sm">
          <Thead>
            <Tr>
              <Th>Condition</Th>
              <Th>Label</Th>
              <Th>Flags</Th>
              <Th isNumeric>Completed</Th>
              <Th isNumeric>Failed</Th>
              {conditionMetricColumns.map((column) => <Th key={column.key} isNumeric>{column.label}</Th>)}
              <Th isNumeric>Tokens</Th>
              <Th isNumeric>Latency ms</Th>
            </Tr>
          </Thead>
          <Tbody>
            {conditions.length ? conditions.map((condition) => (
              <Tr key={condition.condition_id}>
                <Td fontWeight="medium">{condition.condition_id}</Td>
                <Td>{condition.label}</Td>
                <Td>{formatConditionFlags(condition.ablation_flags ?? {})}</Td>
                <Td isNumeric>{formatCount(condition.completed_count)}</Td>
                <Td isNumeric>{formatCount(condition.failed_count)}</Td>
                {conditionMetricColumns.map((column) => (
                  <Td key={column.key} isNumeric>
                    {formatConditionMetric(conditionMetricValue(condition, column.key))}
                  </Td>
                ))}
                <Td isNumeric>{formatConditionMetric(condition.mean_tokens)}</Td>
                <Td isNumeric>{formatConditionMetric(condition.mean_latency_ms)}</Td>
              </Tr>
            )) : (
              <Tr>
                <Td colSpan={9}>No condition metrics recorded.</Td>
              </Tr>
            )}
          </Tbody>
        </Table>
      </Box>

      {paired ? (
        <Box mt={5}>
          <Heading size="sm" mb={3}>
            Paired Delta (guided - baseline)
          </Heading>
          <Text color="text.secondary" fontSize="sm" mb={3}>
            {paired.guided_condition_id} − {paired.baseline_condition_id}; completed pairs: {formatCount(paired.completed_pair_count)}
          </Text>
          <Box overflowX="auto">
            <Table size="sm">
              <Thead>
                <Tr>
                  <Th>Metric</Th>
                  <Th isNumeric>Delta</Th>
                  <Th isNumeric>Valid pairs</Th>
                  <Th isNumeric>Missing pairs</Th>
                </Tr>
              </Thead>
              <Tbody>
                {conditionMetricColumns.map((column) => {
                  const delta = paired.delta?.[column.key];
                  return (
                    <Tr key={column.key}>
                      <Td>{column.label}</Td>
                      <Td isNumeric>{formatConditionMetric(delta?.mean)}</Td>
                      <Td isNumeric>{formatCount(paired.metric_pair_counts?.[column.key])}</Td>
                      <Td isNumeric>{formatCount(delta?.missing_count)}</Td>
                    </Tr>
                  );
                })}
              </Tbody>
            </Table>
          </Box>
          {Object.entries(paired.excluded_pairs ?? {}).map(([reason, count]) => (
            <Text key={reason} color="text.secondary" fontSize="sm" mt={1}>
              {reason}: {formatCount(count)}
            </Text>
          ))}
        </Box>
      ) : null}
    </Box>
  );
}

function graphFamilyRows(data?: AblationResponse) {
  const summaries = asRecord(data?.summaries);
  const conditions = asRecord(summaries.conditions_by_ablation_family);
  const metrics = asRecord(summaries.graph_metrics_by_ablation_family);
  return Object.entries(conditions)
    .filter(([family]) => family.startsWith('graph_'))
    .map(([family, value]) => ({
      family,
      conditionCount: Object.keys(asRecord(value)).length,
      metrics: asRecord(metrics[family]),
    }));
}

function toggleOption(
  options: Required<ExportCampaignRequest>,
  key: keyof Omit<Required<ExportCampaignRequest>, 'format'>
): Required<ExportCampaignRequest> {
  return {
    ...options,
    [key]: !options[key],
  };
}

function downloadExport(campaignId: string, response: ExportCampaignResponse) {
  const blob = new Blob([JSON.stringify(response, null, 2)], { type: 'application/json' });
  const href = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = href;
  anchor.download = `${campaignId}-redacted.json`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(href);
}

interface AblationDashboardTabProps {
  campaignId?: string;
  data?: AblationDashboardData;
  onExportError?: (message: string) => void;
}

export default function AblationDashboardTab({
  campaignId,
  data,
  onExportError,
}: AblationDashboardTabProps) {
  const [exportOptions, setExportOptions] = useState(defaultExportOptions);
  const [exportPreview, setExportPreview] = useState<ExportCampaignResponse | undefined>();
  const [exporting, setExporting] = useState(false);
  const exportGenerationRef = useRef(0);
  const ablationRows = conditionRows(data?.ablation);
  const conditionMetrics = conditionComparison(data?.ablation);
  const graphFamilies = graphFamilyRows(data?.ablation);
  const humanSummaries = asRecord(data?.humanVsAuto?.summaries);
  const exportRedaction = asRecord(exportPreview?.redaction);
  const exportRuns = summaryCount(exportPreview?.summary?.run_count, Array.isArray(exportPreview?.runs) ? exportPreview.runs.length : 0);
  const exportLlmCalls = summaryCount(exportPreview?.summary?.llm_call_count, Array.isArray(exportPreview?.llm_calls) ? exportPreview.llm_calls.length : 0);
  const exportPhaseCounts = exportPreview?.summary?.per_phase_counts ?? {};
  const exportWarnings = exportAvailabilityWarnings(exportPreview, exportOptions.include_full_prompts);
  const errorRows = data?.errors?.rows ?? [];
  const stageWarningRows = data?.stageWarnings?.rows ?? [];
  const humanQueueRows = data?.humanQueue?.rows ?? [];

  useEffect(() => {
    exportGenerationRef.current += 1;
    setExportPreview(undefined);
    setExporting(false);
  }, [campaignId]);

  const handleExport = async () => {
    if (!campaignId || exporting) {
      return;
    }
    const exportGeneration = exportGenerationRef.current;
    setExporting(true);
    try {
      const response = await exportCampaignAnalysis(campaignId, exportOptions);
      if (exportGeneration !== exportGenerationRef.current) {
        return;
      }
      downloadExport(campaignId, response);
      setExportPreview(response);
    } catch (error) {
      if (exportGeneration === exportGenerationRef.current) {
        onExportError?.(error instanceof Error ? error.message : 'Failed to export campaign JSON.');
      }
    } finally {
      if (exportGeneration === exportGenerationRef.current) {
        setExporting(false);
      }
    }
  };

  if (!data) {
    return (
      <Text color="text.secondary">
        Ablation, human calibration, export, and debug surfaces will appear after selecting a campaign.
      </Text>
    );
  }

  return (
    <Stack spacing={5}>
      <Box>
        {conditionMetrics ? <ConditionMetricsSection comparison={conditionMetrics} /> : null}
        <Heading size="sm" mb={3}>
          Ablation Conditions
        </Heading>
        <Grid templateColumns={{ base: 'repeat(2, 1fr)', xl: 'repeat(4, 1fr)' }} gap={3} mb={4}>
          <MetricCard label="Samples" value={formatCount(data.ablation?.sample_count)} />
          <MetricCard label="Questions" value={formatCount(data.ablation?.independent_question_count)} />
          <MetricCard label="Repeats" value={formatCount(data.ablation?.repeat_count)} />
          <MetricCard label="Conditions" value={ablationRows.length.toLocaleString()} />
        </Grid>
        <Box overflowX="auto">
          <Table size="sm">
            <Thead>
              <Tr>
                <Th>Condition</Th>
                <Th>Label</Th>
                <Th isNumeric>Samples</Th>
              </Tr>
            </Thead>
            <Tbody>
              {ablationRows.length ? (
                ablationRows.map((row) => (
                  <Tr key={row.conditionId}>
                    <Td fontWeight="medium">{row.conditionId}</Td>
                    <Td>{row.label}</Td>
                    <Td isNumeric>{formatCount(row.sampleCount)}</Td>
                  </Tr>
                ))
              ) : (
                <Tr>
                  <Td colSpan={3}>No ablation conditions recorded.</Td>
                </Tr>
              )}
            </Tbody>
          </Table>
        </Box>
      </Box>

      <Box>
        <Heading size="sm" mb={3}>
          Graph Ablation Families
        </Heading>
        <Box overflowX="auto">
          <Table size="sm">
            <Thead>
              <Tr>
                <Th>Family</Th>
                <Th isNumeric>Conditions</Th>
                <Th isNumeric>Graph to Chunk</Th>
                <Th isNumeric>Context Noise</Th>
                <Th isNumeric>Unsupported Claims</Th>
              </Tr>
            </Thead>
            <Tbody>
              {graphFamilies.length ? (
                graphFamilies.map((row) => (
                  <Tr key={row.family}>
                    <Td fontWeight="medium">{row.family}</Td>
                    <Td isNumeric>{row.conditionCount.toLocaleString()}</Td>
                    <Td isNumeric>{formatNumber(row.metrics.graph_to_chunk_success_rate)}</Td>
                    <Td isNumeric>{formatNumber(row.metrics.graph_context_noise_ratio)}</Td>
                    <Td isNumeric>{formatNumber(row.metrics.unsupported_graph_claim_rate)}</Td>
                  </Tr>
                ))
              ) : (
                <Tr>
                  <Td colSpan={5}>No graph ablation families recorded.</Td>
                </Tr>
              )}
            </Tbody>
          </Table>
        </Box>
      </Box>

      <Box>
        <Heading size="sm" mb={3}>
          Human Calibration
        </Heading>
        <Grid templateColumns={{ base: 'repeat(2, 1fr)', xl: 'repeat(4, 1fr)' }} gap={3} mb={4}>
          <MetricCard label="Paired Samples" value={formatCount(data.humanVsAuto?.sample_count)} />
          <MetricCard label="Human Correctness" value={formatNumber(humanSummaries.human_correctness_mean)} />
          <MetricCard label="Human Faithfulness" value={formatNumber(humanSummaries.human_faithfulness_mean)} />
          <MetricCard label="Pearson R" value={formatNumber(humanSummaries.ragas_human_pearson_r)} />
        </Grid>
        <Box overflowX="auto">
          <Table size="sm">
            <Thead>
              <Tr>
                <Th>Run</Th>
                <Th>Question</Th>
                <Th>Mode</Th>
                <Th isNumeric>Ratings</Th>
                <Th>Current User</Th>
              </Tr>
            </Thead>
            <Tbody>
              {humanQueueRows.length ? (
                humanQueueRows.map((row) => (
                  <Tr key={row.run_id}>
                    <Td fontWeight="medium">{row.run_id}</Td>
                    <Td>{row.question_id}</Td>
                    <Td>{row.mode}</Td>
                    <Td isNumeric>{row.existing_rating_count}</Td>
                    <Td>
                      <Badge colorScheme={row.already_rated_by_current_user ? 'green' : 'gray'}>
                        {row.already_rated_by_current_user ? 'rated' : 'pending'}
                      </Badge>
                    </Td>
                  </Tr>
                ))
              ) : (
                <Tr>
                  <Td colSpan={5}>No human review queue rows.</Td>
                </Tr>
              )}
            </Tbody>
          </Table>
        </Box>
      </Box>

      <Box>
        <Heading size="sm" mb={3}>
          Export Controls
        </Heading>
        <Stack spacing={3}>
          <HStack wrap="wrap" gap={3}>
            {(
              [
                ['include_raw_trace_payloads', 'Raw trace payloads'],
                ['include_prompt_previews', 'Prompt previews'],
                ['include_full_prompts', 'Full prompts'],
                ['include_answers', 'Answers'],
                ['include_retrieved_excerpts', 'Retrieved excerpts'],
              ] as const
            ).map(([key, label]) => (
              <Checkbox
                key={key}
                isChecked={exportOptions[key]}
                onChange={() => setExportOptions((current) => toggleOption(current, key))}
              >
                {label}
              </Checkbox>
            ))}
          </HStack>
          <HStack wrap="wrap" gap={3}>
            <Button
              size="sm"
              colorScheme="blue"
              isLoading={exporting}
              isDisabled={!campaignId}
              onClick={() => void handleExport()}
            >
              Export redacted JSON
            </Button>
            {exportPreview ? (
              <Stack spacing={1} align="flex-start">
                <Badge colorScheme={exportRedaction.include_full_prompts ? 'orange' : 'green'}>
                  export option: full prompts {exportRedaction.include_full_prompts ? 'requested' : 'redacted'}
                </Badge>
                <Text color="text.secondary">
                  Preview: {exportRuns.toLocaleString()} runs, {exportLlmCalls.toLocaleString()} LLM calls
                </Text>
                {Object.entries(exportPhaseCounts).map(([phase, count]) => (
                  <Text key={phase} color="text.secondary" fontSize="sm">
                    {phase}: {formatCount(count)}
                  </Text>
                ))}
                <Text color="text.secondary" fontSize="sm">{availabilityText('Prompt hash availability', exportPreview.summary?.prompt_hash_availability)}</Text>
                <Text color="text.secondary" fontSize="sm">{availabilityText('Prompt preview availability', exportPreview.summary?.prompt_preview_availability)}</Text>
                <Text color="text.secondary" fontSize="sm">{availabilityText('Full prompt availability', exportPreview.summary?.full_prompt_availability)}</Text>
                {exportWarnings.map((warning) => (
                  <Text key={warning} color="orange.600" fontSize="sm">
                    {warning}
                  </Text>
                ))}
              </Stack>
            ) : (
              <Text color="text.secondary">Preview: not generated</Text>
            )}
          </HStack>
        </Stack>
      </Box>

      <Box>
        <Heading size="sm" mb={3}>
          Stage Warnings / Capability Gaps
        </Heading>
        <Box overflowX="auto">
          <Table size="sm">
            <Thead>
              <Tr>
                <Th>Run</Th>
                <Th>Question</Th>
                <Th>Mode</Th>
                <Th>Stage</Th>
                <Th>Status</Th>
                <Th>Failure reason</Th>
              </Tr>
            </Thead>
            <Tbody>
              {stageWarningRows.length ? (
                stageWarningRows.map((row) => (
                  <Tr key={`${row.run_id}-${row.stage_name}-${row.created_at}`}>
                    <Td fontWeight="medium">{row.run_id}</Td>
                    <Td>{row.question_id}</Td>
                    <Td>{row.mode}</Td>
                    <Td>{row.stage_name}</Td>
                    <Td>
                      <Badge colorScheme={row.status === 'partial' ? 'yellow' : 'orange'}>
                        {row.status}
                      </Badge>
                    </Td>
                    <Td>{row.failure_reason}</Td>
                  </Tr>
                ))
              ) : (
                <Tr>
                  <Td colSpan={6}>No stage warnings or capability gaps.</Td>
                </Tr>
              )}
            </Tbody>
          </Table>
        </Box>
      </Box>

      <Box>
        <Heading size="sm" mb={3}>
          Sanitized Errors
        </Heading>
        <Box overflowX="auto">
          <Table size="sm">
            <Thead>
              <Tr>
                <Th>Run</Th>
                <Th>Stage</Th>
                <Th>Source</Th>
                <Th>Message</Th>
              </Tr>
            </Thead>
            <Tbody>
              {errorRows.length ? (
                errorRows.map((row) => (
                  <Tr key={`${row.run_id}-${row.stage_name}-${row.created_at}`}>
                    <Td fontWeight="medium">{row.run_id}</Td>
                    <Td>{row.stage_name}</Td>
                    <Td>{row.source}</Td>
                    <Td>{row.message}</Td>
                  </Tr>
                ))
              ) : (
                <Tr>
                  <Td colSpan={4}>No sanitized errors.</Td>
                </Tr>
              )}
            </Tbody>
          </Table>
        </Box>
      </Box>
    </Stack>
  );
}
