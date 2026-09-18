import { Box, Table, Tbody, Td, Text, Th, Thead, Tr, VStack } from '@chakra-ui/react';
import type { EvaluationOverheadSummary, ModeResearchSummary, ResearchTokenBreakdown } from '../../types/evaluation';

export type TokenBreakdownRow = ModeResearchSummary;

const tokens = (value: number | null) => value == null ? 'N/A' : value.toLocaleString();

function unclassified(breakdown: ResearchTokenBreakdown): number | null {
  if (Object.hasOwn(breakdown.by_phase, 'unclassified')) return breakdown.by_phase.unclassified;
  return breakdown.phase_attribution_status === 'complete' ? 0 : null;
}

function PhaseDetail({ breakdown }: { breakdown: ResearchTokenBreakdown }) {
  const phases = Object.entries(breakdown.by_phase);
  return <VStack align="start" spacing={0} fontSize="xs"><Text>{`Accounting: ${breakdown.accounting_status}`}</Text><Text>{`Phase attribution: ${breakdown.phase_attribution_status}`}</Text><Text>{phases.length ? `By phase: ${phases.map(([phase, value]) => `${phase} ${value.toLocaleString()}`).join(', ')}` : 'By phase: N/A'}</Text><Text>{`Unclassified: ${tokens(unclassified(breakdown))}`}</Text></VStack>;
}

function CacheDetail({ breakdown }: { breakdown: ResearchTokenBreakdown }) {
  const percent = (value: number | null | undefined) => value == null ? 'N/A' : `${(value * 100).toFixed(1)}%`;
  return <VStack align="start" spacing={0} fontSize="xs">
    <Text>Gemini prompt cache：{percent(breakdown.cache_read_ratio)}</Text>
    <Text>快取輸入：{tokens(breakdown.cached_input_tokens ?? null)} / {tokens(breakdown.cache_observed_input_tokens ?? null)} tokens</Text>
    <Text>命中請求：{percent(breakdown.cache_hit_call_ratio)} · 資料涵蓋率：{percent(breakdown.cache_usage_coverage)}</Text>
    {breakdown.cache_read_ratio == null ? <Text color="text.secondary">尚無可判讀的快取用量，N/A 不代表命中率為 0%。</Text> : null}
    {breakdown.service_tiers?.length ? <Text>服務等級：{breakdown.service_tiers.join(', ')}</Text> : null}
  </VStack>;
}

export function ScoringCost({ overhead }: { overhead: EvaluationOverheadSummary }) {
  const reasons: Record<string, string> = {
    unavailable_usage: '缺少或不完整的用量', unknown_model: '無此模型的價格',
    missing_price: '缺少對應費率', missing_estimate: '缺少費用紀錄',
  };
  const money = (value: number) => value > 0 && value < 0.0001 ? '< US$0.0001' : `US$${value.toFixed(4)}`;
  return <VStack align="start" spacing={0} fontSize="sm">
    <Text>評分模型：{overhead.evaluator_models.join(', ') || 'N/A'}</Text>
    {overhead.cost_usd != null ? <Text>估算費用：{money(overhead.cost_usd)}</Text>
      : overhead.known_cost_usd != null ? <Text>已知呼叫小計：{money(overhead.known_cost_usd)}（部分估算）</Text>
        : <Text>估算費用：N/A（尚無可估價的呼叫）</Text>}
    {overhead.priced_call_count != null ? <Text>已估價：{overhead.priced_call_count} 次 · 未估價：{overhead.unpriced_call_count ?? 0} 次</Text> : null}
    {Object.entries(overhead.unpriced_reasons ?? {}).map(([reason, count]) => <Text key={reason} color="text.secondary">{reasons[reason] ?? reason}：{count} 次</Text>)}
    {(overhead.unpriced_call_count ?? 0) > 0 ? <Text color="text.secondary">未估價的呼叫未列入小計；完整費用仍未知，請勿將小計視為帳單總額。</Text> : null}
  </VStack>;
}

export default function TokenBreakdownChart({ rows, evaluationOverhead, showScoringCost = true }: { rows?: TokenBreakdownRow[]; evaluationOverhead?: EvaluationOverheadSummary; showScoringCost?: boolean }) {
  if (!rows?.length && !evaluationOverhead) return <Text color="text.secondary">No token breakdown is available yet.</Text>;
  return <VStack align="stretch" spacing={3}>
    {rows?.length ? <Box overflowX="auto"><Table size="sm"><Thead><Tr><Th>Mode</Th><Th isNumeric>Input</Th><Th isNumeric>Output text</Th><Th isNumeric>Reasoning</Th><Th isNumeric>Other</Th><Th isNumeric>Total</Th><Th>Status</Th></Tr></Thead><Tbody>{rows.map((row) => <Tr key={row.mode}><Td fontWeight="medium">{row.mode}</Td><Td isNumeric>{tokens(row.tokens.input_tokens)}</Td><Td isNumeric>{tokens(row.tokens.output_text_tokens)}</Td><Td isNumeric>{tokens(row.tokens.reasoning_tokens)}</Td><Td isNumeric>{tokens(row.tokens.other_tokens)}</Td><Td isNumeric>{tokens(row.tokens.total_tokens)}</Td><Td><PhaseDetail breakdown={row.tokens} /></Td></Tr>)}</Tbody></Table></Box> : null}
    {rows?.map((row) => <Box key={`cache-${row.mode}`}><Text fontWeight="medium">{row.mode} 作答快取</Text><CacheDetail breakdown={row.tokens} /></Box>)}
    {evaluationOverhead ? <Box><Text fontWeight="medium">評分用量與快取（RAGAS）</Text>{showScoringCost ? <ScoringCost overhead={evaluationOverhead} /> : null}<PhaseDetail breakdown={evaluationOverhead.tokens} /><CacheDetail breakdown={evaluationOverhead.tokens} /></Box> : null}
  </VStack>;
}
