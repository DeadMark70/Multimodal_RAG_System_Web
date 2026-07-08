import { Box, Heading, Table, Tbody, Td, Text, Th, Thead, Tr } from '@chakra-ui/react';

export interface QuestionDeltaRow {
  questionId: string;
  category: string;
  difficulty: string;
  requiredModalities: string[];
  deltaCorrectness: number;
  deltaFaithfulness: number;
  deltaTokens: number;
  deltaLatencyMs: number;
  ecrCorrectness: number;
  bestMode: string;
  routerSelectedMode: string;
  evidenceCoverage: number;
  unsupportedClaimRatio: number;
  status?: string;
  ablationFlags?: string[];
  risks?: string[];
}

const heatColor = (value: number) => {
  if (value >= 0.15) return 'green.50';
  if (value <= -0.05) return 'red.50';
  return 'gray.50';
};

export default function QuestionDeltaHeatmap({ rows }: { rows?: QuestionDeltaRow[] }) {
  if (!rows?.length) {
    return <Text color="text.secondary">No question delta rows are available yet.</Text>;
  }

  return (
    <Box overflowX="auto">
      <Heading size="sm" mb={3}>
        Question Delta Heatmap
      </Heading>
      <Table size="sm">
        <Thead>
          <Tr>
            <Th>Question</Th>
            <Th>Delta Correctness</Th>
            <Th>Delta Faithfulness</Th>
            <Th>Unsupported Claim Ratio</Th>
          </Tr>
        </Thead>
        <Tbody>
          {rows.map((row) => (
            <Tr key={row.questionId}>
              <Td fontWeight="medium">{row.questionId}</Td>
              <Td bg={heatColor(row.deltaCorrectness)}>{row.deltaCorrectness.toFixed(3)}</Td>
              <Td bg={heatColor(row.deltaFaithfulness)}>{row.deltaFaithfulness.toFixed(3)}</Td>
              <Td bg={heatColor(-row.unsupportedClaimRatio)}>{(row.unsupportedClaimRatio * 100).toFixed(1)}%</Td>
            </Tr>
          ))}
        </Tbody>
      </Table>
    </Box>
  );
}
