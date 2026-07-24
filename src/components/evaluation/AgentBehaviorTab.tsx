import { Box, Grid, GridItem, Table, Tbody, Td, Text, Th, Thead, Tr } from '@chakra-ui/react';
import { formatOptionalPercent, formatOptionalText, formatOptionalTokens } from './evaluationDisplay';

interface AgentBehaviorRow {
  runId: string;
  campaignId: string;
  questionId: string;
  mode: string;
  repeat: number;
  traceStatus: string;
  behaviorSchema?: 'v8' | 'v9' | 'not_applicable' | null;
  failureReason?: string | null;
  accountingStatus: 'complete' | 'partial' | 'not_available';
  subtasks: number | null;
  toolCalls: number | null;
  visualCalls: number | null;
  graphCalls: number | null;
  drilldownDepth: number | null;
  unsupportedClaimRatio: number | null;
  supportedClaimRatio: number | null;
  tokens: number | null;
  v9?: {
    route: string | null;
    graphExecution: string;
    visualExecution: string;
    evidencePacketCount: number | null;
    supportedSlotCount: number | null;
    requiredSlotCount: number | null;
  } | null;
}

function sumNullable(rows: AgentBehaviorRow[], key: 'subtasks' | 'toolCalls' | 'visualCalls' | 'graphCalls') {
  const values = rows.map((row) => row[key]);
  return values.every((value) => value != null) ? values.reduce((sum, value) => sum + (value ?? 0), 0) : null;
}

export default function AgentBehaviorTab({ rows }: { rows?: AgentBehaviorRow[] }) {
  if (!rows?.length) {
    return <Text color="text.secondary">Agent behavior metrics will appear after trace aggregation is available.</Text>;
  }

  const totals = {
    subtasks: sumNullable(rows, 'subtasks'),
    toolCalls: sumNullable(rows, 'toolCalls'),
    visualCalls: sumNullable(rows, 'visualCalls'),
    graphCalls: sumNullable(rows, 'graphCalls'),
  };

  return (
    <Box>
      <Grid templateColumns={{ base: 'repeat(2, 1fr)', xl: 'repeat(4, 1fr)' }} gap={3} mb={4}>
        <GridItem borderWidth="1px" borderRadius="md" px={3} py={2}>
          <Text fontSize="xs" textTransform="uppercase" color="text.secondary">
            Subtasks
          </Text>
          <Text fontSize="lg" fontWeight="semibold">
            {formatOptionalTokens(totals.subtasks)}
          </Text>
        </GridItem>
        <GridItem borderWidth="1px" borderRadius="md" px={3} py={2}>
          <Text fontSize="xs" textTransform="uppercase" color="text.secondary">
            Tool Calls
          </Text>
          <Text fontSize="lg" fontWeight="semibold">
            {formatOptionalTokens(totals.toolCalls)}
          </Text>
        </GridItem>
        <GridItem borderWidth="1px" borderRadius="md" px={3} py={2}>
          <Text fontSize="xs" textTransform="uppercase" color="text.secondary">
            Visual Calls
          </Text>
          <Text fontSize="lg" fontWeight="semibold">
            {formatOptionalTokens(totals.visualCalls)}
          </Text>
        </GridItem>
        <GridItem borderWidth="1px" borderRadius="md" px={3} py={2}>
          <Text fontSize="xs" textTransform="uppercase" color="text.secondary">
            Graph Calls
          </Text>
          <Text fontSize="lg" fontWeight="semibold">
            {formatOptionalTokens(totals.graphCalls)}
          </Text>
        </GridItem>
      </Grid>

      <Box overflowX="auto">
        <Table size="sm">
          <Thead>
            <Tr>
              <Th>Mode</Th>
              <Th>Run ID</Th>
              <Th isNumeric>Repeat</Th>
              <Th>Question</Th>
              <Th>Status</Th>
              <Th>Schema</Th>
              <Th>Route</Th>
              <Th>Graph</Th>
              <Th>Visual</Th>
              <Th isNumeric>Evidence</Th>
              <Th isNumeric>Slots</Th>
              <Th isNumeric>Subtasks</Th>
              <Th isNumeric>Tool Calls</Th>
              <Th isNumeric>Visual Calls</Th>
              <Th isNumeric>Graph Calls</Th>
              <Th isNumeric>Drilldown Depth</Th>
              <Th isNumeric>Unsupported Claims</Th>
              <Th isNumeric>Supported Claims</Th>
              <Th isNumeric>Tokens</Th>
              <Th>Accounting</Th>
            </Tr>
          </Thead>
          <Tbody>
            {rows.map((row) => (
              <Tr key={row.runId}>
                <Td>{row.mode}</Td>
                <Td fontFamily="mono" fontSize="xs">{row.runId}</Td>
                <Td isNumeric>{row.repeat}</Td>
                <Td fontWeight="medium">{row.questionId}</Td>
                <Td>{formatOptionalText(row.traceStatus)}</Td>
                <Td>{formatOptionalText(row.behaviorSchema ?? null)}</Td>
                <Td>{formatOptionalText(row.v9?.route ?? null)}</Td>
                <Td>{formatOptionalText(row.v9?.graphExecution ?? null)}</Td>
                <Td>{formatOptionalText(row.v9?.visualExecution ?? null)}</Td>
                <Td isNumeric>{formatOptionalTokens(row.v9?.evidencePacketCount ?? null)}</Td>
                <Td isNumeric>
                  {row.v9
                    ? `${formatOptionalTokens(row.v9.supportedSlotCount)} / ${formatOptionalTokens(row.v9.requiredSlotCount)}`
                    : 'N/A'}
                </Td>
                <Td isNumeric>{formatOptionalTokens(row.subtasks)}</Td>
                <Td isNumeric>{formatOptionalTokens(row.toolCalls)}</Td>
                <Td isNumeric>{formatOptionalTokens(row.visualCalls)}</Td>
                <Td isNumeric>{formatOptionalTokens(row.graphCalls)}</Td>
                <Td isNumeric>{formatOptionalTokens(row.drilldownDepth)}</Td>
                <Td isNumeric>{formatOptionalPercent(row.unsupportedClaimRatio)}</Td>
                <Td isNumeric>{formatOptionalPercent(row.supportedClaimRatio)}</Td>
                <Td isNumeric>{formatOptionalTokens(row.tokens)}</Td>
                <Td>{row.accountingStatus}</Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </Box>
    </Box>
  );
}
