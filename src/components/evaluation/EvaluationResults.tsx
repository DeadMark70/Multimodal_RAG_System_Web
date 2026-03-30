import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Badge,
  Box,
  Button,
  Checkbox,
  FormControl,
  FormLabel,
  Grid,
  GridItem,
  HStack,
  Heading,
  Select,
  Spinner,
  Stack,
  Table,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
  VStack,
  Wrap,
  WrapItem,
  useToast,
} from '@chakra-ui/react';
import {
  evaluateCampaign,
  getCampaignMetrics,
  listCampaigns,
} from '../../services/evaluationApi';
import type {
  CampaignMetricName,
  CampaignMetricRow,
  CampaignMetricsResponse,
  CampaignMode,
  CampaignStatus,
  DeltaGroupSummary,
  DeltaModeSummary,
  GroupMetricsSummary,
  ModeMetricsSummary,
} from '../../types/evaluation';
import StabilityChart from '../charts/StabilityChart';

const MODE_LABELS: Record<CampaignMode, string> = {
  naive: 'Naive',
  advanced: 'Advanced',
  graph: 'Graph',
  agentic: 'Agentic',
};

function downloadTextFile(filename: string, content: string, mimeType: string): void {
  const blob = new Blob([content], { type: `${mimeType};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function csvCell(value: string | number | null | undefined): string {
  if (value == null) {
    return '';
  }
  const text = String(value);
  if (text.includes(',') || text.includes('"') || text.includes('\n')) {
    return `"${text.replaceAll('"', '""')}"`;
  }
  return text;
}

function metricLabel(metric: string): string {
  return metric
    .split('_')
    .map((token) => token.charAt(0).toUpperCase() + token.slice(1))
    .join(' ');
}

function ecrColor(ecr?: number | null): string {
  if (ecr == null) {
    return 'gray';
  }
  if (ecr > 2) {
    return 'green';
  }
  if (ecr >= 1) {
    return 'yellow';
  }
  return 'red';
}

function ecrLabel(ecr?: number | null): string {
  if (ecr == null) {
    return 'N/A';
  }
  return `${ecr.toFixed(2)}%`;
}

function deltaLabel(delta?: number | null, digits = 3): string {
  if (delta == null) {
    return 'N/A';
  }
  return delta.toFixed(digits);
}

function normalizeEcrNote(note?: string | null): string {
  if (!note) {
    return '-';
  }
  if (note === 'baseline_missing') {
    return 'baseline_missing';
  }
  if (note === 'non_positive_marginal_cost') {
    return 'non_positive_marginal_cost';
  }
  if (note === 'marginal_cost_too_small') {
    return 'marginal_cost_too_small';
  }
  if (note === 'insufficient_valid_samples') {
    return 'insufficient_valid_samples';
  }
  return note;
}

function ecrDirectionColor(
  direction?: 'positive' | 'neutral' | 'negative'
): string {
  if (!direction || direction === 'neutral') {
    return 'gray';
  }
  if (direction === 'positive') {
    return 'green';
  }
  return 'red';
}

function ecrDirectionLabel(
  direction?: 'positive' | 'neutral' | 'negative'
): string {
  if (!direction) {
    return 'neutral';
  }
  return direction;
}

function questionDelta(
  metrics: CampaignMetricsResponse,
  questionId: string,
  mode: CampaignMode
): DeltaModeSummary | null {
  const group = metrics.delta_by_question?.[questionId];
  if (!group) {
    return null;
  }
  return group.by_mode?.[mode] ?? null;
}

function metricValueLabel(row: CampaignMetricRow, metric: string): string {
  if (row.invalid_metrics?.[metric]) {
    return 'N/A';
  }
  const value = row.metric_values?.[metric];
  if (value == null) {
    return 'N/A';
  }
  return value.toFixed(3);
}

function metricsToCsv(metrics: CampaignMetricsResponse, selectedMetric: CampaignMetricName): string {
  const metricHeaders = metrics.available_metrics;
  const headers = [
    'campaign_result_id',
    'question_id',
    'question',
    'mode',
    'run_number',
    'category',
    'difficulty',
    'ragas_focus',
    'reference_source',
    'total_tokens',
    'selected_metric',
    'selected_metric_value',
    'selected_metric_invalid',
    'invalid_reason',
    'delta_answer_correctness',
    'delta_faithfulness',
    'delta_total_tokens',
    'ecr',
    'ecr_note',
    'ecr_direction_correctness',
    'ecr_faithfulness',
    'ecr_faithfulness_note',
    'ecr_direction_faithfulness',
    ...metricHeaders,
  ];
  const rows = metrics.rows.map((row) =>
    {
      const delta = questionDelta(metrics, row.question_id, row.mode);
      const selectedMetricInvalid = Boolean(row.invalid_metrics?.[selectedMetric]);
      const selectedMetricValue = selectedMetricInvalid
        ? ''
        : (row.metric_values[selectedMetric] ?? '');
      const invalidReason = row.invalid_reasons?.[selectedMetric] ?? '';
      return [
        row.campaign_result_id,
        row.question_id,
        row.question,
        row.mode,
        row.run_number,
        row.category,
        row.difficulty,
        row.ragas_focus.join('|'),
        row.reference_source,
        row.total_tokens,
        selectedMetric,
        selectedMetricValue,
        selectedMetricInvalid,
        invalidReason,
        delta?.delta_answer_correctness ?? '',
        delta?.delta_faithfulness ?? '',
        delta?.delta_total_tokens ?? '',
        delta?.ecr ?? '',
        delta?.ecr_note ?? '',
        delta?.ecr_direction_correctness ?? '',
        delta?.ecr_faithfulness ?? '',
        delta?.ecr_faithfulness_note ?? '',
        delta?.ecr_direction_faithfulness ?? '',
        ...metricHeaders.map((metric) => row.metric_values[metric] ?? 0),
      ]
        .map(csvCell)
        .join(',');
    }
  );
  return [headers.join(','), ...rows].join('\n');
}

function metricMean(summary: GroupMetricsSummary | ModeMetricsSummary | undefined, metric: string): number {
  return summary?.metric_summaries?.[metric]?.mean ?? 0;
}

function metricMax(summary: GroupMetricsSummary | ModeMetricsSummary | undefined, metric: string): number {
  return summary?.metric_summaries?.[metric]?.max ?? 0;
}

function metricStd(summary: GroupMetricsSummary | ModeMetricsSummary | undefined, metric: string): number {
  return summary?.metric_summaries?.[metric]?.stddev ?? 0;
}

function sortedGroupEntries(groups: Record<string, GroupMetricsSummary>): GroupMetricsSummary[] {
  return Object.values(groups).sort((left, right) => left.group_key.localeCompare(right.group_key));
}

function sortedDeltaGroupEntries(groups: Record<string, DeltaGroupSummary>): DeltaGroupSummary[] {
  return Object.values(groups).sort((left, right) => left.group_key.localeCompare(right.group_key));
}

function flattenDeltaGroups(groups: DeltaGroupSummary[]): Array<{ groupKey: string; summary: DeltaModeSummary }> {
  return groups.flatMap((group) =>
    Object.values(group.by_mode)
      .filter((summary): summary is DeltaModeSummary => summary !== undefined)
      .sort((left, right) => left.mode.localeCompare(right.mode))
      .map((summary) => ({ groupKey: group.group_key, summary }))
  );
}

export default function EvaluationResults() {
  const [campaigns, setCampaigns] = useState<CampaignStatus[]>([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState('');
  const [selectedMetric, setSelectedMetric] = useState<CampaignMetricName>('answer_correctness');
  const [metrics, setMetrics] = useState<CampaignMetricsResponse | null>(null);
  const [loadingCampaigns, setLoadingCampaigns] = useState(true);
  const [loadingMetrics, setLoadingMetrics] = useState(false);
  const [rerunning, setRerunning] = useState(false);
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<string[]>([]);
  const toast = useToast();

  const selectedCampaign = useMemo(
    () => campaigns.find((campaign) => campaign.id === selectedCampaignId) ?? null,
    [campaigns, selectedCampaignId]
  );

  const reloadCampaigns = useCallback(async () => {
    const items = await listCampaigns();
    setCampaigns(items);
    setSelectedCampaignId((current) => {
      if (current && items.some((campaign) => campaign.id === current)) {
        return current;
      }
      return items[0]?.id ?? '';
    });
    return items;
  }, []);

  const loadMetrics = useCallback(async (campaignId: string) => {
    setLoadingMetrics(true);
    try {
      const response = await getCampaignMetrics(campaignId);
      setMetrics(response);
    } catch (error) {
      toast({
        title: '載入分析結果失敗',
        description: error instanceof Error ? error.message : '未知錯誤',
        status: 'error',
      });
    } finally {
      setLoadingMetrics(false);
    }
  }, [toast]);

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      setLoadingCampaigns(true);
      try {
        const items = await listCampaigns();
        if (!mounted) {
          return;
        }
        setCampaigns(items);
        setSelectedCampaignId(items[0]?.id ?? '');
      } catch (error) {
        toast({
          title: '載入 campaigns 失敗',
          description: error instanceof Error ? error.message : '未知錯誤',
          status: 'error',
        });
      } finally {
        if (mounted) {
          setLoadingCampaigns(false);
        }
      }
    };
    void run();
    return () => {
      mounted = false;
    };
  }, [toast]);

  useEffect(() => {
    if (!selectedCampaignId) {
      setMetrics(null);
      return;
    }
    void loadMetrics(selectedCampaignId);
  }, [loadMetrics, selectedCampaignId]);

  useEffect(() => {
    if (!selectedCampaign || selectedCampaign.status !== 'evaluating') {
      return;
    }
    const timer = window.setInterval(() => {
      void reloadCampaigns();
      void loadMetrics(selectedCampaign.id);
    }, 1500);
    return () => window.clearInterval(timer);
  }, [loadMetrics, reloadCampaigns, selectedCampaign]);

  useEffect(() => {
    if (!metrics) {
      return;
    }
    if (metrics.available_metrics.includes(selectedMetric)) {
      return;
    }
    setSelectedMetric(metrics.available_metrics.includes('answer_correctness') ? 'answer_correctness' : metrics.available_metrics[0] ?? 'answer_correctness');
  }, [metrics, selectedMetric]);

  const handleRerun = async () => {
    if (!selectedCampaignId) {
      return;
    }
    setRerunning(true);
    try {
      await evaluateCampaign(
        selectedCampaignId,
        selectedQuestionIds.length > 0
          ? { question_ids: selectedQuestionIds }
          : undefined
      );
      await reloadCampaigns();
      await loadMetrics(selectedCampaignId);
      toast({
        title:
          selectedQuestionIds.length > 0
            ? `已重新啟動 RAGAS 評估（${selectedQuestionIds.length} 題）`
            : '已重新啟動 RAGAS 評估',
        status: 'success',
      });
    } catch (error) {
      toast({
        title: '重新評估失敗',
        description: error instanceof Error ? error.message : '未知錯誤',
        status: 'error',
      });
    } finally {
      setRerunning(false);
    }
  };

  const toggleQuestionSelection = useCallback((questionId: string) => {
    setSelectedQuestionIds((current) =>
      current.includes(questionId)
        ? current.filter((item) => item !== questionId)
        : [...current, questionId]
    );
  }, []);

  const clearSelectedQuestions = useCallback(() => {
    setSelectedQuestionIds([]);
  }, []);

  const selectAllQuestions = useCallback(() => {
    const allQuestionIds = [...new Set(metrics?.rows.map((row) => row.question_id) ?? [])].sort(
      (left, right) => left.localeCompare(right)
    );
    setSelectedQuestionIds(allQuestionIds);
  }, [metrics]);

  const summaryEntries = useMemo(
    () =>
      Object.values(metrics?.summary_by_mode ?? {}).filter(
        (entry): entry is ModeMetricsSummary => entry !== undefined
      ),
    [metrics]
  );

  const categoryEntries = useMemo(
    () => sortedGroupEntries(metrics?.summary_by_category ?? {}),
    [metrics]
  );

  const focusEntries = useMemo(
    () => sortedGroupEntries(metrics?.summary_by_focus ?? {}),
    [metrics]
  );

  const deltaCategoryEntries = useMemo(
    () => sortedDeltaGroupEntries(metrics?.delta_by_category ?? {}),
    [metrics]
  );

  const deltaDifficultyEntries = useMemo(
    () => sortedDeltaGroupEntries(metrics?.delta_by_difficulty ?? {}),
    [metrics]
  );

  const deltaQuestionEntries = useMemo(
    () => sortedDeltaGroupEntries(metrics?.delta_by_question ?? {}),
    [metrics]
  );

  const availableQuestionIds = useMemo(
    () => [...new Set(metrics?.rows.map((row) => row.question_id) ?? [])].sort((left, right) => left.localeCompare(right)),
    [metrics]
  );

  const deltaCategoryRows = useMemo(
    () => flattenDeltaGroups(deltaCategoryEntries),
    [deltaCategoryEntries]
  );

  const deltaDifficultyRows = useMemo(
    () => flattenDeltaGroups(deltaDifficultyEntries),
    [deltaDifficultyEntries]
  );

  const deltaQuestionRows = useMemo(
    () => flattenDeltaGroups(deltaQuestionEntries),
    [deltaQuestionEntries]
  );

  useEffect(() => {
    setSelectedQuestionIds((current) =>
      current.filter((questionId) => availableQuestionIds.includes(questionId))
    );
  }, [availableQuestionIds]);

  const handleExportJson = useCallback(() => {
    if (!metrics) {
      return;
    }
    downloadTextFile(
      `campaign-${metrics.campaign.id}-metrics.json`,
      `${JSON.stringify(metrics, null, 2)}\n`,
      'application/json'
    );
  }, [metrics]);

  const handleExportCsv = useCallback(() => {
    if (!metrics) {
      return;
    }
    downloadTextFile(
      `campaign-${metrics.campaign.id}-metrics.csv`,
      metricsToCsv(metrics, selectedMetric),
      'text/csv'
    );
  }, [metrics, selectedMetric]);

  if (loadingCampaigns) {
    return (
      <HStack py={8} justify="center">
        <Spinner />
        <Text>載入結果分析...</Text>
      </HStack>
    );
  }

  if (campaigns.length === 0) {
    return <Text color="gray.500">尚未建立任何 campaign，因此目前沒有可分析的結果。</Text>;
  }

  return (
    <VStack align="stretch" spacing={6}>
      <Box borderWidth="1px" borderRadius="lg" p={5}>
        <HStack justify="space-between" align="flex-end" flexWrap="wrap" gap={4}>
          <Box minW={{ base: '100%', md: '320px' }}>
            <Text fontWeight="medium" mb={2}>Campaign</Text>
            <Select value={selectedCampaignId} onChange={(event) => setSelectedCampaignId(event.target.value)}>
              {campaigns.map((campaign) => (
                <option key={campaign.id} value={campaign.id}>
                  {(campaign.name || campaign.id)} ({campaign.status})
                </option>
              ))}
            </Select>
          </Box>
          <HStack>
            <Button variant="outline" onClick={handleExportJson} isDisabled={!metrics}>
              匯出 JSON
            </Button>
            <Button variant="outline" onClick={handleExportCsv} isDisabled={!metrics}>
              匯出 CSV
            </Button>
            {selectedCampaign && (
              <Badge colorScheme={selectedCampaign.status === 'failed' ? 'red' : selectedCampaign.status === 'evaluating' ? 'blue' : 'green'}>
                {selectedCampaign.status}
              </Badge>
            )}
            <Button
              onClick={() => {
                void handleRerun();
              }}
              isLoading={rerunning}
              loadingText="重跑中"
            >
              {selectedQuestionIds.length > 0
                ? `重新執行 RAGAS（已選題 ${selectedQuestionIds.length}）`
                : '重新執行 RAGAS'}
            </Button>
          </HStack>
        </HStack>
        {metrics && (
          <Stack spacing={3} mt={4}>
            <Grid templateColumns={{ base: '1fr', lg: '1fr 280px' }} gap={4}>
              <GridItem>
                <Text color="gray.600">Evaluator: {metrics.evaluator_model}</Text>
                <Text color="gray.600">Available metrics: {metrics.available_metrics.map(metricLabel).join(', ') || 'None'}</Text>
                <Text color="gray.600">
                  Invalid metrics: {metrics.evaluation_warnings?.invalid_metric_rows ?? 0}/
                  {metrics.evaluation_warnings?.total_metric_rows ?? 0} (
                  {((metrics.evaluation_warnings?.invalid_ratio ?? 0) * 100).toFixed(1)}%)
                </Text>
                {(metrics.evaluation_warnings?.invalid_metric_rows ?? 0) > 0 && (
                  <Text color="orange.600" fontSize="sm">
                    Invalid by metric:{' '}
                    {Object.entries(metrics.evaluation_warnings?.invalid_by_metric ?? {})
                      .map(([metricName, count]) => `${metricName}:${count}`)
                      .join(', ') || '-'}
                  </Text>
                )}
              </GridItem>
              <GridItem>
                <FormControl>
                  <FormLabel mb={1}>目前指標</FormLabel>
                  <Select value={selectedMetric} onChange={(event) => setSelectedMetric(event.target.value)}>
                    {metrics.available_metrics.map((metric) => (
                      <option key={metric} value={metric}>
                        {metricLabel(metric)}
                      </option>
                    ))}
                  </Select>
                </FormControl>
              </GridItem>
            </Grid>

            <Box borderWidth="1px" borderRadius="md" p={3}>
              <HStack justify="space-between" mb={2} flexWrap="wrap" gap={2}>
                <Text fontWeight="medium">局部重跑選題（Question ID）</Text>
                <HStack>
                  <Button size="xs" variant="outline" onClick={selectAllQuestions}>
                    全選
                  </Button>
                  <Button size="xs" variant="ghost" onClick={clearSelectedQuestions}>
                    清除
                  </Button>
                </HStack>
              </HStack>
              <Wrap>
                {availableQuestionIds.map((questionId) => (
                  <WrapItem key={questionId}>
                    <Checkbox
                      isChecked={selectedQuestionIds.includes(questionId)}
                      onChange={() => toggleQuestionSelection(questionId)}
                    >
                      {questionId}
                    </Checkbox>
                  </WrapItem>
                ))}
              </Wrap>
            </Box>
          </Stack>
        )}
      </Box>

      {loadingMetrics ? (
        <HStack py={6} justify="center">
          <Spinner />
          <Text>載入分析指標...</Text>
        </HStack>
      ) : !metrics || metrics.rows.length === 0 ? (
        <Box borderWidth="1px" borderRadius="lg" p={5}>
          <Text color="gray.500">
            {selectedCampaign?.status === 'evaluating'
              ? 'RAGAS 評估進行中，結果會在完成後自動更新。'
              : '此 campaign 目前尚無可視覺化的 RAGAS 指標。'}
          </Text>
        </Box>
      ) : (
        <>
          <Box borderWidth="1px" borderRadius="lg" p={5}>
            <Heading size="md" mb={4}>模式比較總表</Heading>
            <Table size="sm">
              <Thead>
                <Tr>
                  <Th>Mode</Th>
                  <Th isNumeric>Samples</Th>
                  <Th isNumeric>{metricLabel(selectedMetric)} Mean</Th>
                  <Th isNumeric>{metricLabel(selectedMetric)} Max</Th>
                  <Th isNumeric>Stddev</Th>
                  <Th isNumeric>Tokens</Th>
                  <Th isNumeric>Δ Correctness</Th>
                  <Th isNumeric>Δ Faithfulness</Th>
                  <Th isNumeric>Δ Tokens</Th>
                  <Th>ECR(C)</Th>
                  <Th>Dir(C)</Th>
                  <Th>ECR(F)</Th>
                  <Th>Dir(F)</Th>
                </Tr>
              </Thead>
              <Tbody>
                {summaryEntries.map((entry) => (
                  <Tr key={entry.mode}>
                    <Td>{MODE_LABELS[entry.mode]}</Td>
                    <Td isNumeric>{entry.sample_count}</Td>
                    <Td isNumeric>{metricMean(entry, selectedMetric).toFixed(3)}</Td>
                    <Td isNumeric>{metricMax(entry, selectedMetric).toFixed(3)}</Td>
                    <Td isNumeric>{metricStd(entry, selectedMetric).toFixed(3)}</Td>
                    <Td isNumeric>{entry.total_tokens.mean.toFixed(1)}</Td>
                    <Td isNumeric>{entry.delta_answer_correctness.toFixed(3)}</Td>
                    <Td isNumeric>{entry.delta_faithfulness.toFixed(3)}</Td>
                    <Td isNumeric>{entry.delta_total_tokens.toFixed(1)}</Td>
                    <Td>
                      <Badge colorScheme={ecrColor(entry.ecr)}>{ecrLabel(entry.ecr)}</Badge>
                    </Td>
                    <Td>
                      <Badge colorScheme={ecrDirectionColor(entry.ecr_direction_correctness)}>
                        {ecrDirectionLabel(entry.ecr_direction_correctness)}
                      </Badge>
                    </Td>
                    <Td>
                      <Badge colorScheme={ecrColor(entry.ecr_faithfulness)}>
                        {ecrLabel(entry.ecr_faithfulness)}
                      </Badge>
                    </Td>
                    <Td>
                      <Badge colorScheme={ecrDirectionColor(entry.ecr_direction_faithfulness)}>
                        {ecrDirectionLabel(entry.ecr_direction_faithfulness)}
                      </Badge>
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </Box>

          <Grid templateColumns={{ base: '1fr', xl: '1fr 1fr' }} gap={6}>
            <GridItem>
              <StabilityChart rows={metrics.rows} metric={selectedMetric} />
            </GridItem>
            <GridItem>
              <Box borderWidth="1px" borderRadius="lg" p={5} h="100%">
                <Heading size="md" mb={4}>Reference Source</Heading>
                <Stack spacing={3}>
                  <Badge colorScheme="purple">
                    short GT rows: {metrics.rows.filter((row) => row.reference_source === 'ground_truth_short').length}
                  </Badge>
                  <Badge colorScheme="yellow">
                    long fallback rows: {metrics.rows.filter((row) => row.reference_source === 'ground_truth_fallback_long').length}
                  </Badge>
                  <Text color="gray.600" fontSize="sm">
                    這個欄位用來檢查目前 correctness reference 是短版標準答案還是 fallback 到長版答案。
                  </Text>
                </Stack>
              </Box>
            </GridItem>
          </Grid>

          <Grid templateColumns={{ base: '1fr', xl: '1fr 1fr' }} gap={6}>
            <GridItem>
              <Box borderWidth="1px" borderRadius="lg" p={5}>
                <Heading size="md" mb={4}>依 Category 摘要</Heading>
                <Table size="sm">
                  <Thead>
                    <Tr>
                      <Th>Category</Th>
                      <Th isNumeric>Samples</Th>
                      <Th isNumeric>{metricLabel(selectedMetric)} Mean</Th>
                      <Th isNumeric>Tokens</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {categoryEntries.map((entry) => (
                      <Tr key={entry.group_key}>
                        <Td>{entry.group_key}</Td>
                        <Td isNumeric>{entry.sample_count}</Td>
                        <Td isNumeric>{metricMean(entry, selectedMetric).toFixed(3)}</Td>
                        <Td isNumeric>{entry.total_tokens.mean.toFixed(1)}</Td>
                      </Tr>
                    ))}
                    {categoryEntries.length === 0 ? (
                      <Tr>
                        <Td colSpan={4}>
                          <Text color="gray.500" py={2}>沒有 category 分組資料。</Text>
                        </Td>
                      </Tr>
                    ) : null}
                  </Tbody>
                </Table>
              </Box>
            </GridItem>
            <GridItem>
              <Box borderWidth="1px" borderRadius="lg" p={5}>
                <Heading size="md" mb={4}>依 RAGAS Focus 摘要</Heading>
                <Table size="sm">
                  <Thead>
                    <Tr>
                      <Th>Focus</Th>
                      <Th isNumeric>Samples</Th>
                      <Th isNumeric>{metricLabel(selectedMetric)} Mean</Th>
                      <Th isNumeric>Tokens</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {focusEntries.map((entry) => (
                      <Tr key={entry.group_key}>
                        <Td>{entry.group_key}</Td>
                        <Td isNumeric>{entry.sample_count}</Td>
                        <Td isNumeric>{metricMean(entry, selectedMetric).toFixed(3)}</Td>
                        <Td isNumeric>{entry.total_tokens.mean.toFixed(1)}</Td>
                      </Tr>
                    ))}
                    {focusEntries.length === 0 ? (
                      <Tr>
                        <Td colSpan={4}>
                          <Text color="gray.500" py={2}>沒有 ragas_focus 分組資料。</Text>
                        </Td>
                      </Tr>
                    ) : null}
                  </Tbody>
                </Table>
              </Box>
            </GridItem>
          </Grid>

          <Grid templateColumns={{ base: '1fr', xl: '1fr 1fr' }} gap={6}>
            <GridItem>
              <Box borderWidth="1px" borderRadius="lg" p={5}>
                <Heading size="md" mb={4}>Category Delta / ECR</Heading>
                <Table size="sm">
                  <Thead>
                    <Tr>
                      <Th>Category</Th>
                      <Th>Mode</Th>
                      <Th isNumeric>Samples</Th>
                      <Th isNumeric>Δ Correctness</Th>
                      <Th isNumeric>Δ Faithfulness</Th>
                      <Th isNumeric>Δ Tokens</Th>
                      <Th>ECR(C)</Th>
                      <Th>Dir(C)</Th>
                      <Th>ECR(C) Note</Th>
                      <Th>ECR(F)</Th>
                      <Th>Dir(F)</Th>
                      <Th>ECR(F) Note</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {deltaCategoryRows.map(({ groupKey, summary }) => (
                      <Tr key={`${groupKey}-${summary.mode}`}>
                        <Td>{groupKey}</Td>
                        <Td>{MODE_LABELS[summary.mode]}</Td>
                        <Td isNumeric>{summary.sample_count}</Td>
                        <Td isNumeric>{deltaLabel(summary.delta_answer_correctness)}</Td>
                        <Td isNumeric>{deltaLabel(summary.delta_faithfulness)}</Td>
                        <Td isNumeric>{deltaLabel(summary.delta_total_tokens, 1)}</Td>
                        <Td>
                          <Badge colorScheme={ecrColor(summary.ecr)}>{ecrLabel(summary.ecr)}</Badge>
                        </Td>
                        <Td>
                          <Badge colorScheme={ecrDirectionColor(summary.ecr_direction_correctness)}>
                            {ecrDirectionLabel(summary.ecr_direction_correctness)}
                          </Badge>
                        </Td>
                        <Td>{normalizeEcrNote(summary.ecr_note)}</Td>
                        <Td>
                          <Badge colorScheme={ecrColor(summary.ecr_faithfulness)}>
                            {ecrLabel(summary.ecr_faithfulness)}
                          </Badge>
                        </Td>
                        <Td>
                          <Badge colorScheme={ecrDirectionColor(summary.ecr_direction_faithfulness)}>
                            {ecrDirectionLabel(summary.ecr_direction_faithfulness)}
                          </Badge>
                        </Td>
                        <Td>{normalizeEcrNote(summary.ecr_faithfulness_note)}</Td>
                      </Tr>
                    ))}
                    {deltaCategoryRows.length === 0 ? (
                      <Tr>
                        <Td colSpan={12}>
                          <Text color="gray.500" py={2}>沒有 category delta 資料。</Text>
                        </Td>
                      </Tr>
                    ) : null}
                  </Tbody>
                </Table>
              </Box>
            </GridItem>
            <GridItem>
              <Box borderWidth="1px" borderRadius="lg" p={5}>
                <Heading size="md" mb={4}>Difficulty Delta / ECR</Heading>
                <Table size="sm">
                  <Thead>
                    <Tr>
                      <Th>Difficulty</Th>
                      <Th>Mode</Th>
                      <Th isNumeric>Samples</Th>
                      <Th isNumeric>Δ Correctness</Th>
                      <Th isNumeric>Δ Faithfulness</Th>
                      <Th isNumeric>Δ Tokens</Th>
                      <Th>ECR(C)</Th>
                      <Th>Dir(C)</Th>
                      <Th>ECR(C) Note</Th>
                      <Th>ECR(F)</Th>
                      <Th>Dir(F)</Th>
                      <Th>ECR(F) Note</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {deltaDifficultyRows.map(({ groupKey, summary }) => (
                      <Tr key={`${groupKey}-${summary.mode}`}>
                        <Td>{groupKey}</Td>
                        <Td>{MODE_LABELS[summary.mode]}</Td>
                        <Td isNumeric>{summary.sample_count}</Td>
                        <Td isNumeric>{deltaLabel(summary.delta_answer_correctness)}</Td>
                        <Td isNumeric>{deltaLabel(summary.delta_faithfulness)}</Td>
                        <Td isNumeric>{deltaLabel(summary.delta_total_tokens, 1)}</Td>
                        <Td>
                          <Badge colorScheme={ecrColor(summary.ecr)}>{ecrLabel(summary.ecr)}</Badge>
                        </Td>
                        <Td>
                          <Badge colorScheme={ecrDirectionColor(summary.ecr_direction_correctness)}>
                            {ecrDirectionLabel(summary.ecr_direction_correctness)}
                          </Badge>
                        </Td>
                        <Td>{normalizeEcrNote(summary.ecr_note)}</Td>
                        <Td>
                          <Badge colorScheme={ecrColor(summary.ecr_faithfulness)}>
                            {ecrLabel(summary.ecr_faithfulness)}
                          </Badge>
                        </Td>
                        <Td>
                          <Badge colorScheme={ecrDirectionColor(summary.ecr_direction_faithfulness)}>
                            {ecrDirectionLabel(summary.ecr_direction_faithfulness)}
                          </Badge>
                        </Td>
                        <Td>{normalizeEcrNote(summary.ecr_faithfulness_note)}</Td>
                      </Tr>
                    ))}
                    {deltaDifficultyRows.length === 0 ? (
                      <Tr>
                        <Td colSpan={12}>
                          <Text color="gray.500" py={2}>沒有 difficulty delta 資料。</Text>
                        </Td>
                      </Tr>
                    ) : null}
                  </Tbody>
                </Table>
              </Box>
            </GridItem>
          </Grid>

          <Box borderWidth="1px" borderRadius="lg" p={5}>
            <Heading size="md" mb={4}>Question Delta / ECR</Heading>
            <Table size="sm">
              <Thead>
                <Tr>
                  <Th>Question ID</Th>
                  <Th>Mode</Th>
                  <Th isNumeric>Samples</Th>
                  <Th isNumeric>Δ Correctness</Th>
                  <Th isNumeric>Δ Faithfulness</Th>
                  <Th isNumeric>Δ Tokens</Th>
                  <Th>ECR(C)</Th>
                  <Th>Dir(C)</Th>
                  <Th>ECR(C) Note</Th>
                  <Th>ECR(F)</Th>
                  <Th>Dir(F)</Th>
                  <Th>ECR(F) Note</Th>
                </Tr>
              </Thead>
              <Tbody>
                {deltaQuestionRows.map(({ groupKey, summary }) => (
                  <Tr key={`${groupKey}-${summary.mode}`}>
                    <Td>{groupKey}</Td>
                    <Td>{MODE_LABELS[summary.mode]}</Td>
                    <Td isNumeric>{summary.sample_count}</Td>
                    <Td isNumeric>{deltaLabel(summary.delta_answer_correctness)}</Td>
                    <Td isNumeric>{deltaLabel(summary.delta_faithfulness)}</Td>
                    <Td isNumeric>{deltaLabel(summary.delta_total_tokens, 1)}</Td>
                    <Td>
                      <Badge colorScheme={ecrColor(summary.ecr)}>{ecrLabel(summary.ecr)}</Badge>
                    </Td>
                    <Td>
                      <Badge colorScheme={ecrDirectionColor(summary.ecr_direction_correctness)}>
                        {ecrDirectionLabel(summary.ecr_direction_correctness)}
                      </Badge>
                    </Td>
                    <Td>{normalizeEcrNote(summary.ecr_note)}</Td>
                    <Td>
                      <Badge colorScheme={ecrColor(summary.ecr_faithfulness)}>
                        {ecrLabel(summary.ecr_faithfulness)}
                      </Badge>
                    </Td>
                    <Td>
                      <Badge colorScheme={ecrDirectionColor(summary.ecr_direction_faithfulness)}>
                        {ecrDirectionLabel(summary.ecr_direction_faithfulness)}
                      </Badge>
                    </Td>
                    <Td>{normalizeEcrNote(summary.ecr_faithfulness_note)}</Td>
                  </Tr>
                ))}
                {deltaQuestionRows.length === 0 ? (
                  <Tr>
                    <Td colSpan={12}>
                      <Text color="gray.500" py={2}>沒有 question delta 資料。</Text>
                    </Td>
                  </Tr>
                ) : null}
              </Tbody>
            </Table>
          </Box>

          <Box borderWidth="1px" borderRadius="lg" p={5}>
            <Heading size="md" mb={4}>逐題明細</Heading>
            <Table size="sm">
              <Thead>
                <Tr>
                  <Th>Question</Th>
                  <Th>Mode</Th>
                  <Th>Category</Th>
                  <Th>Reference</Th>
                  <Th>Focus</Th>
                  <Th isNumeric>{metricLabel(selectedMetric)}</Th>
                  <Th isNumeric>Tokens</Th>
                  <Th isNumeric>Δ Correctness</Th>
                  <Th isNumeric>Δ Faithfulness</Th>
                  <Th isNumeric>Δ Tokens</Th>
                  <Th>ECR(C)</Th>
                  <Th>Dir(C)</Th>
                  <Th>ECR(F)</Th>
                  <Th>Dir(F)</Th>
                </Tr>
              </Thead>
              <Tbody>
                {metrics.rows.map((row) => {
                  const delta = questionDelta(metrics, row.question_id, row.mode);
                  return (
                    <Tr key={row.campaign_result_id}>
                      <Td maxW="520px">
                        <Text noOfLines={2}>{row.question}</Text>
                      </Td>
                      <Td>{MODE_LABELS[row.mode]}</Td>
                      <Td>{row.category ?? '-'}</Td>
                      <Td>{row.reference_source ?? '-'}</Td>
                      <Td>{row.ragas_focus.join(', ') || '-'}</Td>
                      <Td isNumeric>{metricValueLabel(row, selectedMetric)}</Td>
                      <Td isNumeric>{row.total_tokens}</Td>
                      <Td isNumeric>{deltaLabel(delta?.delta_answer_correctness)}</Td>
                      <Td isNumeric>{deltaLabel(delta?.delta_faithfulness)}</Td>
                      <Td isNumeric>{deltaLabel(delta?.delta_total_tokens, 1)}</Td>
                      <Td>
                        <Badge colorScheme={ecrColor(delta?.ecr)}>{ecrLabel(delta?.ecr)}</Badge>
                      </Td>
                      <Td>
                        <Badge colorScheme={ecrDirectionColor(delta?.ecr_direction_correctness)}>
                          {ecrDirectionLabel(delta?.ecr_direction_correctness)}
                        </Badge>
                      </Td>
                      <Td>
                        <Badge colorScheme={ecrColor(delta?.ecr_faithfulness)}>
                          {ecrLabel(delta?.ecr_faithfulness)}
                        </Badge>
                      </Td>
                      <Td>
                        <Badge colorScheme={ecrDirectionColor(delta?.ecr_direction_faithfulness)}>
                          {ecrDirectionLabel(delta?.ecr_direction_faithfulness)}
                        </Badge>
                      </Td>
                    </Tr>
                  );
                })}
              </Tbody>
            </Table>
          </Box>
        </>
      )}
    </VStack>
  );
}
