import {
  Badge,
  Box,
  Button,
  Code,
  Heading,
  HStack,
  SimpleGrid,
  Stack,
  Text,
} from '@chakra-ui/react';
import { useState } from 'react';
import type { AgenticV9RunEvidence } from '../../pages/EvaluationCenter.mappers';
import { formatOptionalText, formatOptionalTokens } from './evaluationDisplay';

const PREVIEW_LIMIT = 8;

function formatCount(value: readonly unknown[] | undefined): string {
  return value === undefined ? 'N/A' : String(value.length);
}

function PreviewList({ values, empty = 'None recorded' }: { values: string[] | undefined; empty?: string }) {
  if (values === undefined) return <Text fontSize="sm">N/A</Text>;
  if (!values.length) return <Text fontSize="sm">{empty}</Text>;
  const visible = values.slice(0, PREVIEW_LIMIT);
  return (
    <Stack spacing={1}>
      {visible.map((value) => <Code key={value} whiteSpace="pre-wrap">{value}</Code>)}
      {values.length > PREVIEW_LIMIT ? <Text fontSize="xs">+{values.length - PREVIEW_LIMIT} more</Text> : null}
    </Stack>
  );
}

function TraceSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Box borderWidth="1px" borderRadius="md" p={3}>
      <Heading size="xs" mb={2}>{title}</Heading>
      {children}
    </Box>
  );
}

function MetricLine({ label, value }: { label: string; value: string }) {
  return <Text fontSize="sm">{label}: {value}</Text>;
}

function terminationStatus(events?: Array<{ status: string; stageName: string }>): string {
  const lifecycle = (events ?? []).map((event) => `${event.status} ${event.stageName}`.toLowerCase());
  if (lifecycle.some((value) => value.includes('cancel'))) return 'Cancelled';
  if (lifecycle.some((value) => value.includes('timeout') || value.includes('timed out'))) return 'Timed out';
  return 'N/A';
}

function RawV9Disclosure({ data }: { data: AgenticV9RunEvidence }) {
  const [open, setOpen] = useState(false);
  return (
    <Stack spacing={2}>
      <Button size="xs" variant="outline" alignSelf="start" onClick={() => setOpen((current) => !current)}>
        {open ? 'Hide raw v9 trace' : 'Show raw v9 trace'}
      </Button>
      {open ? (
        <Code display="block" whiteSpace="pre-wrap" overflowX="auto" p={2} borderRadius="md">
          {JSON.stringify(data, null, 2)}
        </Code>
      ) : null}
    </Stack>
  );
}

/**
 * Compact v9 execution presentation. Packet/claim/source explorers remain in F3;
 * this component only provides trace-level summaries and links/counts.
 */
export default function AgenticV9Trace({
  data,
  traceEvents,
  finalAnswerPreview,
}: {
  data: AgenticV9RunEvidence;
  traceEvents?: Array<{ status: string; stageName: string }>;
  finalAnswerPreview?: string;
}) {
  const contract = data.queryContract;
  const scope = contract?.resolved_source_scope;
  const slots = contract?.required_slots;
  const resolutionsBySlot = new Map(data.slotResolutions?.map((item) => [item.slot_id, item.resolution]));
  const repairTaskCount = data.repairs === undefined
    ? 'N/A'
    : String(data.repairs.reduce((count, repair) => count + (repair.tasks?.length ?? 0), 0));
  const finalClaimCount = formatCount(data.finalClaims);
  const contextPack = data.contextPack;
  const metrics = data.metrics;

  return (
    <Stack spacing={3} data-testid="agentic-v9-trace">
      <HStack justify="space-between" align="start">
        <Heading size="sm">Evidence-first execution trace</Heading>
        <Badge colorScheme="purple">v9 schema {formatOptionalText(data.schemaVersion)}</Badge>
      </HStack>

      <SimpleGrid columns={{ base: 1, xl: 2 }} spacing={3}>
        <TraceSection title="Contract & route">
          <Stack spacing={1}>
            <MetricLine label="Route" value={formatOptionalText(contract?.route)} />
            <MetricLine label="Intent" value={formatOptionalText(contract?.intent)} />
            <MetricLine label="Graph policy" value={formatOptionalText(contract?.graph_policy)} />
            <MetricLine label="Max retrieval rounds" value={contract?.max_retrieval_rounds == null ? 'N/A' : String(contract.max_retrieval_rounds)} />
            <MetricLine label="Max repair rounds" value={contract?.max_repair_rounds == null ? 'N/A' : String(contract.max_repair_rounds)} />
          </Stack>
        </TraceSection>

        <TraceSection title="Authorized source scope">
          <PreviewList values={scope?.authorized_doc_ids} empty="No authorized documents" />
        </TraceSection>

        <TraceSection title="Required slots">
          {slots === undefined ? <Text fontSize="sm">N/A</Text> : slots.length ? (
            <Stack spacing={1}>
              {slots.slice(0, PREVIEW_LIMIT).map((slot) => {
                const resolution = resolutionsBySlot.get(slot.slot_id);
                return (
                  <Text fontSize="sm" key={slot.slot_id}>
                    {slot.slot_id} — {slot.description} · {resolution?.status ?? 'N/A'}
                  </Text>
                );
              })}
              {slots.length > PREVIEW_LIMIT ? <Text fontSize="xs">+{slots.length - PREVIEW_LIMIT} more</Text> : null}
            </Stack>
          ) : <Text fontSize="sm">No required slots</Text>}
        </TraceSection>

        <TraceSection title="Retrieval & repair">
          <Stack spacing={1}>
            <MetricLine label="Repair rounds" value={formatCount(data.repairs)} />
            <MetricLine label="Repair tasks" value={repairTaskCount} />
            <MetricLine label="Retrieval queries" value={metrics?.retrieval_query_count == null ? 'N/A' : String(metrics.retrieval_query_count)} />
          </Stack>
        </TraceSection>

        <TraceSection title="Final prose batch">
          <Stack spacing={1}>
            <MetricLine label="Prose curator calls" value={metrics?.prose_curator_call_count == null ? 'N/A' : String(metrics.prose_curator_call_count)} />
            <MetricLine label="Subtask answers" value={metrics?.subtask_answer_count == null ? 'N/A' : String(metrics.subtask_answer_count)} />
            <MetricLine label="Final generations" value={metrics?.final_generation_count == null ? 'N/A' : String(metrics.final_generation_count)} />
          </Stack>
        </TraceSection>

        <TraceSection title="Sufficiency, conflicts & context pack">
          <Stack spacing={1}>
            <MetricLine label="Response status" value={formatOptionalText(data.sufficiency?.response_status)} />
            <MetricLine label="Evidence complete" value={data.sufficiency?.evidence_complete == null ? 'N/A' : String(data.sufficiency.evidence_complete)} />
            <MetricLine label="Answerable" value={data.sufficiency?.answerable == null ? 'N/A' : String(data.sufficiency.answerable)} />
            <MetricLine label="Conflicts" value={formatCount(data.conflicts)} />
            <MetricLine label="Packed evidence" value={formatCount(contextPack?.packedEvidenceIds)} />
            <MetricLine label="Dropped evidence" value={formatCount(contextPack?.droppedEvidenceIds)} />
            <MetricLine label="Context tokens" value={formatOptionalTokens(contextPack?.tokenCount)} />
          </Stack>
        </TraceSection>

        <TraceSection title="Final answer & verification">
          <Stack spacing={1}>
            <Text fontSize="sm" whiteSpace="pre-wrap">{formatOptionalText(finalAnswerPreview)}</Text>
            <MetricLine label="Final verified claims" value={finalClaimCount} />
            <MetricLine label="Verification stop reason" value={formatOptionalText(data.sufficiency?.stop_reason)} />
          </Stack>
        </TraceSection>

        <TraceSection title="Provider usage & terminal state">
          <Stack spacing={1}>
            <MetricLine label="Provider attempts" value={metrics?.provider_attempt_count == null ? 'N/A' : String(metrics.provider_attempt_count)} />
            <MetricLine label="Reserved tokens" value={formatOptionalTokens(metrics?.reserved_tokens)} />
            <MetricLine label="Reconciled tokens" value={formatOptionalTokens(metrics?.reconciled_tokens)} />
            <MetricLine label="Cancellation / timeout" value={terminationStatus(traceEvents)} />
          </Stack>
        </TraceSection>
      </SimpleGrid>

      <RawV9Disclosure data={data} />
    </Stack>
  );
}
