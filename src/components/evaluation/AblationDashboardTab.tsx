import { useState } from 'react';
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
  ExportCampaignRequest,
  ExportCampaignResponse,
  HumanEvalQueueResponse,
  HumanVsAutoResponse,
} from '../../types/evaluation';
import MetricCard from './MetricCard';

interface AblationDashboardData {
  ablation?: AblationResponse;
  humanVsAuto?: HumanVsAutoResponse;
  humanQueue?: HumanEvalQueueResponse;
  errors?: CampaignErrorsResponse;
  exportPreview?: ExportCampaignResponse;
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
  return typeof value === 'number' && Number.isFinite(value) ? value.toLocaleString() : '0';
}

function conditionRows(data?: AblationResponse) {
  const summaries = asRecord(data?.summaries);
  const counts = asRecord(summaries.condition_counts);
  const labels = asRecord(summaries.condition_labels);
  return Object.entries(counts).map(([conditionId, count]) => ({
    conditionId,
    label: typeof labels[conditionId] === 'string' ? String(labels[conditionId]) : conditionId,
    sampleCount: typeof count === 'number' ? count : 0,
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

export default function AblationDashboardTab({ data }: { data?: AblationDashboardData }) {
  const [exportOptions, setExportOptions] = useState(defaultExportOptions);
  const ablationRows = conditionRows(data?.ablation);
  const humanSummaries = asRecord(data?.humanVsAuto?.summaries);
  const exportRedaction = asRecord(data?.exportPreview?.redaction);
  const exportRuns = Array.isArray(data?.exportPreview?.runs) ? data.exportPreview.runs.length : 0;
  const exportLlmCalls = Array.isArray(data?.exportPreview?.llm_calls) ? data.exportPreview.llm_calls.length : 0;
  const errorRows = data?.errors?.rows ?? [];
  const humanQueueRows = data?.humanQueue?.rows ?? [];

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
                    <Td isNumeric>{row.sampleCount.toLocaleString()}</Td>
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
            <Button size="sm" colorScheme="blue">
              Export redacted JSON
            </Button>
            <Badge colorScheme={exportRedaction.include_full_prompts ? 'orange' : 'green'}>
              full prompts {exportRedaction.include_full_prompts ? 'included' : 'redacted'}
            </Badge>
            <Text color="text.secondary">
              Preview: {exportRuns.toLocaleString()} runs, {exportLlmCalls.toLocaleString()} LLM calls
            </Text>
          </HStack>
        </Stack>
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
