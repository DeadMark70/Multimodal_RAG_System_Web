import { Box, Table, Tbody, Td, Text, Th, Thead, Tr, VStack } from '@chakra-ui/react';
import type { ModeResearchSummary } from '../../types/evaluation';

export type CostQualityPoint = ModeResearchSummary;
const quality = (value: number | null | undefined) => value == null ? 'N/A' : `${(value * 100).toFixed(1)}%`;

export default function CostQualityScatter({ modes, points }: { modes?: ModeResearchSummary[]; points?: CostQualityPoint[] }) {
  const source = modes ?? points ?? [];
  const hasQuality = (mode: ModeResearchSummary) => mode.quality.answer_correctness?.value != null && mode.quality.faithfulness?.value != null;
  const comparable = source.filter((mode) => mode.comparable && mode.execution_cost.benchmark_usd != null && hasQuality(mode));
  const excluded = source.filter((mode) => !mode.comparable || mode.execution_cost.benchmark_usd == null || !hasQuality(mode));
  if (!comparable.length && !excluded.length) return <Text color="text.secondary">No cost-quality rows are available for this campaign yet.</Text>;
  return <VStack align="stretch" spacing={2}>{comparable.length ? <Box overflowX="auto"><Table size="sm"><Thead><Tr><Th>Mode</Th><Th>Quality Mix</Th><Th isNumeric>Benchmark cost</Th><Th isNumeric>Tokens</Th></Tr></Thead><Tbody>{comparable.map((point) => <Tr key={point.mode} data-testid={`cost-quality-${point.mode}`}><Td fontWeight="medium">{point.mode}</Td><Td>{`${quality(point.quality.answer_correctness?.value)} / ${quality(point.quality.faithfulness?.value)}`}</Td><Td isNumeric>{`$${point.execution_cost.benchmark_usd!.toFixed(2)}`}</Td><Td isNumeric>{point.tokens.total_tokens == null ? 'N/A' : point.tokens.total_tokens.toLocaleString()}</Td></Tr>)}</Tbody></Table></Box> : null}{excluded.map((point) => {
    const reasons = new Set(point.not_comparable_reasons);
    if (!point.comparable) reasons.add('not comparable');
    if (point.execution_cost.benchmark_usd == null) reasons.add('unknown pricing');
    if (!hasQuality(point)) reasons.add('missing quality');
    return <Text key={point.mode} fontSize="sm" color="text.secondary">{`${point.mode}: ${[...reasons].join(', ')}`}</Text>;
  })}</VStack>;
}
