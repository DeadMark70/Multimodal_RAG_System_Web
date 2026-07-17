import { Box, Table, Tbody, Td, Text, Th, Thead, Tr, VStack } from '@chakra-ui/react';
import type { ModeResearchSummary, ResearchMetricObservation } from '../../types/evaluation';

export type ModeComparisonRow = ModeResearchSummary;

function MetricCell({ observation }: { observation: ResearchMetricObservation | undefined }) {
  const metadata = observation ? `${observation.valid_samples} valid · ${observation.missing_samples} missing · ${observation.failed_samples} failed` : 'No observation';
  return <VStack align="start" spacing={0}><Text>{observation?.value == null ? 'N/A' : `${(observation.value * 100).toFixed(1)}%`}</Text><Text fontSize="xs" color="text.secondary">{metadata}</Text></VStack>;
}

export default function ModeComparisonChart({ rows }: { rows?: ModeComparisonRow[] }) {
  if (!rows?.length) return <Text color="text.secondary">No mode comparison data for this campaign yet.</Text>;
  return <Box overflowX="auto"><Table size="sm"><Thead><Tr><Th>Mode</Th><Th>Correctness</Th><Th>Faithfulness</Th><Th>Relevancy</Th><Th isNumeric>Runs</Th></Tr></Thead><Tbody>{rows.map((row) => <Tr key={row.mode}><Td fontWeight="medium">{row.mode}</Td><Td><MetricCell observation={row.quality.answer_correctness} /></Td><Td><MetricCell observation={row.quality.faithfulness} /></Td><Td><MetricCell observation={row.quality.answer_relevancy} /></Td><Td isNumeric>{row.sample_count}</Td></Tr>)}</Tbody></Table></Box>;
}
