import { Badge, Box, Button, HStack, Select, SimpleGrid, Stack, Table, Tbody, Td, Text, Th, Thead, Tr } from '@chakra-ui/react';
import { Fragment, useMemo, useState } from 'react';
import { formatOptionalNumber, formatOptionalPercent, formatOptionalText, formatOptionalTokens } from './evaluationDisplay';

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
  evidenceCoverage: number | null;
  unsupportedClaimRatio: number | null;
  status?: string;
  risks?: string[];
}

const signed = (value: number, digits = 1) => `${value > 0 ? '+' : ''}${value.toFixed(digits)}`;
const percentPoints = (value: number | null) => value == null ? 'N/A' : `${signed(value * 100)} 個百分點`;
const heat = (value: number | null) => value == null || value === 0 ? undefined : value > 0 ? 'green.50' : 'red.50';
const modeLabel = (value: string | null) => ({ agentic: 'Agentic RAG', naive: 'Naive RAG', advanced: 'Advanced RAG', graph: 'Graph RAG' }[value ?? ''] ?? formatOptionalText(value));
const statusLabel = (value: string) => ({ complete: '資料完整', incomplete_accounting: '用量不完整', incomplete_quality: '評分不完整', baseline_missing: '缺少 Naive 基準', comparison_mode_missing: '缺少 Agentic 結果', unknown: '尚無狀態' }[value] ?? value);

export default function QuestionAnalysisTab({ rows }: { rows?: QuestionDeltaRow[] }) {
  const [category, setCategory] = useState('all');
  const [status, setStatus] = useState('all');
  const [sort, setSort] = useState('question');
  const [expanded, setExpanded] = useState<string | null>(null);
  const categories = useMemo(() => ['all', ...new Set((rows ?? []).map((row) => row.category ?? 'n/a'))], [rows]);
  const statuses = useMemo(() => ['all', ...new Set((rows ?? []).map((row) => row.status ?? 'unknown'))], [rows]);
  const filteredRows = useMemo(() => {
    const filtered = (rows ?? []).filter((row) => (category === 'all' || (row.category ?? 'n/a') === category) && (status === 'all' || (row.status ?? 'unknown') === status));
    return filtered.sort((a, b) => {
      const byQuestion = a.questionId.localeCompare(b.questionId, undefined, { numeric: true });
      if (sort === 'question') return byQuestion;
      const aValue = sort.startsWith('faithfulness') ? a.deltaFaithfulness : a.deltaCorrectness;
      const bValue = sort.startsWith('faithfulness') ? b.deltaFaithfulness : b.deltaCorrectness;
      if (aValue == null) return bValue == null ? byQuestion : 1;
      if (bValue == null) return -1;
      return (sort.endsWith('desc') ? bValue - aValue : aValue - bValue) || byQuestion;
    });
  }, [category, rows, sort, status]);

  if (!rows?.length) return <Text color="text.secondary">完成模式比較後，這裡會顯示逐題分析。</Text>;
  return <Stack spacing={4}>
    <Text fontSize="sm" color="text.secondary">差異＝Agentic RAG − Naive RAG。品質為正值表示 Agentic 較高；時間為正值表示耗時較長。N/A 表示缺少比較資料。排序與篩選套用於目前已載入的題目。</Text>
    <HStack spacing={3} align="end" flexWrap="wrap">
      <Box><Text as="label" htmlFor="question-category-filter" fontSize="sm">題目分類</Text>
        <Select id="question-category-filter" size="sm" value={category} onChange={(event) => setCategory(event.target.value)}>
          {categories.map((option) => <option key={option} value={option}>{option === 'all' ? '全部分類' : option === 'n/a' ? '未分類' : option}</option>)}
        </Select></Box>
      <Box><Text as="label" htmlFor="question-status-filter" fontSize="sm">資料狀態</Text>
        <Select id="question-status-filter" size="sm" value={status} onChange={(event) => setStatus(event.target.value)}>
          {statuses.map((option) => <option key={option} value={option}>{option === 'all' ? '全部狀態' : statusLabel(option)}</option>)}
        </Select></Box>
      <Box><Text as="label" htmlFor="question-sort" fontSize="sm">排序</Text>
        <Select id="question-sort" size="sm" value={sort} onChange={(event) => setSort(event.target.value)}>
          <option value="question">題號順序</option><option value="correctness-asc">正確度退步優先</option><option value="correctness-desc">正確度提升優先</option><option value="faithfulness-asc">忠實度退步優先</option><option value="faithfulness-desc">忠實度提升優先</option>
        </Select></Box>
    </HStack>
    <Box overflow="auto" maxH="70vh" borderWidth="1px" borderRadius="md">
      <Table size="sm" minW="860px" aria-label="逐題模式比較">
        <Thead position="sticky" top={0} zIndex={1} bg="bg.panel"><Tr><Th>題目</Th><Th>分類</Th><Th isNumeric>正確度差異</Th><Th isNumeric>忠實度差異</Th><Th isNumeric>作答時間差異</Th><Th>資料狀態</Th></Tr></Thead>
        <Tbody>{filteredRows.map((row) => <Fragment key={row.questionId}>
          <Tr>
            <Td><Button size="sm" variant="link" aria-label={`題目 ${row.questionId} 詳細資料`} aria-expanded={expanded === row.questionId} onClick={() => setExpanded(expanded === row.questionId ? null : row.questionId)}>{row.questionId}</Button></Td>
            <Td>{formatOptionalText(row.category)}</Td>
            <Td isNumeric bg={heat(row.deltaCorrectness)} color={row.deltaCorrectness ? 'gray.800' : undefined}>{percentPoints(row.deltaCorrectness)}</Td>
            <Td isNumeric bg={heat(row.deltaFaithfulness)} color={row.deltaFaithfulness ? 'gray.800' : undefined}>{percentPoints(row.deltaFaithfulness)}</Td>
            <Td isNumeric>{row.deltaLatencyMs == null ? 'N/A' : `${signed(row.deltaLatencyMs / 1000, 2)} 秒`}</Td>
            <Td><Badge colorScheme={row.status === 'complete' ? 'green' : 'orange'} whiteSpace="normal" overflowWrap="anywhere">{statusLabel(row.status ?? 'unknown')}</Badge></Td>
          </Tr>
          {expanded === row.questionId ? <Tr><Td colSpan={6} bg="bg.panel"><Stack spacing={3} py={2}>
            <SimpleGrid columns={{ base: 1, md: 3 }} spacing={3} fontSize="sm">
              <Text>難度：{formatOptionalText(row.difficulty)}</Text>
              <Text>所需資料類型：{row.requiredModalities.join(', ') || '未紀錄'}</Text>
              <Text>Token 差異：{formatOptionalTokens(row.deltaTokens)}</Text>
              <Text>正確度優先排名：{modeLabel(row.bestMode)}</Text>
              <Text>ECR 正確度效率：{formatOptionalNumber(row.ecrCorrectness, 6)}</Text>
              <Text>證據涵蓋率：{formatOptionalPercent(row.evidenceCoverage)}</Text>
              <Text>未支持陳述比例：{formatOptionalPercent(row.unsupportedClaimRatio)}</Text>
            </SimpleGrid>
            <Text fontSize="xs" color="text.secondary">排名以正確度優先，同分再看忠實度、Token 用量與模式名稱；不代表每項指標都較好。N/A 的進階指標表示目前沒有可用數值。</Text>
            <HStack flexWrap="wrap">{(row.risks ?? []).map((risk) => <Badge key={risk} colorScheme="orange" whiteSpace="normal" overflowWrap="anywhere">{statusLabel(risk)}</Badge>)}</HStack>
          </Stack></Td></Tr> : null}
        </Fragment>)}</Tbody>
      </Table>
      {!filteredRows.length ? <Text p={4} color="text.secondary">沒有符合篩選條件的題目。</Text> : null}
    </Box>
  </Stack>;
}
