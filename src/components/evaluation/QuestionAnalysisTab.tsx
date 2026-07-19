import {
  Badge,
  Box,
  HStack,
  Select,
  Stack,
  Table,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
} from '@chakra-ui/react';
import { useMemo, useState } from 'react';
import QuestionDeltaHeatmap, { type QuestionDeltaRow } from './QuestionDeltaHeatmap';
import { formatOptionalNumber, formatOptionalPercent, formatOptionalText, formatOptionalTokens } from './evaluationDisplay';

const formatSigned = (value: number | null) => (value == null ? 'N/A' : `${value >= 0 ? '+' : ''}${value.toFixed(3)}`);

export default function QuestionAnalysisTab({ rows }: { rows?: QuestionDeltaRow[] }) {
  const [category, setCategory] = useState('all');
  const [status, setStatus] = useState('all');

  const categories = useMemo(() => ['all', ...new Set((rows ?? []).map((row) => row.category ?? 'n/a'))], [rows]);
  const statuses = useMemo(() => ['all', ...new Set((rows ?? []).map((row) => row.status ?? 'unknown'))], [rows]);

  const filteredRows = useMemo(
    () =>
      (rows ?? []).filter((row) => {
        if (category !== 'all' && (row.category ?? 'n/a') !== category) return false;
        if (status !== 'all' && (row.status ?? 'unknown') !== status) return false;
        return true;
      }),
    [category, rows, status]
  );

  if (!rows?.length) {
    return <Text color="text.secondary">Question-level analysis will appear after run comparisons are available.</Text>;
  }

  return (
    <Stack spacing={4}>
      <HStack spacing={3} align="end">
        <Box>
          <Text as="label" htmlFor="question-category-filter" display="block" fontSize="sm" mb={1}>
            Category Filter
          </Text>
          <Select id="question-category-filter" aria-label="Category Filter" size="sm" value={category} onChange={(event) => setCategory(event.target.value)}>
            {categories.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </Select>
        </Box>
        <Box>
          <Text as="label" htmlFor="question-status-filter" display="block" fontSize="sm" mb={1}>
            Status Filter
          </Text>
          <Select id="question-status-filter" aria-label="Status Filter" size="sm" value={status} onChange={(event) => setStatus(event.target.value)}>
            {statuses.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </Select>
        </Box>
      </HStack>

      <QuestionDeltaHeatmap rows={filteredRows} />

      <Box overflowX="auto">
        <Table size="sm">
          <Thead>
            <Tr>
              <Th>Question ID</Th>
              <Th>Category</Th>
              <Th>Difficulty</Th>
              <Th>Required Modalities</Th>
              <Th isNumeric>Delta Correctness</Th>
              <Th isNumeric>Delta Faithfulness</Th>
              <Th isNumeric>Delta Tokens</Th>
              <Th isNumeric>Delta Latency</Th>
              <Th isNumeric>ECR Correctness</Th>
              <Th>Best Mode</Th>
              <Th>Router Selected Mode</Th>
              <Th isNumeric>Evidence Coverage</Th>
              <Th isNumeric>Unsupported Claim Ratio</Th>
              <Th>Risks</Th>
            </Tr>
          </Thead>
          <Tbody>
            {filteredRows.map((row) => (
              <Tr key={row.questionId}>
                <Td fontWeight="medium">{row.questionId}</Td>
                <Td>{formatOptionalText(row.category)}</Td>
                <Td>{formatOptionalText(row.difficulty)}</Td>
                <Td>{row.requiredModalities.length ? row.requiredModalities.join(', ') : 'N/A'}</Td>
                <Td isNumeric>{formatSigned(row.deltaCorrectness)}</Td>
                <Td isNumeric>{formatSigned(row.deltaFaithfulness)}</Td>
                <Td isNumeric>{formatOptionalTokens(row.deltaTokens)}</Td>
                <Td isNumeric>{row.deltaLatencyMs == null ? 'N/A' : `${row.deltaLatencyMs.toLocaleString()} ms`}</Td>
                <Td isNumeric>{formatOptionalNumber(row.ecrCorrectness, 6)}</Td>
                <Td>{formatOptionalText(row.bestMode)}</Td>
                <Td>{row.routerSelectedMode}</Td>
                <Td isNumeric>{formatOptionalPercent(row.evidenceCoverage)}</Td>
                <Td isNumeric>{formatOptionalPercent(row.unsupportedClaimRatio)}</Td>
                <Td>
                  <HStack spacing={2} wrap="wrap">
                    {(row.risks ?? []).map((risk) => (
                      <Badge key={risk} colorScheme="orange">
                        {risk}
                      </Badge>
                    ))}
                  </HStack>
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </Box>
    </Stack>
  );
}
