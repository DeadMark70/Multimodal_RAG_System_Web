import { Box, Table, Tbody, Td, Text, Th, Thead, Tr, VStack } from '@chakra-ui/react';
import type { EvaluationOverheadSummary, ModeResearchSummary, ResearchTokenBreakdown } from '../../types/evaluation';

export type TokenBreakdownRow = ModeResearchSummary;

const tokens = (value: number | null) => value == null ? 'N/A' : value.toLocaleString();

function unclassified(breakdown: ResearchTokenBreakdown) {
  if (breakdown.total_tokens == null) return null;
  return breakdown.total_tokens - Object.values(breakdown.by_phase).reduce((total, value) => total + value, 0);
}

function PhaseDetail({ breakdown }: { breakdown: ResearchTokenBreakdown }) {
  const phases = Object.entries(breakdown.by_phase);
  return <VStack align="start" spacing={0} fontSize="xs"><Text>{`Accounting: ${breakdown.accounting_status}`}</Text><Text>{`Phase attribution: ${breakdown.phase_attribution_status}`}</Text><Text>{phases.length ? `By phase: ${phases.map(([phase, value]) => `${phase} ${value.toLocaleString()}`).join(', ')}` : 'By phase: N/A'}</Text><Text>{`Unclassified: ${tokens(unclassified(breakdown))}`}</Text></VStack>;
}

export default function TokenBreakdownChart({ rows, evaluationOverhead }: { rows?: TokenBreakdownRow[]; evaluationOverhead?: EvaluationOverheadSummary }) {
  if (!rows?.length && !evaluationOverhead) return <Text color="text.secondary">No token breakdown is available yet.</Text>;
  return <VStack align="stretch" spacing={3}>
    {rows?.length ? <Box overflowX="auto"><Table size="sm"><Thead><Tr><Th>Mode</Th><Th isNumeric>Input</Th><Th isNumeric>Output text</Th><Th isNumeric>Reasoning</Th><Th isNumeric>Other</Th><Th isNumeric>Total</Th><Th>Status</Th></Tr></Thead><Tbody>{rows.map((row) => <Tr key={row.mode}><Td fontWeight="medium">{row.mode}</Td><Td isNumeric>{tokens(row.tokens.input_tokens)}</Td><Td isNumeric>{tokens(row.tokens.output_text_tokens)}</Td><Td isNumeric>{tokens(row.tokens.reasoning_tokens)}</Td><Td isNumeric>{tokens(row.tokens.other_tokens)}</Td><Td isNumeric>{tokens(row.tokens.total_tokens)}</Td><Td><PhaseDetail breakdown={row.tokens} /></Td></Tr>)}</Tbody></Table></Box> : null}
    {evaluationOverhead ? <Box><Text fontWeight="medium">Evaluation overhead (RAGAS)</Text><PhaseDetail breakdown={evaluationOverhead.tokens} /></Box> : null}
  </VStack>;
}
