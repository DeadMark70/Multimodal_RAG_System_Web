import { Box, Heading, Table, Tbody, Td, Text, Th, Thead, Tr } from '@chakra-ui/react';

export interface QuestionDeltaRow {
  questionId: string;
  category: string | null;
  difficulty: string | null;
  requiredModalities: string[];
  deltaCorrectness: number | null;
  deltaFaithfulness: number | null;
  deltaTokens: number | null;
  deltaLatencyMs: number | null;
  ecrCorrectness: number | null;
  bestMode: string | null;
  routerSelectedMode: string;
  evidenceCoverage: number | null;
  unsupportedClaimRatio: number | null;
  status?: string;
  ablationFlags?: string[];
  risks?: string[];
}

const heatColor = (value: number | null) => {
  if (value == null) return 'gray.50';
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
              <Td bg={heatColor(row.deltaCorrectness)}>{row.deltaCorrectness == null ? 'N/A' : row.deltaCorrectness.toFixed(3)}</Td>
              <Td bg={heatColor(row.deltaFaithfulness)}>{row.deltaFaithfulness == null ? 'N/A' : row.deltaFaithfulness.toFixed(3)}</Td>
              <Td bg={heatColor(row.unsupportedClaimRatio == null ? null : -row.unsupportedClaimRatio)}>
                {row.unsupportedClaimRatio == null ? 'N/A' : `${(row.unsupportedClaimRatio * 100).toFixed(1)}%`}
              </Td>
            </Tr>
          ))}
        </Tbody>
      </Table>
    </Box>
  );
}
