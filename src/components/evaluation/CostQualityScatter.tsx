import { Box, Table, Tbody, Td, Text, Th, Thead, Tr } from '@chakra-ui/react';

export interface CostQualityPoint {
  mode: string;
  correctness: number;
  faithfulness: number;
  costUsd: number;
  tokens: number;
}

export default function CostQualityScatter({ points }: { points?: CostQualityPoint[] }) {
  if (!points?.length) {
    return <Text color="text.secondary">No cost-quality rows are available for this campaign yet.</Text>;
  }

  return (
    <Box overflowX="auto">
      <Table size="sm">
        <Thead>
          <Tr>
            <Th>Mode</Th>
            <Th>Quality Mix</Th>
            <Th isNumeric>Cost</Th>
            <Th isNumeric>Tokens</Th>
          </Tr>
        </Thead>
        <Tbody>
          {points.map((point) => (
            <Tr key={`${point.mode}-${point.tokens}`}>
              <Td fontWeight="medium">{point.mode}</Td>
              <Td>{`${(point.correctness * 100).toFixed(1)}% / ${(point.faithfulness * 100).toFixed(1)}%`}</Td>
              <Td isNumeric>{`$${point.costUsd.toFixed(2)}`}</Td>
              <Td isNumeric>{point.tokens.toLocaleString()}</Td>
            </Tr>
          ))}
        </Tbody>
      </Table>
    </Box>
  );
}
