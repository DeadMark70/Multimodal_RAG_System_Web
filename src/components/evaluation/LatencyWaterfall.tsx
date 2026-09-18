import { Box, Table, Tbody, Td, Text, Th, Thead, Tr } from '@chakra-ui/react';
import type { ModeResearchSummary } from '../../types/evaluation';
export type LatencyStage = ModeResearchSummary;
const seconds = (value: number | null) => value == null ? 'N/A' : `${(value / 1000).toFixed(2)} 秒`;
export default function LatencyWaterfall({ rows, stages }: { rows?: ModeResearchSummary[]; stages?: LatencyStage[] }) {
  const source = rows ?? stages;
  if (!source?.length) return <Text color="text.secondary">尚無作答時間資料。</Text>;
  return <Box overflowX="auto"><Table size="sm"><Thead><Tr><Th>模式</Th><Th isNumeric>平均</Th><Th isNumeric>P50</Th><Th isNumeric>P95</Th><Th isNumeric>樣本數</Th><Th>計算方法</Th></Tr></Thead><Tbody>{source.map((row) => <Tr key={row.mode}><Td fontWeight="medium">{row.mode}{row.latency.low_sample_size ? <Text fontSize="xs" color="orange.400">{`樣本較少（n=${row.latency.sample_count}）`}</Text> : null}</Td><Td isNumeric>{seconds(row.latency.mean_ms)}</Td><Td isNumeric>{seconds(row.latency.p50_ms)}</Td><Td isNumeric>{seconds(row.latency.p95_ms)}</Td><Td isNumeric>{row.latency.sample_count}</Td><Td>{row.latency.method}</Td></Tr>)}</Tbody></Table></Box>;
}
