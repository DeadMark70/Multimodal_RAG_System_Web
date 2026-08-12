import { Box, Table, Tbody, Td, Text, Th, Thead, Tr } from '@chakra-ui/react';

export interface ClaimRow {
  claim: string | null;
  type: string | null;
  status: string | null;
  evidence: string[];
  repairAction: string | null;
  postRepairStatus: string | null;
  extractionStatus?: 'recorded' | 'empty' | 'not_instrumented' | null;
}

const textOrNA = (value: string | null) => value ?? 'N/A';

export default function ClaimEvidenceTable({ claims }: { claims?: ClaimRow[] }) {
  if (!claims?.length) {
    return <Text color="text.secondary">No claim rows are available for this run.</Text>;
  }

  return (
    <Box overflowX="auto">
      <Table size="sm">
        <Thead>
          <Tr>
            <Th>Claim</Th>
            <Th>Type</Th>
            <Th>Status</Th>
            <Th>Evidence</Th>
            <Th>Repair Action</Th>
            <Th>Post Repair Status</Th>
          </Tr>
        </Thead>
        <Tbody>
          {claims.map((claim) => (
            <Tr key={claim.claim ?? 'n/a'}>
              <Td maxW="320px">{textOrNA(claim.claim)}</Td>
              <Td>{textOrNA(claim.type)}</Td>
              <Td>{textOrNA(claim.status)}</Td>
              <Td>{claim.evidence.length ? claim.evidence.join(', ') : 'N/A'}</Td>
              <Td>{textOrNA(claim.repairAction)}</Td>
              <Td>{textOrNA(claim.postRepairStatus)}</Td>
            </Tr>
          ))}
        </Tbody>
      </Table>
    </Box>
  );
}
