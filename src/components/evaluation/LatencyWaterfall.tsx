import { Box, Table, Tbody, Td, Text, Th, Thead, Tr } from '@chakra-ui/react';

export interface LatencyStage {
  stage: string;
  p50Ms: number;
  p95Ms: number;
}

export default function LatencyWaterfall({ stages }: { stages?: LatencyStage[] }) {
  if (!stages?.length) {
    return <Text color="text.secondary">No latency stage breakdown is available yet.</Text>;
  }

  return (
    <Box overflowX="auto">
      <Table size="sm">
        <Thead>
          <Tr>
            <Th>Stage</Th>
            <Th isNumeric>P50</Th>
            <Th isNumeric>P95</Th>
          </Tr>
        </Thead>
        <Tbody>
          {stages.map((stage) => (
            <Tr key={stage.stage}>
              <Td fontWeight="medium">{stage.stage}</Td>
              <Td isNumeric>{`${stage.p50Ms.toLocaleString()} ms`}</Td>
              <Td isNumeric>{`${stage.p95Ms.toLocaleString()} ms`}</Td>
            </Tr>
          ))}
        </Tbody>
      </Table>
    </Box>
  );
}
