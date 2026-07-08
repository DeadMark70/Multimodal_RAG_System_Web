import { Box, Table, Tbody, Td, Text, Th, Thead, Tr } from '@chakra-ui/react';

export interface ClaimRow {
  claim: string;
  type: string;
  status: string;
  evidence: string[];
  repairAction: string;
  postRepairStatus: string;
}

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
            <Tr key={claim.claim}>
              <Td maxW="320px">{claim.claim}</Td>
              <Td>{claim.type}</Td>
              <Td>{claim.status}</Td>
              <Td>{claim.evidence.length ? claim.evidence.join(', ') : 'none'}</Td>
              <Td>{claim.repairAction}</Td>
              <Td>{claim.postRepairStatus}</Td>
            </Tr>
          ))}
        </Tbody>
      </Table>
    </Box>
  );
}
