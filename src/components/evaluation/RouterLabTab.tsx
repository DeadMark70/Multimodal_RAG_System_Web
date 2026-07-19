import { Badge, Box, Grid, GridItem, Heading, Stack, Table, Tbody, Td, Text, Th, Thead, Tr } from '@chakra-ui/react';
import RouterDecisionCard, { type RouterDecision } from './RouterDecisionCard';
import { formatOptionalNumber, formatOptionalTokens } from './evaluationDisplay';

interface RouterComparisonRow {
  label: string;
  qualityScore: number | null;
  avgLatencyMs: number | null;
  tokens: number | null;
  regret: number | null;
  policyType: string;
}

interface ConfusionCell {
  expected: string;
  predicted: string;
  count: number;
}

interface RouterLabData {
  analysisType: 'retrospective' | 'actual';
  oracleLabelSource: 'observed_best_mode' | 'utility_best_mode' | 'human_label';
  hasActualRouterRuns: boolean;
  utilityFormula: string;
  selectedDecision: RouterDecision;
  comparisonRows: RouterComparisonRow[];
  savedTokens: number | null;
  qualityLossVsAgentic: number | null;
  qualityGainVsNaive: number | null;
  routerRegret: number | null;
  confusionMatrix?: ConfusionCell[];
}

export default function RouterLabTab({ data }: { data?: RouterLabData }) {
  if (!data) {
    return <Text color="text.secondary">Router lab metrics will appear after router analysis is available.</Text>;
  }

  return (
    <Stack spacing={4}>
      {!data.hasActualRouterRuns ? (
        <Text color="orange.500">Retrospective analysis only: no actual router runs in this campaign.</Text>
      ) : null}

      <RouterDecisionCard decision={data.selectedDecision} analysisType={data.analysisType} />

      <Grid templateColumns={{ base: 'repeat(2, 1fr)', xl: 'repeat(4, 1fr)' }} gap={3}>
        <GridItem borderWidth="1px" borderRadius="md" px={3} py={2}>
          <Text fontSize="xs" textTransform="uppercase" color="text.secondary">
            Saved Tokens
          </Text>
          <Text fontSize="lg" fontWeight="semibold">
            {formatOptionalTokens(data.hasActualRouterRuns ? data.savedTokens : null)}
          </Text>
        </GridItem>
        <GridItem borderWidth="1px" borderRadius="md" px={3} py={2}>
          <Text fontSize="xs" textTransform="uppercase" color="text.secondary">
            Quality Loss vs Agentic
          </Text>
          <Text fontSize="lg" fontWeight="semibold">
            {formatOptionalNumber(data.hasActualRouterRuns ? data.qualityLossVsAgentic : null)}
          </Text>
        </GridItem>
        <GridItem borderWidth="1px" borderRadius="md" px={3} py={2}>
          <Text fontSize="xs" textTransform="uppercase" color="text.secondary">
            Quality Gain vs Naive
          </Text>
          <Text fontSize="lg" fontWeight="semibold">
            {formatOptionalNumber(data.hasActualRouterRuns ? data.qualityGainVsNaive : null)}
          </Text>
        </GridItem>
        <GridItem borderWidth="1px" borderRadius="md" px={3} py={2}>
          <Text fontSize="xs" textTransform="uppercase" color="text.secondary">
            Router Regret
          </Text>
          <Text fontSize="lg" fontWeight="semibold">
            {formatOptionalNumber(data.hasActualRouterRuns ? data.routerRegret : null)}
          </Text>
        </GridItem>
      </Grid>

      <Box>
        <Heading size="sm" mb={3}>
          Utility Formula
        </Heading>
        <Text>{data.utilityFormula}</Text>
        <Badge mt={2} colorScheme="purple">
          {data.oracleLabelSource}
        </Badge>
      </Box>

      <Box overflowX="auto">
        <Heading size="sm" mb={3}>
          Policy Comparison
        </Heading>
        <Table size="sm">
          <Thead>
            <Tr>
              <Th>Policy</Th>
              <Th isNumeric>Quality</Th>
              <Th isNumeric>Latency</Th>
              <Th isNumeric>Tokens</Th>
              <Th isNumeric>Regret</Th>
              <Th>Type</Th>
            </Tr>
          </Thead>
          <Tbody>
            {data.comparisonRows.map((row) => (
              <Tr key={row.label}>
                <Td fontWeight="medium">{row.label}</Td>
                <Td isNumeric>{formatOptionalNumber(row.qualityScore, 2)}</Td>
                <Td isNumeric>{row.avgLatencyMs == null ? 'N/A' : `${row.avgLatencyMs.toLocaleString()} ms`}</Td>
                <Td isNumeric>{formatOptionalTokens(row.tokens)}</Td>
                <Td isNumeric>{formatOptionalNumber(row.regret, 2)}</Td>
                <Td>{row.policyType}</Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </Box>

      {data.confusionMatrix?.length ? (
        <Box overflowX="auto">
          <Heading size="sm" mb={3}>
            Router Confusion Matrix
          </Heading>
          <Table size="sm">
            <Thead>
              <Tr>
                <Th>Expected</Th>
                <Th>Predicted</Th>
                <Th isNumeric>Count</Th>
              </Tr>
            </Thead>
            <Tbody>
              {data.confusionMatrix.map((cell) => (
                <Tr key={`${cell.expected}-${cell.predicted}`}>
                  <Td>{cell.expected}</Td>
                  <Td>{cell.predicted}</Td>
                  <Td isNumeric>{cell.count}</Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </Box>
      ) : null}
    </Stack>
  );
}
