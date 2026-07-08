import {
  Box,
  Progress,
  Table,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
  VStack,
} from '@chakra-ui/react';

export interface ModeComparisonRow {
  mode: string;
  correctness: number;
  faithfulness: number;
  relevancy: number;
  runs: number;
  avgCostUsd?: number;
  avgLatencyMs?: number;
}

function formatPercent(value: number) {
  return `${(value * 100).toFixed(1)}%`;
}

export default function ModeComparisonChart({ rows }: { rows?: ModeComparisonRow[] }) {
  if (!rows?.length) {
    return <Text color="text.secondary">No mode comparison data for this campaign yet.</Text>;
  }

  return (
    <Box overflowX="auto">
      <Table size="sm">
        <Thead>
          <Tr>
            <Th>Mode</Th>
            <Th>Correctness</Th>
            <Th>Faithfulness</Th>
            <Th>Relevancy</Th>
            <Th isNumeric>Runs</Th>
          </Tr>
        </Thead>
        <Tbody>
          {rows.map((row) => (
            <Tr key={row.mode}>
              <Td fontWeight="medium">{row.mode}</Td>
              <Td minW="180px">
                <VStack align="stretch" spacing={1}>
                  <Text fontSize="sm">{formatPercent(row.correctness)}</Text>
                  <Progress value={row.correctness * 100} size="sm" colorScheme="green" />
                </VStack>
              </Td>
              <Td minW="180px">
                <VStack align="stretch" spacing={1}>
                  <Text fontSize="sm">{formatPercent(row.faithfulness)}</Text>
                  <Progress value={row.faithfulness * 100} size="sm" colorScheme="blue" />
                </VStack>
              </Td>
              <Td minW="180px">
                <VStack align="stretch" spacing={1}>
                  <Text fontSize="sm">{formatPercent(row.relevancy)}</Text>
                  <Progress value={row.relevancy * 100} size="sm" colorScheme="purple" />
                </VStack>
              </Td>
              <Td isNumeric>{row.runs}</Td>
            </Tr>
          ))}
        </Tbody>
      </Table>
    </Box>
  );
}
