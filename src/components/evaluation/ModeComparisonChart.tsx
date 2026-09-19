import { Box, Table, Tbody, Td, Text, Th, Thead, Tr, VStack } from '@chakra-ui/react';
import type { ModeResearchSummary, ResearchMetricObservation } from '../../types/evaluation';

export type ModeComparisonRow = ModeResearchSummary;

function MetricCell({ observation }: { observation: ResearchMetricObservation | undefined }) {
  const metadata = observation ? `${observation.valid_samples} 有效 · ${observation.missing_samples} 缺少 · ${observation.failed_samples} 失敗` : '尚無評分';
  return <VStack align="start" spacing={0}><Text>{observation?.value == null ? 'N/A' : `${(observation.value * 100).toFixed(1)}%`}</Text><Text fontSize="xs" color="text.secondary">{observation?.status === 'complete' ? `${observation.valid_samples} 筆有效評分` : metadata}</Text></VStack>;
}

export default function ModeComparisonChart({ rows }: { rows?: ModeComparisonRow[] }) {
  if (!rows?.length) return <Text color="text.secondary">No mode comparison data for this campaign yet.</Text>;
  const labels: Record<string, string> = { naive: 'Naive RAG', agentic: 'Agentic RAG', advanced: 'Advanced RAG', graph: 'Graph RAG' };
  return <Box overflowX="auto"><Table size="sm" minW="760px" aria-label="模式比較"><Thead><Tr><Th>模式</Th><Th>正確度</Th><Th>忠實度</Th><Th>相關性</Th><Th isNumeric>平均作答時間</Th><Th isNumeric>平均每份答案費用</Th><Th isNumeric>完成答案</Th></Tr></Thead><Tbody>{rows.map((row) => {
    const average = row.execution_cost.benchmark_usd != null && row.sample_count > 0 ? row.execution_cost.benchmark_usd / row.sample_count : null;
    return <Tr key={row.mode}><Td fontWeight="medium">{labels[row.mode] ?? row.mode}</Td><Td><MetricCell observation={row.quality.answer_correctness} /></Td><Td><MetricCell observation={row.quality.faithfulness} /></Td><Td><MetricCell observation={row.quality.answer_relevancy} /></Td><Td isNumeric>{row.latency.mean_ms == null ? 'N/A' : `${(row.latency.mean_ms / 1000).toFixed(2)} 秒`}</Td><Td isNumeric>{average == null ? 'N/A' : average > 0 && average < 0.0001 ? '< US$0.0001' : `US$${average.toFixed(4)}`}</Td><Td isNumeric>{row.sample_count}</Td></Tr>;
  })}</Tbody></Table></Box>;
}
