import { Box, Heading, ListItem, Stack, Text, UnorderedList } from '@chakra-ui/react';
import ClaimEvidenceTable, { type ClaimRow } from './ClaimEvidenceTable';
import RunContextSelector, { type EvaluationRunOption } from './RunContextSelector';
import type { AgenticV9RunEvidence } from '../../pages/EvaluationCenter.mappers';
import { Table, Tbody, Td, Th, Thead, Tr } from '@chakra-ui/react';

export default function ClaimEvidenceTab({
  runOptions,
  selectedRunId,
  onSelectedRunIdChange,
  claims,
  extractionStatus,
  unsupportedReasons,
  agenticV9Evidence,
}: {
  runOptions?: EvaluationRunOption[];
  selectedRunId?: string;
  onSelectedRunIdChange?: (runId: string) => void;
  claims?: ClaimRow[];
  extractionStatus?: 'recorded' | 'empty' | 'not_instrumented';
  unsupportedReasons?: string[];
  agenticV9Evidence?: AgenticV9RunEvidence;
}) {
  const emptyMessage = extractionStatus === 'empty'
    ? 'Claim extraction ran and recorded zero claims.'
    : 'Claim extraction telemetry was not recorded for this run.';

  if (!claims?.length && !unsupportedReasons?.length && !agenticV9Evidence) {
    return (
      <Stack spacing={4}>
        <RunContextSelector
          runOptions={runOptions}
          selectedRunId={selectedRunId}
          onSelectedRunIdChange={onSelectedRunIdChange}
        />
        <Text color="text.secondary">{emptyMessage}</Text>
      </Stack>
    );
  }

  return (
    <Stack spacing={4}>
      <RunContextSelector
        runOptions={runOptions}
        selectedRunId={selectedRunId}
        onSelectedRunIdChange={onSelectedRunIdChange}
      />
      <Box>
        <Heading size="sm" mb={3}>
          Claim Alignment
        </Heading>
        {claims?.length
          ? <ClaimEvidenceTable claims={claims} />
          : <Text color="text.secondary">{emptyMessage}</Text>}
      </Box>
      {agenticV9Evidence ? <V9ClaimSlotAlignment data={agenticV9Evidence} /> : null}
      <Box>
        <Heading size="sm" mb={3}>
          Unsupported Reasons
        </Heading>
        <UnorderedList ml={5}>
          {(unsupportedReasons ?? []).map((reason) => (
            <ListItem key={reason}>{reason}</ListItem>
          ))}
        </UnorderedList>
      </Box>
    </Stack>
  );
}

function V9ClaimSlotAlignment({ data }: { data: AgenticV9RunEvidence }) {
  const resolutionBySlot = new Map((data.slotResolutions ?? []).map((entry) => [entry.slot_id, entry.resolution]));
  const slots = data.queryContract?.required_slots;
  const packetById = new Map((data.evidencePackets ?? []).map((entry) => [entry.evidence_id, entry.packet]));
  return (
    <Box data-testid="atomic-slot-alignment">
      <Heading size="sm" mb={3}>Atomic Slot Alignment</Heading>
      <Text data-testid="capability-notice" fontSize="sm" color="text.secondary" mb={2}>
        Per-slot graph alignment is not instrumented for this run.
      </Text>
      {slots === undefined ? <Text color="text.secondary">N/A — atomic slot plan was not instrumented.</Text> : !slots.length ? <Text color="text.secondary">No atomic slots recorded.</Text> : (
        <Box overflowX="auto"><Table size="sm">
          <Thead><Tr><Th>Slot</Th><Th>Requirement</Th><Th>Expected answer type</Th><Th>Source / authorized docs</Th><Th>Locator</Th><Th>Dependencies</Th><Th>Visual policy</Th><Th>Status / reason</Th><Th>Linked evidence source / locator</Th><Th>Visual</Th><Th>Claims</Th></Tr></Thead>
          <Tbody>{slots.map((slot) => {
            const resolution = resolutionBySlot.get(slot.slot_id);
            const claimIds = (data.finalClaims ?? [])
              .filter((claim) => claim.slotId === slot.slot_id)
              .map((claim) => claim.claimId);
            const linkedPackets = (resolution?.evidence_ids ?? [])
              .map((evidenceId) => packetById.get(evidenceId))
              .filter((packet): packet is NonNullable<typeof packet> => Boolean(packet && packet.slot_ids.includes(slot.slot_id)));
            const source = [...(slot.source_name_hints ?? []), ...(slot.authorized_source_doc_ids ?? [])];
            const locators = slot.locator_hints ?? [];
            const linkedEvidence = linkedPackets.map((packet) => {
              const locator = [packet.locator.printed_page_label, packet.locator.section, packet.locator.table_id, packet.locator.figure_id]
                .filter((value): value is string => Boolean(value))
                .join(' · ');
              return `${packet.source.document_name ?? packet.source.doc_id}${locator ? ` · ${locator}` : ''}`;
            });
            const visualAssets = linkedPackets
              .map((packet) => packet.source.asset_id)
              .filter((assetId): assetId is string => Boolean(assetId));
            return <Tr key={slot.slot_id}>
              <Td>{slot.slot_id}</Td><Td>{slot.description}</Td><Td>{slot.expected_answer_type ?? 'N/A'}</Td>
              <Td data-testid={`slot-source-${slot.slot_id}`}>{source.join(' · ') || 'N/A'}</Td>
              <Td data-testid={`slot-locator-${slot.slot_id}`}>{locators.join(' · ') || 'N/A'}</Td>
              <Td data-testid={`slot-dependencies-${slot.slot_id}`}>{slot.depends_on_slot_ids?.join(', ') || 'N/A'}</Td>
              <Td>{slot.visual_policy ?? 'N/A'}</Td>
              <Td>{resolution ? `${resolution.status}${resolution.reason ? ` · ${resolution.reason}` : ''}` : 'N/A'}</Td>
              <Td>{linkedEvidence.join(' · ') || 'N/A'}</Td>
              <Td data-testid={`slot-visual-${slot.slot_id}`}>{visualAssets.join(', ') || 'N/A'}</Td>
              <Td data-testid={`slot-claims-${slot.slot_id}`}>{claimIds.join(', ') || 'N/A'}</Td>
            </Tr>;
          })}</Tbody>
        </Table></Box>
      )}
      <Heading size="xs" mt={3} mb={2}>Repair rounds</Heading>
      {data.repairs === undefined ? <Text fontSize="sm" color="text.secondary">Repair rounds: N/A</Text> : !data.repairs.length ? <Text fontSize="sm" color="text.secondary">No repair rounds recorded.</Text> : <Stack spacing={2}>{data.repairs.map((repair) => (
        <Box key={repair.repair_round_index} borderWidth="1px" borderRadius="sm" p={2} fontSize="sm">
          <Text fontWeight="medium">Repair round {repair.repair_round_index}</Text>
          {repair.tasks?.length ? repair.tasks.map((task) => <Text key={task.task_id}>{`Task ${task.task_id} · query ${task.query_id} · targets ${task.target_slot_ids.join(', ') || 'N/A'} · stop ${repair.stop_reason ?? 'N/A'}`}</Text>) : <Text>Task/query identity: N/A · stop {repair.stop_reason ?? 'N/A'}</Text>}
        </Box>
      ))}</Stack>}
    </Box>
  );
}
