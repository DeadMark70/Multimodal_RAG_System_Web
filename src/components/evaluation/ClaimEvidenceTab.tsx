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
  unsupportedReasons,
  agenticV9Evidence,
}: {
  runOptions?: EvaluationRunOption[];
  selectedRunId?: string;
  onSelectedRunIdChange?: (runId: string) => void;
  claims?: ClaimRow[];
  unsupportedReasons?: string[];
  agenticV9Evidence?: AgenticV9RunEvidence;
}) {
  if (!claims?.length && !unsupportedReasons?.length && !agenticV9Evidence) {
    return (
      <Stack spacing={4}>
        <RunContextSelector
          runOptions={runOptions}
          selectedRunId={selectedRunId}
          onSelectedRunIdChange={onSelectedRunIdChange}
        />
        <Text color="text.secondary">Claim-evidence alignment will appear after claim extraction is available.</Text>
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
        <ClaimEvidenceTable claims={claims} />
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
  return (
    <Box>
      <Heading size="sm" mb={3}>Atomic Slot Alignment</Heading>
      {slots === undefined ? <Text color="text.secondary">N/A — atomic slot plan was not instrumented.</Text> : !slots.length ? <Text color="text.secondary">No atomic slots recorded.</Text> : (
        <Table size="sm">
          <Thead><Tr><Th>Slot</Th><Th>Requirement</Th><Th>Status</Th><Th>Evidence</Th><Th>Claims</Th></Tr></Thead>
          <Tbody>{slots.map((slot) => {
            const resolution = resolutionBySlot.get(slot.slot_id);
            const claimIds = (data.finalClaims ?? []).filter((claim) => (claim.evidenceIds ?? []).some((id) => resolution?.evidence_ids?.includes(id))).map((claim) => claim.claimId);
            return <Tr key={slot.slot_id}><Td>{slot.slot_id}</Td><Td>{slot.description}</Td><Td>{resolution?.status ?? 'N/A'}</Td><Td>{resolution?.evidence_ids?.join(', ') || 'N/A'}</Td><Td>{claimIds.join(', ') || 'N/A'}</Td></Tr>;
          })}</Tbody>
        </Table>
      )}
      <Text mt={2} fontSize="sm" color="text.secondary">
        Repair terminal: {data.repairs?.at(-1)?.stop_reason ?? 'N/A'}
      </Text>
    </Box>
  );
}
