import { Box, Grid, GridItem, Table, Tbody, Td, Text, Th, Thead, Tr } from '@chakra-ui/react';

interface AgentBehaviorRow {
  questionId: string;
  subtasks: number;
  toolCalls: number;
  visualCalls: number;
  graphCalls: number;
  drilldownDepth: number;
  correctness: number;
  faithfulness: number;
  tokens: number;
}

export default function AgentBehaviorTab({ rows }: { rows?: AgentBehaviorRow[] }) {
  if (!rows?.length) {
    return <Text color="text.secondary">Agent behavior metrics will appear after trace aggregation is available.</Text>;
  }

  const totals = rows.reduce(
    (accumulator, row) => ({
      subtasks: accumulator.subtasks + row.subtasks,
      toolCalls: accumulator.toolCalls + row.toolCalls,
      visualCalls: accumulator.visualCalls + row.visualCalls,
      graphCalls: accumulator.graphCalls + row.graphCalls,
    }),
    { subtasks: 0, toolCalls: 0, visualCalls: 0, graphCalls: 0 }
  );

  return (
    <Box>
      <Grid templateColumns={{ base: 'repeat(2, 1fr)', xl: 'repeat(4, 1fr)' }} gap={3} mb={4}>
        <GridItem borderWidth="1px" borderRadius="md" px={3} py={2}>
          <Text fontSize="xs" textTransform="uppercase" color="text.secondary">
            Subtasks
          </Text>
          <Text fontSize="lg" fontWeight="semibold">
            {totals.subtasks}
          </Text>
        </GridItem>
        <GridItem borderWidth="1px" borderRadius="md" px={3} py={2}>
          <Text fontSize="xs" textTransform="uppercase" color="text.secondary">
            Tool Calls
          </Text>
          <Text fontSize="lg" fontWeight="semibold">
            {totals.toolCalls}
          </Text>
        </GridItem>
        <GridItem borderWidth="1px" borderRadius="md" px={3} py={2}>
          <Text fontSize="xs" textTransform="uppercase" color="text.secondary">
            Visual Calls
          </Text>
          <Text fontSize="lg" fontWeight="semibold">
            {totals.visualCalls}
          </Text>
        </GridItem>
        <GridItem borderWidth="1px" borderRadius="md" px={3} py={2}>
          <Text fontSize="xs" textTransform="uppercase" color="text.secondary">
            Graph Calls
          </Text>
          <Text fontSize="lg" fontWeight="semibold">
            {totals.graphCalls}
          </Text>
        </GridItem>
      </Grid>

      <Box overflowX="auto">
        <Table size="sm">
          <Thead>
            <Tr>
              <Th>Question</Th>
              <Th isNumeric>Subtasks</Th>
              <Th isNumeric>Tool Calls</Th>
              <Th isNumeric>Visual Calls</Th>
              <Th isNumeric>Graph Calls</Th>
              <Th isNumeric>Drilldown Depth</Th>
              <Th isNumeric>Correctness</Th>
              <Th isNumeric>Faithfulness</Th>
              <Th isNumeric>Tokens</Th>
            </Tr>
          </Thead>
          <Tbody>
            {rows.map((row) => (
              <Tr key={row.questionId}>
                <Td fontWeight="medium">{row.questionId}</Td>
                <Td isNumeric>{row.subtasks}</Td>
                <Td isNumeric>{row.toolCalls}</Td>
                <Td isNumeric>{row.visualCalls}</Td>
                <Td isNumeric>{row.graphCalls}</Td>
                <Td isNumeric>{row.drilldownDepth}</Td>
                <Td isNumeric>{row.correctness.toFixed(2)}</Td>
                <Td isNumeric>{row.faithfulness.toFixed(2)}</Td>
                <Td isNumeric>{row.tokens.toLocaleString()}</Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </Box>
    </Box>
  );
}
