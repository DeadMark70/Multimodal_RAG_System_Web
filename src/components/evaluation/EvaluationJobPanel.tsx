import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Badge,
  Box,
  Button,
  HStack,
  Heading,
  FormControl,
  FormLabel,
  FormHelperText,
  Input,
  Select,
  SimpleGrid,
  Spinner,
  Stack,
  Text,
  useToast,
} from '@chakra-ui/react';
import {
  cancelEvaluationJob,
  createCampaignRerun,
  getEvaluationJob,
  listCampaignJobs,
  listEvaluationJobItems,
  listWorkItemAttempts,
} from '../../services/evaluationApi';
import type {
  EvaluationAttempt,
  EvaluationJob,
  EvaluationJobItemCounts,
  EvaluationJobItemSummary,
  EvaluationRerunRequest,
} from '../../types/evaluation';

const TERMINAL_JOB_STATUSES = new Set<EvaluationJob['status']>([
  'completed',
  'completed_with_errors',
  'failed',
  'cancelled',
]);

const MODE_LABELS: Record<string, string> = {
  naive: 'Naive RAG', advanced: 'Advanced RAG', graph: 'Graph RAG',
  'agentic-v8': 'Agentic v8', 'agentic-v9': 'Agentic v9', 'agentic-v10': 'Agentic v10',
};
const METRIC_LABELS: Record<string, string> = {
  answer_correctness: '正確度', faithfulness: '忠實度', answer_relevancy: '相關性',
};

export interface EvaluationJobPanelProps {
  campaignId: string;
  /** Pass jobs to use the panel in controlled mode (for example from EvaluationResults). */
  jobs?: EvaluationJob[];
  onJobsChange?: (jobs: EvaluationJob[]) => void;
  onJobTerminal?: (job: EvaluationJob) => void;
  isDisabled?: boolean;
}

function jobKey(job: EvaluationJob): string {
  return job.job_id || job.id || `${job.campaign_id ?? 'campaign'}-${job.created_at}`;
}

function statusLabel(status: EvaluationJob['status'] | EvaluationAttempt['status']): string {
  switch (status) {
    case 'pending':
      return '等待執行';
    case 'running':
      return '執行中';
    case 'completed':
    case 'succeeded':
      return '已完成';
    case 'interrupted':
      return '已中斷';
    case 'completed_with_errors':
      return '已結束，部分項目未完成';
    case 'failed':
      return '執行失敗';
    case 'cancelled':
      return '已取消';
    default:
      return status;
  }
}

function statusColor(status: EvaluationJob['status']): string {
  if (status === 'completed') return 'green';
  if (status === 'completed_with_errors') return 'orange';
  if (status === 'failed') return 'red';
  if (status === 'cancelled') return 'gray';
  return 'blue';
}

function countValue(
  job: EvaluationJob,
  key: keyof EvaluationJobItemCounts,
  items: EvaluationJobItemSummary[] = [],
  itemsLoaded = items.length > 0,
): number | null {
  const explicit = job.counts?.[key];
  if (typeof explicit === 'number') return explicit;
  if (key === 'valid' && typeof job.valid_items === 'number') return job.valid_items;
  if (key === 'valid' && typeof job.succeeded_items === 'number') return job.succeeded_items;
  if (key === 'failed' && typeof job.failed_items === 'number') return job.failed_items;
  if (key === 'retrying') {
    if (typeof job.retrying_items === 'number') return job.retrying_items;
    if (typeof job.retry_wait_items === 'number') return job.retry_wait_items;
  }
  if (key === 'interrupted' && typeof job.interrupted_items === 'number') return job.interrupted_items;
  if (key === 'missing' && typeof job.missing_items === 'number') return job.missing_items;
  if (key === 'cancelled' && typeof job.cancelled_items === 'number') return job.cancelled_items;
  if (key === 'missing' && itemsLoaded && typeof job.total_items === 'number') {
    return Math.max(job.total_items - items.length, 0);
  }
  if (items.length > 0) {
    const derived = items.reduce(
      (counts, item) => {
        if (item.status === 'succeeded') counts.valid += 1;
        if (item.status === 'failed') counts.failed += 1;
        if (item.status === 'retry_wait') counts.retrying += 1;
        if (item.status === 'interrupted') counts.interrupted += 1;
        if (item.status === 'cancelled') counts.cancelled += 1;
        return counts;
      },
      { valid: 0, failed: 0, retrying: 0, interrupted: 0, cancelled: 0 },
    );
    if (key === 'valid') return derived.valid;
    if (key === 'failed') return derived.failed;
    if (key === 'retrying') return derived.retrying;
    if (key === 'interrupted') return derived.interrupted;
    if (key === 'cancelled') return derived.cancelled;
  }
  return null;
}

function isDurableEndpointUnavailable(error: unknown): boolean {
  const status = (error as { response?: { status?: unknown } })?.response?.status;
  return status === 404 || status === 405;
}

function workItemIdFromJob(job: EvaluationJob): string | null {
  const value = job.selection?.work_item_id;
  if (typeof value === 'string' && value.trim()) return value;
  const values = job.selection?.work_item_ids;
  if (Array.isArray(values) && typeof values[0] === 'string') return values[0];
  return null;
}

function failedStages(items: EvaluationJobItemSummary[]): EvaluationRerunRequest['stages'] {
  const failedTypes = new Set(
    items
      .filter((item) => item.status === 'failed' || item.status === 'interrupted')
      .map((item) => item.work_type),
  );
  if (failedTypes.has('dataset_execution') && failedTypes.has('ragas_metric')) {
    return 'execution_and_ragas';
  }
  if (failedTypes.has('ragas_metric')) return 'ragas';
  if (failedTypes.has('dataset_execution')) return 'execution';
  return 'execution_and_ragas';
}

function newestAttempt(attempts: EvaluationAttempt[]): EvaluationAttempt | null {
  return [...attempts].sort((left, right) => {
    const rightTime = Date.parse(right.finished_at ?? right.started_at);
    const leftTime = Date.parse(left.finished_at ?? left.started_at);
    if (rightTime !== leftTime) return rightTime - leftTime;
    return right.attempt_number - left.attempt_number;
  })[0] ?? null;
}

function attemptsFromItems(items: EvaluationJobItemSummary[]): EvaluationAttempt[] {
  return items.flatMap((item) => [
    ...(item.latest_attempts ?? []),
    ...(item.latest_attempt ? [item.latest_attempt] : []),
  ]);
}

function mergeAttempts(
  items: EvaluationJobItemSummary[],
  attempts: EvaluationAttempt[],
): EvaluationAttempt[] {
  const byId = new Map<string, EvaluationAttempt>();
  for (const attempt of [...attemptsFromItems(items), ...attempts]) {
    byId.set(attempt.attempt_id, attempt);
  }
  return [...byId.values()].sort((left, right) => {
    const leftTime = Date.parse(left.finished_at ?? left.started_at);
    const rightTime = Date.parse(right.finished_at ?? right.started_at);
    if (rightTime !== leftTime) return rightTime - leftTime;
    return right.attempt_number - left.attempt_number;
  });
}

function itemsForJob(items: EvaluationJobItemSummary[], selectedKey: string): EvaluationJobItemSummary[] {
  return items.filter((item) => item.job_id === selectedKey);
}

export default function EvaluationJobPanel({
  campaignId,
  jobs: controlledJobs,
  onJobsChange,
  onJobTerminal,
  isDisabled = false,
}: EvaluationJobPanelProps) {
  const [loadedJobs, setLoadedJobs] = useState<EvaluationJob[]>([]);
  const [loading, setLoading] = useState(controlledJobs === undefined);
  const [action, setAction] = useState<string | null>(null);
  const [attempts, setAttempts] = useState<EvaluationAttempt[]>([]);
  const [jobItems, setJobItems] = useState<EvaluationJobItemSummary[]>([]);
  const [jobItemsKey, setJobItemsKey] = useState<string | null>(null);
  const [durableApiUnavailable, setDurableApiUnavailable] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showAttempts, setShowAttempts] = useState(false);
  const [showRerun, setShowRerun] = useState(false);
  const [rerunQuestions, setRerunQuestions] = useState('');
  const [rerunMode, setRerunMode] = useState('');
  const [rerunMetric, setRerunMetric] = useState('');
  const [rerunStage, setRerunStage] = useState<'missing' | 'ragas' | 'execution_and_ragas'>('missing');
  const notifiedTerminalJobIdsRef = useRef(new Set<string>());
  const onJobTerminalRef = useRef(onJobTerminal);
  const toast = useToast();
  const jobs = controlledJobs ?? loadedJobs;
  const sortedJobs = useMemo(
    () => [...jobs].sort((left, right) => Date.parse(right.created_at) - Date.parse(left.created_at)),
    [jobs],
  );

  useEffect(() => {
    onJobTerminalRef.current = onJobTerminal;
  }, [onJobTerminal]);

  const notifyTerminalJobs = useCallback((candidateJobs: EvaluationJob[]) => {
    for (const candidateJob of candidateJobs) {
      if (
        !TERMINAL_JOB_STATUSES.has(candidateJob.status)
        || (candidateJob.campaign_id && candidateJob.campaign_id !== campaignId)
      ) {
        continue;
      }
      const key = jobKey(candidateJob);
      if (notifiedTerminalJobIdsRef.current.has(key)) continue;
      notifiedTerminalJobIdsRef.current.add(key);
      onJobTerminalRef.current?.(candidateJob);
    }
  }, [campaignId]);

  const updateJobs = useCallback(
    (nextJobs: EvaluationJob[]) => {
      setLoadedJobs(nextJobs);
      onJobsChange?.(nextJobs);
    },
    [onJobsChange],
  );

  const refreshJobs = useCallback(async () => {
    if (controlledJobs !== undefined) return controlledJobs;
    if (durableApiUnavailable) return [];
    // Keep older embedded clients usable while they migrate to the durable-job API.
    if (typeof listCampaignJobs !== 'function') return [];
    try {
      const nextJobs = await listCampaignJobs(campaignId);
      setLoadError(null);
      updateJobs(nextJobs);
      return nextJobs;
    } catch (error) {
      if (isDurableEndpointUnavailable(error)) {
        setDurableApiUnavailable(true);
        return [];
      }
      throw error;
    }
  }, [campaignId, controlledJobs, durableApiUnavailable, updateJobs]);

  useEffect(() => {
    notifiedTerminalJobIdsRef.current.clear();
  }, [campaignId]);

  useEffect(() => {
    if (controlledJobs !== undefined) return;
    let mounted = true;
    setLoading(true);
    setLoadError(null);
    void refreshJobs()
      .catch((error: unknown) => {
        if (mounted) {
          if (isDurableEndpointUnavailable(error)) return;
          setLoadError(error instanceof Error ? error.message : 'Unknown error');
          toast({
            title: '無法載入執行狀態',
            description: error instanceof Error ? error.message : 'Unknown error',
            status: 'error',
          });
        }
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [controlledJobs, refreshJobs, toast]);

  const activeJob = useMemo(
    () => sortedJobs.find((job) => !TERMINAL_JOB_STATUSES.has(job.status)) ?? null,
    [sortedJobs],
  );
  const selectedJob = sortedJobs[0] ?? null;
  const selectedJobKey = selectedJob ? jobKey(selectedJob) : null;
  const embeddedJobItems = selectedJob?.items;

  useEffect(() => {
    setAttempts([]);
    setShowAttempts(false);
    if (!selectedJobKey) {
      setJobItems([]);
      setJobItemsKey(null);
      return;
    }
    if (embeddedJobItems) {
      setJobItems(itemsForJob(embeddedJobItems, selectedJobKey));
      setJobItemsKey(selectedJobKey);
      return;
    }
    if (typeof listEvaluationJobItems !== 'function' || durableApiUnavailable) return;
    let cancelled = false;
    void listEvaluationJobItems(selectedJobKey)
      .then((items) => {
        if (cancelled) return;
        setJobItems(itemsForJob(items, selectedJobKey));
        setJobItemsKey(selectedJobKey);
      })
      .catch((error: unknown) => {
        if (cancelled || isDurableEndpointUnavailable(error)) return;
        toast({
          title: '無法載入工作項目',
          description: error instanceof Error ? error.message : 'Unknown error',
          status: 'error',
        });
      });
    return () => {
      cancelled = true;
    };
  }, [durableApiUnavailable, embeddedJobItems, selectedJobKey, toast]);

  useEffect(() => {
    notifyTerminalJobs(jobs);
  }, [jobs, notifyTerminalJobs]);

  useEffect(() => {
    if (!activeJob || controlledJobs !== undefined || durableApiUnavailable) return;
    if (typeof getEvaluationJob !== 'function') return;
    let cancelled = false;
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'hidden') return;
      void getEvaluationJob(jobKey(activeJob))
        .then((nextJob) => {
          if (cancelled) return;
          setLoadError(null);
          notifyTerminalJobs([nextJob]);
          const nextJobs = [nextJob, ...jobs.filter((job) => jobKey(job) !== jobKey(nextJob))];
          updateJobs(nextJobs);
        })
        .catch((error: unknown) => {
          if (!cancelled) {
            if (isDurableEndpointUnavailable(error)) {
              setDurableApiUnavailable(true);
              return;
            }
            setLoadError(error instanceof Error ? error.message : 'Unknown error');
            toast({
              title: '無法更新執行狀態',
              description: error instanceof Error ? error.message : 'Unknown error',
              status: 'error',
            });
          }
        });
    }, 4000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [activeJob, controlledJobs, durableApiUnavailable, jobs, notifyTerminalJobs, toast, updateJobs]);

  // Keep discovering jobs created by another control (for example the
  // selected-question RAGAS button in EvaluationResults), even while an
  // older job is being polled.
  useEffect(() => {
    if (
      controlledJobs !== undefined
      || durableApiUnavailable
      || typeof listCampaignJobs !== 'function'
    ) return;
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'hidden') return;
      void listCampaignJobs(campaignId)
        .then((nextJobs) => {
          setLoadError(null);
          updateJobs(nextJobs);
        })
        .catch((error: unknown) => {
          if (isDurableEndpointUnavailable(error)) {
            setDurableApiUnavailable(true);
            return;
          }
          setLoadError(error instanceof Error ? error.message : 'Unknown error');
          toast({
            title: '無法更新執行狀態',
            description: error instanceof Error ? error.message : 'Unknown error',
            status: 'error',
          });
        });
    }, activeJob ? 5000 : 30000);
    return () => window.clearInterval(timer);
  }, [activeJob, campaignId, controlledJobs, durableApiUnavailable, toast, updateJobs]);

  const submitRerun = async (request: EvaluationRerunRequest, label: string) => {
    if (typeof createCampaignRerun !== 'function') return;
    setAction(label);
    try {
      const nextJob = await createCampaignRerun(campaignId, request);
      updateJobs([nextJob, ...jobs.filter((job) => jobKey(job) !== jobKey(nextJob))]);
      toast({ title: `${label}已排入佇列`, status: 'success' });
    } catch (error) {
      toast({
        title: `${label}未能送出`,
        description: error instanceof Error ? error.message : 'Unknown error',
        status: 'error',
      });
    } finally {
      setAction(null);
    }
  };

  const loadJobItems = async (): Promise<EvaluationJobItemSummary[]> => {
    if (!selectedJob) return [];
    if (embeddedJobItems) {
      const items = itemsForJob(embeddedJobItems, selectedJobKey ?? jobKey(selectedJob));
      setJobItems(items);
      setJobItemsKey(selectedJobKey);
      return items;
    }
    if (selectedJobKey && jobItemsKey === selectedJobKey) return jobItems;
    if (typeof listEvaluationJobItems !== 'function') return [];
    const responseItems = await listEvaluationJobItems(jobKey(selectedJob));
    const items = itemsForJob(responseItems, selectedJobKey ?? jobKey(selectedJob));
    setJobItems(items);
    setJobItemsKey(selectedJobKey);
    return items;
  };

  const loadAttempts = async () => {
    if (!selectedJob) return;
    const items = await loadJobItems().catch(() => []);
    const workItemIds = [...new Set(
      items.map((item) => item.work_item_id).filter((id): id is string => Boolean(id)),
    )];
    const fallbackWorkItemId = workItemIdFromJob(selectedJob);
    if (workItemIds.length === 0 && fallbackWorkItemId) workItemIds.push(fallbackWorkItemId);
    if (typeof listWorkItemAttempts !== 'function') {
      setAttempts(mergeAttempts(items, []));
      setShowAttempts(true);
      return;
    }
    if (workItemIds.length === 0) {
      setAttempts(mergeAttempts(items, []));
      setShowAttempts(true);
      return;
    }
    setAction('attempts');
    try {
      const settled = await Promise.allSettled(
        workItemIds.map((workItemId) => listWorkItemAttempts(workItemId)),
      );
      const successful = settled.filter(
        (result): result is PromiseFulfilledResult<EvaluationAttempt[]> => result.status === 'fulfilled',
      );
      if (successful.length === 0) {
        const rejected = settled.find(
          (result): result is PromiseRejectedResult => result.status === 'rejected',
        );
        throw rejected?.reason ?? new Error('Unable to load attempt history');
      }
      setAttempts(mergeAttempts(items, successful.flatMap((result) => result.value)));
      setShowAttempts(true);
    } catch (error) {
      toast({
        title: '無法載入執行紀錄',
        description: error instanceof Error ? error.message : 'Unknown error',
        status: 'error',
      });
    } finally {
      setAction(null);
    }
  };

  const handleCancel = async () => {
    if (!activeJob) return;
    if (typeof cancelEvaluationJob !== 'function') return;
    setAction('cancel');
    try {
      const nextJob = await cancelEvaluationJob(jobKey(activeJob));
      updateJobs([nextJob, ...jobs.filter((job) => jobKey(job) !== jobKey(nextJob))]);
    } catch (error) {
      toast({
        title: '無法取消執行',
        description: error instanceof Error ? error.message : 'Unknown error',
        status: 'error',
      });
    } finally {
      setAction(null);
    }
  };

  const handleRetryFailed = async () => {
    const items = jobItems.length > 0 ? jobItems : await loadJobItems().catch(() => []);
    await submitRerun(
      {
        scope: 'failed_only',
        stages: failedStages(items),
        question_ids: [],
        metric_names: [],
      },
      '重試失敗或中斷項目',
    );
  };

  const selectedQuestionIds = [...new Set(rerunQuestions.split(/[,，、\s]+/).filter(Boolean))];
  const rerunLabel = rerunStage === 'missing' ? '補齊缺少的評分'
    : rerunStage === 'ragas' ? '重新評分' : '重新作答並評分';
  const rerunDescription = rerunStage === 'missing'
    ? '保留現有答案與已有評分，只為已完成作答但尚無分數的項目補評分。適合答案正常、部分指標缺少分數時使用。'
    : rerunStage === 'ragas'
      ? '保留現有答案，重新計算所選指標。成功後會更新原有分數；適合想重新檢查評分時使用。'
      : '沿用這批評估的原始設定，重新檢索資料、產生答案，再計算全部啟用的指標。成功後更新所選題目與模式的答案及評分；適合答案失敗或內容不完整時使用。';
  const submitSelectedRerun = () => submitRerun({
    scope: rerunStage === 'missing' ? 'missing_only' : selectedQuestionIds.length ? 'selected' : 'all',
    stages: rerunStage === 'missing' ? 'ragas' : rerunStage,
    question_ids: selectedQuestionIds,
    modes: rerunMode ? [rerunMode] : [],
    metric_names: rerunStage === 'execution_and_ragas'
      ? [] : rerunMetric ? [rerunMetric] : [],
  }, rerunLabel);

  if (loading || !selectedJob) {
    return (
      <Box borderWidth="1px" borderRadius="lg" p={4} bg="bg.panel">
        <Heading size="sm" mb={3}>執行狀態與重跑</Heading>
        {loading ? <HStack><Spinner size="sm" /><Text>正在載入執行狀態…</Text></HStack> : null}
        {loadError ? <Text role="alert" color="red.500">無法載入執行狀態：{loadError}</Text> : null}
        {!loading && !loadError ? <Text color="text.secondary">這批評估尚無執行工作紀錄。</Text> : null}
      </Box>
    );
  }

  const disabledActions = isDisabled || activeJob !== null || action !== null;
  const itemsLoaded = jobItemsKey === selectedJobKey;
  const counts: Array<[string, number | null]> = [
    ['已完成', countValue(selectedJob, 'valid', jobItems, itemsLoaded)],
    ['失敗', countValue(selectedJob, 'failed', jobItems, itemsLoaded)],
    ['重試中', countValue(selectedJob, 'retrying', jobItems, itemsLoaded)],
    ['已中斷', countValue(selectedJob, 'interrupted', jobItems, itemsLoaded)],
    ['缺少項目', countValue(selectedJob, 'missing', jobItems, itemsLoaded)],
    ['已取消', countValue(selectedJob, 'cancelled', jobItems, itemsLoaded)],
  ];
  const knownAttempts = mergeAttempts(jobItems, attempts);
  const latestSafeError = newestAttempt(
    knownAttempts.filter((attempt) => Boolean(attempt.safe_error_message)),
  )?.safe_error_message;

  return (
    <Box borderWidth="1px" borderRadius="lg" p={{ base: 4, md: 5 }} mb={4} bg="bg.panel">
      <HStack justify="space-between" align="flex-start" flexWrap="wrap" gap={3} mb={3}>
        <Box minW={0}>
          <Heading size="sm">執行狀態與重跑</Heading>
          <Text color="text.secondary" fontSize="sm" mt={1}>
            最近一次執行 · {new Date(selectedJob.created_at).toLocaleString('zh-TW')}
          </Text>
        </Box>
        <Badge px={2} py={1} flexShrink={0} colorScheme={statusColor(selectedJob.status)}>{statusLabel(selectedJob.status)}</Badge>
      </HStack>
      <HStack spacing={0} gap={2} flexWrap="wrap" mb={2}>
        {counts.map(([label, value]) => (
          <Text key={label} fontSize="sm" borderWidth="1px" borderRadius="md" px={3} py={1}>
            {label}: {value ?? '—'}
          </Text>
        ))}
      </HStack>
      <Text fontSize="sm" color="text.secondary" mb={4}>
        以上是最近一次執行的工作項目數，例如 32 份答案 × 3 個評分指標 = 96 個評分項目，不代表 96 題或正確率。
      </Text>
      {(latestSafeError ?? selectedJob.latest_safe_error_message) && (
        <Text color="orange.600" fontSize="sm" mb={3}>
          {latestSafeError ?? selectedJob.latest_safe_error_message}
        </Text>
      )}
      {loadError ? <Text role="alert" color="red.500" fontSize="sm" mb={3}>無法載入執行狀態：{loadError}</Text> : null}
      <HStack spacing={0} gap={2} flexWrap="wrap" sx={{ '& button': { flexShrink: 0, whiteSpace: 'nowrap' } }}>
        <Button size="sm" onClick={() => setShowRerun(!showRerun)} aria-expanded={showRerun}>
          {showRerun ? '收合重跑設定' : '補分／重跑設定'}
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => void handleRetryFailed()}
          isDisabled={disabledActions}
          isLoading={action === '重試失敗或中斷項目'}
        >
          重試失敗或中斷項目
        </Button>
        {activeJob && (
          <Button size="sm" colorScheme="orange" variant="outline" onClick={() => void handleCancel()} isLoading={action === 'cancel'}>
            取消執行
          </Button>
        )}
        <Button size="sm" variant="ghost" aria-expanded={showAttempts}
          onClick={() => { if (showAttempts) setShowAttempts(false); else void loadAttempts(); }} isLoading={action === 'attempts'}>
          {showAttempts ? '收合執行紀錄' : '查看執行紀錄'}
        </Button>
      </HStack>
      {activeJob ? <Text fontSize="sm" color="text.secondary" mt={2}>仍有工作執行中，完成或取消後才能送出新的重跑工作。</Text> : null}
      {showRerun && <Stack spacing={4} borderTopWidth="1px" mt={4} pt={4}>
        <FormControl>
          <FormLabel fontSize="sm" fontWeight="semibold">1. 選擇操作</FormLabel>
          <Select aria-label="重跑方式" value={rerunStage}
            onChange={(event) => setRerunStage(event.target.value as typeof rerunStage)} maxW="360px">
            <option value="missing">補齊缺少的評分</option>
            <option value="ragas">重新評分（保留答案）</option>
            <option value="execution_and_ragas">重新作答並評分</option>
          </Select>
          <FormHelperText color="text.secondary" lineHeight="tall">{rerunDescription}</FormHelperText>
        </FormControl>
        <Box>
          <Text fontSize="sm" fontWeight="semibold" mb={2}>2. 選擇範圍</Text>
          <SimpleGrid columns={{ base: 1, md: 3 }} spacing={3}>
            <FormControl isRequired={rerunStage === 'execution_and_ragas'}>
              <FormLabel fontSize="sm">題目 ID</FormLabel>
              <Input aria-label="重跑題目" placeholder="例如 Q13、Q30" value={rerunQuestions}
                onChange={(event) => setRerunQuestions(event.target.value)} />
              <FormHelperText>{rerunStage === 'execution_and_ragas' ? '請指定要重新作答的題目。' : '留空表示全部題目。'}可用逗號、頓號或空白分隔。</FormHelperText>
            </FormControl>
            <FormControl>
              <FormLabel fontSize="sm">RAG 模式</FormLabel>
              <Select aria-label="重跑模式" value={rerunMode} onChange={(event) => setRerunMode(event.target.value)}>
                <option value="">全部模式</option>
                {Object.entries(MODE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </Select>
              <FormHelperText>僅處理這批評估中符合的模式。</FormHelperText>
            </FormControl>
            <FormControl>
              <FormLabel fontSize="sm">評分指標</FormLabel>
              <Select aria-label="評分指標" value={rerunStage === 'execution_and_ragas' ? '' : rerunMetric} onChange={(event) => setRerunMetric(event.target.value)}
                isDisabled={rerunStage === 'execution_and_ragas'}>
                <option value="">全部啟用指標</option>
                {Object.entries(METRIC_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </Select>
              <FormHelperText>{rerunStage === 'execution_and_ragas' ? '新答案需重新計算全部啟用指標。' : rerunStage === 'missing' ? '只補齊選取指標中缺少的評分。' : '只重新計算選取的指標。'}</FormHelperText>
            </FormControl>
          </SimpleGrid>
        </Box>
        <Box borderWidth="1px" borderRadius="md" p={3}>
          <Text fontSize="sm" fontWeight="semibold">本次操作：{rerunLabel}</Text>
          <Text fontSize="sm" color="text.secondary" mt={1} overflowWrap="anywhere">
            題目：{selectedQuestionIds.length ? selectedQuestionIds.join('、') : rerunStage === 'execution_and_ragas' ? '尚未指定' : '全部題目'}
            {' · '}模式：{MODE_LABELS[rerunMode] || '全部模式'}
            {' · '}指標：{rerunStage === 'execution_and_ragas' || !rerunMetric ? '全部啟用指標' : METRIC_LABELS[rerunMetric]}
          </Text>
        </Box>
        <Button alignSelf="flex-start" flexShrink={0} whiteSpace="nowrap"
          isDisabled={disabledActions || (rerunStage === 'execution_and_ragas' && selectedQuestionIds.length === 0)}
          isLoading={action === rerunLabel} onClick={() => void submitSelectedRerun()}>{rerunLabel}</Button>
      </Stack>}
      {showAttempts && (
        <Stack mt={3} spacing={2}>
          <Text fontWeight="600" fontSize="sm">執行紀錄</Text>
          <Text fontSize="xs" color="text.secondary" overflowWrap="anywhere">工作 ID：{jobKey(selectedJob)}</Text>
          {attempts.length === 0 ? <Text color="text.secondary" fontSize="sm">尚無執行紀錄。</Text> : attempts.map((attempt) => (
            <Text key={attempt.attempt_id} fontSize="sm">
              第 {attempt.attempt_number} 次：{statusLabel(attempt.status)}{attempt.safe_error_message ? ` — ${attempt.safe_error_message}` : ''}
            </Text>
          ))}
        </Stack>
      )}
    </Box>
  );
}
