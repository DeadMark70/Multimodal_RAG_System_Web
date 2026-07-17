import { Box, Table, Tbody, Td, Text, Th, Thead, Tr } from '@chakra-ui/react';
import type { ModeResearchSummary } from '../../types/evaluation';
export type LatencyStage = ModeResearchSummary;
const milliseconds = (value: number | null) => value == null ? 'N/A' : `${value.toLocaleString()} ms`;
export default function LatencyWaterfall({ rows, stages }: { rows?: ModeResearchSummary[]; stages?: LatencyStage[] }) {
  const source = rows ?? stages;
  if (!source?.length) return <Text color="text.secondary">No measured latency data is available yet.</Text>;
  return <Box overflowX="auto"><Table size="sm"><Thead><Tr><Th>Mode</Th><Th isNumeric>Mean</Th><Th isNumeric>P50</Th><Th isNumeric>P95</Th><Th isNumeric>Samples</Th><Th>Method</Th></Tr></Thead><Tbody>{source.map((row) => <Tr key={row.mode}><Td fontWeight="medium">{row.mode}{row.latency.low_sample_size ? <Text fontSize="xs" color="orange.400">{`Low sample size (n=${row.latency.sample_count})`}</Text> : null}</Td><Td isNumeric>{milliseconds(row.latency.mean_ms)}</Td><Td isNumeric>{milliseconds(row.latency.p50_ms)}</Td><Td isNumeric>{milliseconds(row.latency.p95_ms)}</Td><Td isNumeric>{row.latency.sample_count}</Td><Td>{row.latency.method}</Td></Tr>)}</Tbody></Table></Box>;
}
