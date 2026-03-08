import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Badge,
  Box,
  Button,
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
  useToast,
} from '@chakra-ui/react';
import {
  CartesianGrid,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from 'recharts';
import {
  evaluateCampaign,
  getCampaignMetrics,
  listCampaigns,
} from '../../services/evaluationApi';
import type {
  CampaignMetricsResponse,
  CampaignMode,
  CampaignStatus,
  ModeMetricsSummary,
} from '../../types/evaluation';
import StabilityChart from '../charts/StabilityChart';

const MODE_LABELS: Record<CampaignMode, string> = {
  naive: 'Naive',
  advanced: 'Advanced',
  graph: 'Graph',
  agentic: 'Agentic',
};

const MODE_COLORS: Record<CampaignMode, string> = {
  naive: '#2B6CB0',
  advanced: '#2F855A',
  graph: '#DD6B20',
  agentic: '#C53030',
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

function metricsToCsv(metrics: CampaignMetricsResponse): string {
  const headers = [
    'campaign_result_id',
    'question_id',
    'question',
    'mode',
    'run_number',
    'category',
    'difficulty',
    'total_tokens',
    'faithfulness',
    'answer_correctness',
  ];
  const rows = metrics.rows.map((row) =>
    [
      row.campaign_result_id,
      row.question_id,
      row.question,
      row.mode,
      row.run_number,
      row.category,
      row.difficulty,
      row.total_tokens,
      row.faithfulness,
      row.answer_correctness,
    ]
      .map(csvCell)
      .join(',')
  );
  return [headers.join(','), ...rows].join('\n');
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

export default function EvaluationResults() {
  const [campaigns, setCampaigns] = useState<CampaignStatus[]>([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState('');
  const [metrics, setMetrics] = useState<CampaignMetricsResponse | null>(null);
  const [loadingCampaigns, setLoadingCampaigns] = useState(true);
  const [loadingMetrics, setLoadingMetrics] = useState(false);
  const [rerunning, setRerunning] = useState(false);
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

  const handleRerun = async () => {
    if (!selectedCampaignId) {
      return;
    }
    setRerunning(true);
    try {
      await evaluateCampaign(selectedCampaignId);
      await reloadCampaigns();
      await loadMetrics(selectedCampaignId);
      toast({
        title: '已重新啟動 RAGAS 評估',
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

  const summaryEntries = useMemo(
    () =>
      Object.values(metrics?.summary_by_mode ?? {}).filter(
        (entry): entry is ModeMetricsSummary => entry !== undefined
      ),
    [metrics]
  );

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
      metricsToCsv(metrics),
      'text/csv'
    );
  }, [metrics]);

  const radarData = useMemo(() => {
    if (summaryEntries.length === 0) {
      return [];
    }
    const maxTokens = Math.max(...summaryEntries.map((entry) => entry.total_tokens.mean), 1);
    return [
      {
        subject: 'Faithfulness',
        ...Object.fromEntries(summaryEntries.map((entry) => [entry.mode, entry.faithfulness.mean * 100])),
      },
      {
        subject: 'Correctness',
        ...Object.fromEntries(summaryEntries.map((entry) => [entry.mode, entry.answer_correctness.mean * 100])),
      },
      {
        subject: 'Token Efficiency',
        ...Object.fromEntries(
          summaryEntries.map((entry) => [
            entry.mode,
            ((maxTokens - entry.total_tokens.mean) / maxTokens) * 100,
          ])
        ),
      },
    ];
  }, [summaryEntries]);

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
              重新執行 RAGAS
            </Button>
          </HStack>
        </HStack>
        {metrics && (
          <Text mt={3} color="gray.600">
            Evaluator: {metrics.evaluator_model}
          </Text>
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
                  <Th isNumeric>Faithfulness</Th>
                  <Th isNumeric>Correctness</Th>
                  <Th isNumeric>Tokens</Th>
                  <Th isNumeric>Δ Correctness</Th>
                  <Th isNumeric>Δ Tokens</Th>
                  <Th>ECR</Th>
                </Tr>
              </Thead>
              <Tbody>
                {summaryEntries.map((entry) => (
                  <Tr key={entry.mode}>
                    <Td>{MODE_LABELS[entry.mode]}</Td>
                    <Td isNumeric>{entry.sample_count}</Td>
                    <Td isNumeric>{entry.faithfulness.mean.toFixed(3)}</Td>
                    <Td isNumeric>{entry.answer_correctness.mean.toFixed(3)}</Td>
                    <Td isNumeric>{entry.total_tokens.mean.toFixed(1)}</Td>
                    <Td isNumeric>{entry.delta_answer_correctness.toFixed(3)}</Td>
                    <Td isNumeric>{entry.delta_total_tokens.toFixed(1)}</Td>
                    <Td>
                      <Badge colorScheme={ecrColor(entry.ecr)}>{ecrLabel(entry.ecr)}</Badge>
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </Box>

          <Grid templateColumns={{ base: '1fr', xl: '1fr 1fr' }} gap={6}>
            <GridItem>
              <Box borderWidth="1px" borderRadius="lg" p={5} h="100%">
                <Heading size="md" mb={4}>模式雷達圖</Heading>
                <Box h="320px">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={radarData}>
                      <PolarGrid />
                      <PolarAngleAxis dataKey="subject" />
                      <PolarRadiusAxis domain={[0, 100]} />
                      {summaryEntries.map((entry) => (
                        <Radar
                          key={entry.mode}
                          name={MODE_LABELS[entry.mode]}
                          dataKey={entry.mode}
                          stroke={MODE_COLORS[entry.mode]}
                          fill={MODE_COLORS[entry.mode]}
                          fillOpacity={0.15}
                        />
                      ))}
                      <Tooltip formatter={(value: number) => `${value.toFixed(1)}%`} />
                    </RadarChart>
                  </ResponsiveContainer>
                </Box>
              </Box>
            </GridItem>

            <GridItem>
              <Box borderWidth="1px" borderRadius="lg" p={5} h="100%">
                <Heading size="md" mb={4}>Token / Correctness 散佈圖</Heading>
                <Box h="320px">
                  <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        type="number"
                        dataKey="total_tokens"
                        name="Tokens"
                        tickFormatter={(value) => `${value}`}
                      />
                      <YAxis
                        type="number"
                        dataKey="answer_correctness"
                        name="Correctness"
                        domain={[0, 1]}
                      />
                      <ZAxis type="number" dataKey="faithfulness" range={[60, 280]} name="Faithfulness" />
                      <Tooltip
                        formatter={(value: number) => value.toFixed(3)}
                        cursor={{ strokeDasharray: '4 4' }}
                      />
                      {(['naive', 'advanced', 'graph', 'agentic'] as CampaignMode[]).map((mode) => (
                        <Scatter
                          key={mode}
                          name={MODE_LABELS[mode]}
                          data={metrics.rows.filter((row) => row.mode === mode)}
                          fill={MODE_COLORS[mode]}
                        />
                      ))}
                    </ScatterChart>
                  </ResponsiveContainer>
                </Box>
              </Box>
            </GridItem>
          </Grid>

          <Grid templateColumns={{ base: '1fr', xl: '1fr 1fr' }} gap={6}>
            <GridItem>
              <StabilityChart rows={metrics.rows} metric="answer_correctness" />
            </GridItem>
            <GridItem>
              <Box borderWidth="1px" borderRadius="lg" p={5} h="100%">
                <Heading size="md" mb={4}>ECR 決策表</Heading>
                <Stack spacing={3}>
                  {summaryEntries.map((entry) => (
                    <HStack key={entry.mode} justify="space-between">
                      <Text>{MODE_LABELS[entry.mode]}</Text>
                      <Badge colorScheme={ecrColor(entry.ecr)}>
                        {ecrLabel(entry.ecr)}
                      </Badge>
                    </HStack>
                  ))}
                </Stack>
              </Box>
            </GridItem>
          </Grid>
        </>
      )}
    </VStack>
  );
}
