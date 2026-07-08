import { Box, Table, Tbody, Td, Text, Th, Thead, Tr } from '@chakra-ui/react';

export interface TokenBreakdownRow {
  mode: string;
  promptTokens: number;
  completionTokens: number;
  retrievalTokens: number;
  reasoningTokens: number;
}

export default function TokenBreakdownChart({ rows }: { rows?: TokenBreakdownRow[] }) {
  if (!rows?.length) {
    return <Text color="text.secondary">No token breakdown is available yet.</Text>;
  }

  return (
    <Box overflowX="auto">
      <Table size="sm">
        <Thead>
          <Tr>
            <Th>Mode</Th>
            <Th isNumeric>Prompt</Th>
            <Th isNumeric>Completion</Th>
            <Th isNumeric>Retrieval</Th>
            <Th isNumeric>Reasoning</Th>
          </Tr>
        </Thead>
        <Tbody>
          {rows.map((row) => (
            <Tr key={row.mode}>
              <Td fontWeight="medium">{row.mode}</Td>
              <Td isNumeric>{row.promptTokens.toLocaleString()}</Td>
              <Td isNumeric>{row.completionTokens.toLocaleString()}</Td>
              <Td isNumeric>{row.retrievalTokens.toLocaleString()}</Td>
              <Td isNumeric>{row.reasoningTokens.toLocaleString()}</Td>
            </Tr>
          ))}
        </Tbody>
      </Table>
    </Box>
  );
}
