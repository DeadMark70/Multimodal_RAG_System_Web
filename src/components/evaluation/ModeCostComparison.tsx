import { Box, Heading, Stack, Table, Tbody, Td, Text, Th, Thead, Tr } from '@chakra-ui/react';
import type { ModeCostSummary } from '../../types/evaluation';

const modeLabels: Record<string, string> = {
  naive: 'Naive RAG', advanced: 'Advanced RAG', graph: 'Graph RAG', agentic: 'Agentic RAG',
};
const money = (value: number | null | undefined) => value == null ? 'N/A'
  : value > 0 && value < 0.0001 ? '< US$0.0001' : `US$${value.toFixed(4)}`;

export default function ModeCostComparison({ rows }: { rows: ModeCostSummary[] }) {
  return <Stack spacing={2}>
    <Heading size="sm">各模式作答成本</Heading>
    <Text fontSize="sm" color="text.secondary">比較各模式作答 LLM 的 Token 費用（USD）；RAGAS 評分成本另列。</Text>
    {rows.length ? <Box overflowX="auto">
      <Table size="sm" minW="760px" aria-label="各模式作答成本">
        <Thead><Tr><Th>模式</Th><Th isNumeric>完成答案數</Th><Th isNumeric>目前答案費用</Th><Th isNumeric>平均每份答案</Th><Th isNumeric>累計費用（含重跑）</Th></Tr></Thead>
        <Tbody>{rows.map((row) => {
          const cost = row.execution_cost;
          const average = cost.benchmark_usd != null && row.completed_run_count > 0
            ? cost.benchmark_usd / row.completed_run_count : null;
          return <Tr key={row.mode}>
            <Td fontWeight="medium">{modeLabels[row.mode] ?? row.mode}</Td>
            <Td isNumeric>{row.completed_run_count}</Td>
            <Td isNumeric>{money(cost.benchmark_usd)}</Td>
            <Td isNumeric>{money(average)}</Td>
            <Td isNumeric>
              <Text>{money(cost.operational_usd ?? cost.known_cost_usd)}</Text>
              {cost.operational_usd == null && cost.known_cost_usd != null ? <Text fontSize="xs" color="orange.600">已知小計，資料不完整</Text> : null}
              <Text fontSize="xs" color="text.secondary">已估價 {cost.priced_call_count} 次 · 未估價 {cost.unpriced_call_count} 次</Text>
            </Td>
          </Tr>;
        })}</Tbody>
      </Table>
    </Box> : <Text color="text.secondary">尚無各模式作答費用資料。</Text>}
    <Text fontSize="xs" color="text.secondary">目前答案費用只計保留下來的完成答案；累計費用包含該模式的歷次作答、失敗與重跑。N/A 表示資料不足；已知小計不包含未估價或無法歸屬的呼叫。</Text>
  </Stack>;
}
