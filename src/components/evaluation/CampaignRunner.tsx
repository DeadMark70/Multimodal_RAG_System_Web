import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Badge,
  Box,
  Button,
  Checkbox,
  Divider,
  FormControl,
  FormLabel,
  Grid,
  GridItem,
  HStack,
  Heading,
  Progress,
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
  cancelCampaign,
  createCampaign,
  getCampaignResults,
  listCampaigns,
  listModelConfigs,
  listTestCases,
  streamCampaign,
} from '../../services/evaluationApi';
import type {
  CampaignMode,
  CampaignProgressEvent,
  CampaignResultsResponse,
  CampaignStatus,
  CampaignStreamEvent,
  ModelConfig,
  TestCase,
} from '../../types/evaluation';

const MODE_OPTIONS: Array<{ value: CampaignMode; label: string }> = [
  { value: 'naive', label: 'Naive RAG' },
  { value: 'advanced', label: 'Advanced RAG' },
  { value: 'graph', label: 'Graph RAG' },
  { value: 'agentic', label: 'Agentic RAG' },
];

const TERMINAL_STATUSES = new Set<CampaignStatus['status']>(['completed', 'failed', 'cancelled']);
const RECONNECT_DELAYS_MS = [1000, 2000, 5000];

interface ActiveCampaignState {
  snapshot: CampaignStatus | null;
  progress: CampaignProgressEvent | null;
}

function progressFromCampaign(campaign: CampaignStatus): CampaignProgressEvent {
  return {
    campaign_id: campaign.id,
    status: campaign.status,
    phase: campaign.phase,
    completed_units: campaign.completed_units,
    total_units: campaign.total_units,
    evaluation_completed_units: campaign.evaluation_completed_units,
    evaluation_total_units: campaign.evaluation_total_units,
    current_question_id: campaign.current_question_id,
    current_mode: campaign.current_mode,
  };
}

function mergeCampaigns(campaigns: CampaignStatus[], nextCampaign: CampaignStatus): CampaignStatus[] {
  const next = campaigns.filter((campaign) => campaign.id !== nextCampaign.id);
  next.unshift(nextCampaign);
  return next;
}

function patchCampaignProgress(campaigns: CampaignStatus[], progress: CampaignProgressEvent): CampaignStatus[] {
  return campaigns.map((campaign) =>
    campaign.id === progress.campaign_id
      ? {
          ...campaign,
          status: progress.status,
          phase: progress.phase,
          completed_units: progress.completed_units,
          total_units: progress.total_units,
          evaluation_completed_units: progress.evaluation_completed_units,
          evaluation_total_units: progress.evaluation_total_units,
          current_question_id: progress.current_question_id,
          current_mode: progress.current_mode,
        }
      : campaign
  );
}

function formatStatus(status: CampaignStatus['status']): string {
  switch (status) {
    case 'pending':
      return '等待中';
    case 'running':
      return '執行中';
    case 'evaluating':
      return '評估中';
    case 'completed':
      return '已完成';
    case 'failed':
      return '失敗';
    case 'cancelled':
      return '已取消';
    default:
      return status;
  }
}

function statusColor(status: CampaignStatus['status']): string {
  switch (status) {
    case 'completed':
      return 'green';
    case 'failed':
      return 'red';
    case 'cancelled':
      return 'orange';
    default:
      return 'blue';
  }
}

export default function CampaignRunner() {
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [loadingResults, setLoadingResults] = useState(false);
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [configs, setConfigs] = useState<ModelConfig[]>([]);
  const [campaigns, setCampaigns] = useState<CampaignStatus[]>([]);
  const [selectedCaseIds, setSelectedCaseIds] = useState<string[]>([]);
  const [selectedConfigId, setSelectedConfigId] = useState('');
  const [selectedModes, setSelectedModes] = useState<CampaignMode[]>(['naive', 'advanced']);
  const [repeatCount, setRepeatCount] = useState(1);
  const [batchSize, setBatchSize] = useState(1);
  const [rpmLimit, setRpmLimit] = useState(60);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [activeCampaign, setActiveCampaign] = useState<ActiveCampaignState>({ snapshot: null, progress: null });
  const [resultsView, setResultsView] = useState<CampaignResultsResponse | null>(null);
  const [streamNotice, setStreamNotice] = useState<string | null>(null);
  const streamAbortRef = useRef<AbortController | null>(null);
  const activeCampaignIdRef = useRef<string | null>(null);
  const toast = useToast();

  const categories = useMemo(
    () => Array.from(new Set(testCases.map((item) => item.category).filter(Boolean))) as string[],
    [testCases]
  );
  const selectedConfig = useMemo(
    () => configs.find((config) => config.id === selectedConfigId) ?? null,
    [configs, selectedConfigId]
  );
  const visibleCases = useMemo(
    () =>
      testCases.filter((item) => {
        if (categoryFilter === 'all') {
          return true;
        }
        return (item.category ?? '') === categoryFilter;
      }),
    [categoryFilter, testCases]
  );
  const activeProgress = activeCampaign.progress ?? (activeCampaign.snapshot ? progressFromCampaign(activeCampaign.snapshot) : null);
  const progressPercent = activeProgress
    ? activeProgress.phase === 'evaluation'
      ? activeProgress.evaluation_total_units > 0
        ? Math.round((activeProgress.evaluation_completed_units / activeProgress.evaluation_total_units) * 100)
        : 0
      : activeProgress.total_units > 0
        ? Math.round((activeProgress.completed_units / activeProgress.total_units) * 100)
        : 0
    : 0;

  const reloadCampaigns = useCallback(async (): Promise<CampaignStatus[]> => {
    const items = await listCampaigns();
    setCampaigns(items);
    return items;
  }, []);

  const handleStreamEvent = useCallback((event: CampaignStreamEvent) => {
    if (event.type === 'campaign_progress') {
      setActiveCampaign((prev) => ({
        snapshot: prev.snapshot && prev.snapshot.id === event.data.campaign_id
          ? {
              ...prev.snapshot,
              status: event.data.status,
              phase: event.data.phase,
              completed_units: event.data.completed_units,
              total_units: event.data.total_units,
              evaluation_completed_units: event.data.evaluation_completed_units,
              evaluation_total_units: event.data.evaluation_total_units,
              current_question_id: event.data.current_question_id,
              current_mode: event.data.current_mode,
            }
          : prev.snapshot,
        progress: event.data,
      }));
      setCampaigns((prev) => patchCampaignProgress(prev, event.data));
      return;
    }

    setActiveCampaign({
      snapshot: event.data,
      progress: progressFromCampaign(event.data),
    });
    setCampaigns((prev) => mergeCampaigns(prev, event.data));

    if (event.type !== 'campaign_snapshot') {
      activeCampaignIdRef.current = null;
      streamAbortRef.current = null;
      setStreamNotice(null);
      void reloadCampaigns();
    }
  }, [reloadCampaigns]);

  const connectToCampaign = useCallback(async (campaignId: string, attempt = 0): Promise<void> => {
    streamAbortRef.current?.abort();
    const abortController = new AbortController();
    streamAbortRef.current = abortController;
    activeCampaignIdRef.current = campaignId;

    try {
      await streamCampaign(campaignId, handleStreamEvent, abortController.signal);
    } catch (error) {
      if (abortController.signal.aborted || activeCampaignIdRef.current !== campaignId) {
        return;
      }
      if (attempt < RECONNECT_DELAYS_MS.length) {
        const seconds = RECONNECT_DELAYS_MS[attempt] / 1000;
        setStreamNotice(`串流中斷，${seconds} 秒後重連中...`);
        await new Promise((resolve) => window.setTimeout(resolve, RECONNECT_DELAYS_MS[attempt]));
        await connectToCampaign(campaignId, attempt + 1);
        return;
      }
      setStreamNotice(error instanceof Error ? error.message : '串流中斷');
      toast({
        title: 'Campaign 串流中斷',
        description: error instanceof Error ? error.message : '請稍後再試',
        status: 'warning',
      });
    }
  }, [handleStreamEvent, toast]);

  const loadInitialData = useCallback(async () => {
    setLoading(true);
    try {
      const [cases, savedConfigs, history] = await Promise.all([
        listTestCases(),
        listModelConfigs(),
        listCampaigns(),
      ]);
      setTestCases(cases);
      setSelectedCaseIds(cases.map((item) => item.id));
      setConfigs(savedConfigs);
      setSelectedConfigId(savedConfigs[0]?.id ?? '');
      setCampaigns(history);

      const resumable = history.find((campaign) => !TERMINAL_STATUSES.has(campaign.status));
      if (resumable) {
        setActiveCampaign({ snapshot: resumable, progress: progressFromCampaign(resumable) });
        void connectToCampaign(resumable.id);
      }
    } catch (error) {
      toast({
        title: '載入評估活動資料失敗',
        description: error instanceof Error ? error.message : '未知錯誤',
        status: 'error',
      });
    } finally {
      setLoading(false);
    }
  }, [connectToCampaign, toast]);

  useEffect(() => {
    void loadInitialData();
    return () => {
      streamAbortRef.current?.abort();
    };
  }, [loadInitialData]);

  const toggleCaseSelection = (testCaseId: string) => {
    setSelectedCaseIds((prev) =>
      prev.includes(testCaseId)
        ? prev.filter((id) => id !== testCaseId)
        : [...prev, testCaseId]
    );
  };

  const toggleModeSelection = (mode: CampaignMode) => {
    setSelectedModes((prev) =>
      prev.includes(mode)
        ? prev.filter((item) => item !== mode)
        : [...prev, mode]
    );
  };

  const selectVisibleCases = () => {
    setSelectedCaseIds((prev) => Array.from(new Set([...prev, ...visibleCases.map((item) => item.id)])));
  };

  const clearVisibleCases = () => {
    const visibleCaseIds = new Set(visibleCases.map((item) => item.id));
    setSelectedCaseIds((prev) => prev.filter((id) => !visibleCaseIds.has(id)));
  };

  const startCampaign = async () => {
    if (!selectedConfig) {
      toast({
        title: '請先建立模型預設組',
        description: 'Phase 2 只支援使用已儲存的模型設定啟動 campaign。',
        status: 'warning',
      });
      return;
    }
    if (selectedCaseIds.length === 0) {
      toast({ title: '請至少選擇一題', status: 'warning' });
      return;
    }
    if (selectedModes.length === 0) {
      toast({ title: '請至少選擇一種 RAG 模式', status: 'warning' });
      return;
    }

    setCreating(true);
    setResultsView(null);
    try {
      const response = await createCampaign({
        name: `Campaign ${new Date().toLocaleString()}`,
        test_case_ids: selectedCaseIds,
        modes: selectedModes,
        model_config: selectedConfig,
        model_config_id: selectedConfig.id,
        repeat_count: repeatCount,
        batch_size: batchSize,
        rpm_limit: rpmLimit,
      });
      const history = await reloadCampaigns();
      const created = history.find((campaign) => campaign.id === response.campaign_id) ?? null;
      if (created) {
        setActiveCampaign({ snapshot: created, progress: progressFromCampaign(created) });
      }
      setStreamNotice(null);
      void connectToCampaign(response.campaign_id);
    } catch (error) {
      toast({
        title: '建立 campaign 失敗',
        description: error instanceof Error ? error.message : '未知錯誤',
        status: 'error',
      });
    } finally {
      setCreating(false);
    }
  };

  const requestCancel = async (campaignId: string) => {
    try {
      const updated = await cancelCampaign(campaignId);
      setCampaigns((prev) => mergeCampaigns(prev, updated));
      if (activeCampaign.snapshot?.id === campaignId) {
        setActiveCampaign({ snapshot: updated, progress: progressFromCampaign(updated) });
      }
      streamAbortRef.current?.abort();
      activeCampaignIdRef.current = null;
    } catch (error) {
      toast({
        title: '取消 campaign 失敗',
        description: error instanceof Error ? error.message : '未知錯誤',
        status: 'error',
      });
    }
  };

  const viewResults = async (campaignId: string) => {
    setLoadingResults(true);
    try {
      const response = await getCampaignResults(campaignId);
      setResultsView(response);
    } catch (error) {
      toast({
        title: '載入結果失敗',
        description: error instanceof Error ? error.message : '未知錯誤',
        status: 'error',
      });
    } finally {
      setLoadingResults(false);
    }
  };

  if (loading) {
    return (
      <HStack py={8} justify="center">
        <Spinner />
        <Text>載入評估活動...</Text>
      </HStack>
    );
  }

  return (
    <VStack align="stretch" spacing={6}>
      <Grid templateColumns={{ base: '1fr', xl: '2fr 1fr' }} gap={6}>
        <GridItem>
          <Box borderWidth="1px" borderRadius="lg" p={5}>
            <Heading size="md" mb={4}>建立評估活動</Heading>
            <Stack spacing={4}>
              <FormControl>
                <FormLabel>模型預設組</FormLabel>
                <Select
                  placeholder={configs.length === 0 ? '請先到模型設定分頁建立預設組' : '選擇預設組'}
                  value={selectedConfigId}
                  onChange={(event) => setSelectedConfigId(event.target.value)}
                >
                  {configs.map((config) => (
                    <option key={config.id} value={config.id}>
                      {config.name} ({config.model_name})
                    </option>
                  ))}
                </Select>
              </FormControl>

              <FormControl>
                <FormLabel>RAG 模式</FormLabel>
                <Stack direction={{ base: 'column', md: 'row' }} spacing={4}>
                  {MODE_OPTIONS.map((option) => (
                    <Checkbox
                      key={option.value}
                      isChecked={selectedModes.includes(option.value)}
                      onChange={() => toggleModeSelection(option.value)}
                    >
                      {option.label}
                    </Checkbox>
                  ))}
                </Stack>
              </FormControl>

              <Grid templateColumns={{ base: '1fr', md: 'repeat(3, 1fr)' }} gap={4}>
                <GridItem>
                  <FormControl>
                    <FormLabel>重複次數</FormLabel>
                    <Select value={repeatCount} onChange={(event) => setRepeatCount(Number(event.target.value))}>
                      {Array.from({ length: 10 }).map((_, index) => (
                        <option key={index + 1} value={index + 1}>{index + 1}</option>
                      ))}
                    </Select>
                  </FormControl>
                </GridItem>
                <GridItem>
                  <FormControl>
                    <FormLabel>批次大小</FormLabel>
                    <Select value={batchSize} onChange={(event) => setBatchSize(Number(event.target.value))}>
                      {[1, 2, 3, 4].map((size) => (
                        <option key={size} value={size}>{size}</option>
                      ))}
                    </Select>
                  </FormControl>
                </GridItem>
                <GridItem>
                  <FormControl>
                    <FormLabel>RPM 上限</FormLabel>
                    <Select value={rpmLimit} onChange={(event) => setRpmLimit(Number(event.target.value))}>
                      {[30, 60, 120, 240].map((value) => (
                        <option key={value} value={value}>{value}</option>
                      ))}
                    </Select>
                  </FormControl>
                </GridItem>
              </Grid>

              <Divider />

              <FormControl>
                <FormLabel>題目選擇</FormLabel>
                <HStack mb={3} spacing={3}>
                  <Select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)} maxW="260px">
                    <option value="all">全部分類</option>
                    {categories.map((category) => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </Select>
                  <Button size="sm" onClick={selectVisibleCases}>全選目前篩選</Button>
                  <Button size="sm" variant="outline" onClick={clearVisibleCases}>清除目前篩選</Button>
                </HStack>

                <Box maxH="320px" overflowY="auto" borderWidth="1px" borderRadius="md" p={3}>
                  <Stack spacing={2}>
                    {visibleCases.map((testCase) => (
                      <Checkbox
                        key={testCase.id}
                        isChecked={selectedCaseIds.includes(testCase.id)}
                        onChange={() => toggleCaseSelection(testCase.id)}
                      >
                        <Text as="span" fontWeight="medium">{testCase.id}</Text>
                        <Text as="span" color="gray.500"> {' '} {testCase.question}</Text>
                      </Checkbox>
                    ))}
                    {visibleCases.length === 0 && (
                      <Text color="gray.500">目前篩選沒有題目。</Text>
                    )}
                  </Stack>
                </Box>
                <Text mt={2} color="gray.600">已選擇 {selectedCaseIds.length} 題</Text>
              </FormControl>

              <Button
                colorScheme="blue"
                onClick={() => {
                  void startCampaign();
                }}
                isLoading={creating}
                loadingText="建立中"
              >
                開始評估
              </Button>
            </Stack>
          </Box>
        </GridItem>

        <GridItem>
          <Box borderWidth="1px" borderRadius="lg" p={5}>
            <Heading size="md" mb={4}>即時進度</Heading>
            {activeCampaign.snapshot ? (
              <Stack spacing={3}>
                <HStack justify="space-between">
                  <Text fontWeight="medium">{activeCampaign.snapshot.name || activeCampaign.snapshot.id}</Text>
                  <Badge colorScheme={statusColor(activeCampaign.snapshot.status)}>
                    {formatStatus(activeCampaign.snapshot.status)}
                  </Badge>
                </HStack>
                <Progress value={progressPercent} borderRadius="md" />
                <Text>
                  {activeProgress?.phase === 'evaluation'
                    ? `${activeProgress?.evaluation_completed_units ?? 0} / ${activeProgress?.evaluation_total_units ?? 0}`
                    : `${activeProgress?.completed_units ?? 0} / ${activeProgress?.total_units ?? 0}`}
                </Text>
                <Text color="gray.600">
                  目前階段：{activeProgress?.phase === 'evaluation' ? 'RAGAS 評估' : 'Raw 執行'}
                </Text>
                <Text color="gray.600">
                  目前題目：{activeProgress?.current_question_id || '待命中'}
                </Text>
                <Text color="gray.600">
                  目前模式：{activeProgress?.current_mode || '待命中'}
                </Text>
                {streamNotice && (
                  <Text color="orange.500">{streamNotice}</Text>
                )}
                {activeCampaign.snapshot.error_message && (
                  <Text color="red.500">{activeCampaign.snapshot.error_message}</Text>
                )}
              </Stack>
            ) : (
              <Text color="gray.500">目前沒有執行中的 campaign。</Text>
            )}
          </Box>
        </GridItem>
      </Grid>

      <Box borderWidth="1px" borderRadius="lg" p={5}>
        <Heading size="md" mb={4}>活動歷史</Heading>
        <Table size="sm">
          <Thead>
            <Tr>
              <Th>名稱</Th>
              <Th>模式</Th>
              <Th>進度</Th>
              <Th>狀態</Th>
              <Th>操作</Th>
            </Tr>
          </Thead>
          <Tbody>
            {campaigns.map((campaign) => (
              <Tr key={campaign.id}>
                <Td>
                  <Text fontWeight="medium">{campaign.name || campaign.id}</Text>
                  <Text color="gray.500" fontSize="sm">{new Date(campaign.created_at).toLocaleString()}</Text>
                </Td>
                <Td>{campaign.config.modes.join(', ')}</Td>
                <Td>{campaign.completed_units} / {campaign.total_units}</Td>
                <Td>
                  <Badge colorScheme={statusColor(campaign.status)}>
                    {formatStatus(campaign.status)}
                  </Badge>
                </Td>
                <Td>
                  <HStack spacing={2}>
                    {!TERMINAL_STATUSES.has(campaign.status) && (
                      <>
                        <Button size="xs" onClick={() => void connectToCampaign(campaign.id)}>重連</Button>
                        <Button size="xs" colorScheme="orange" variant="outline" onClick={() => void requestCancel(campaign.id)}>
                          取消
                        </Button>
                      </>
                    )}
                    <Button size="xs" variant="outline" onClick={() => void viewResults(campaign.id)}>
                      查看結果
                    </Button>
                  </HStack>
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
        {campaigns.length === 0 && <Text color="gray.500">尚未建立任何 campaign。</Text>}
      </Box>

      <Box borderWidth="1px" borderRadius="lg" p={5}>
        <Heading size="md" mb={4}>Raw Results</Heading>
        {loadingResults ? (
          <HStack>
            <Spinner size="sm" />
            <Text>載入結果...</Text>
          </HStack>
        ) : resultsView ? (
          <Stack spacing={4}>
            <Text>
              {resultsView.campaign.name || resultsView.campaign.id} 共 {resultsView.results.length} 筆結果
            </Text>
            <Table size="sm">
              <Thead>
                <Tr>
                  <Th>Question</Th>
                  <Th>Mode</Th>
                  <Th>Run</Th>
                  <Th>Status</Th>
                  <Th>Latency</Th>
                </Tr>
              </Thead>
              <Tbody>
                {resultsView.results.map((result) => (
                  <Tr key={result.id}>
                    <Td>{result.question_id}</Td>
                    <Td>
                      <HStack spacing={2}>
                        <Badge colorScheme="blue">{result.mode}</Badge>
                        {result.execution_profile && (
                          <Badge colorScheme="purple">{result.execution_profile}</Badge>
                        )}
                      </HStack>
                    </Td>
                    <Td>{result.run_number}</Td>
                    <Td>
                      <Badge colorScheme={result.status === 'completed' ? 'green' : 'red'}>
                        {result.status}
                      </Badge>
                    </Td>
                    <Td>{Math.round(result.latency_ms)} ms</Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </Stack>
        ) : (
          <Text color="gray.500">選擇一個 campaign 以查看逐題結果。</Text>
        )}
      </Box>
    </VStack>
  );
}
