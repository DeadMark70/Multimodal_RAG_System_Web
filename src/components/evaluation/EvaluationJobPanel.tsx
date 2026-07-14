import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Badge,
  Box,
  Button,
  HStack,
  Heading,
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

function statusLabel(status: EvaluationJob['status']): string {
  switch (status) {
    case 'pending':
      return 'Pending';
    case 'running':
      return 'Running';
    case 'completed':
      return 'Completed';
    case 'completed_with_errors':
      return 'Completed with errors';
    case 'failed':
      return 'Failed';
    case 'cancelled':
      return 'Cancelled';
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
  const [showAttempts, setShowAttempts] = useState(false);
  const notifiedTerminalJobRef = useRef<string | null>(null);
  const toast = useToast();
  const jobs = controlledJobs ?? loadedJobs;
  const sortedJobs = useMemo(
    () => [...jobs].sort((left, right) => Date.parse(right.created_at) - Date.parse(left.created_at)),
    [jobs],
  );

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
    if (controlledJobs !== undefined) return;
    let mounted = true;
    setLoading(true);
    void refreshJobs()
      .catch((error: unknown) => {
        if (mounted) {
          if (isDurableEndpointUnavailable(error)) return;
          toast({
            title: 'Unable to load evaluation jobs',
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
          title: 'Unable to load evaluation job items',
          description: error instanceof Error ? error.message : 'Unknown error',
          status: 'error',
        });
      });
    return () => {
      cancelled = true;
    };
  }, [durableApiUnavailable, embeddedJobItems, selectedJobKey, toast]);

  useEffect(() => {
    if (!selectedJob || !TERMINAL_JOB_STATUSES.has(selectedJob.status)) return;
    const key = jobKey(selectedJob);
    if (notifiedTerminalJobRef.current === key) return;
    notifiedTerminalJobRef.current = key;
    onJobTerminal?.(selectedJob);
  }, [onJobTerminal, selectedJob]);

  useEffect(() => {
    if (!activeJob || controlledJobs !== undefined || durableApiUnavailable) return;
    if (typeof getEvaluationJob !== 'function') return;
    let cancelled = false;
    const timer = window.setInterval(() => {
      void getEvaluationJob(jobKey(activeJob))
        .then((nextJob) => {
          if (cancelled) return;
          const nextJobs = [nextJob, ...jobs.filter((job) => jobKey(job) !== jobKey(nextJob))];
          updateJobs(nextJobs);
        })
        .catch((error: unknown) => {
          if (!cancelled) {
            if (isDurableEndpointUnavailable(error)) {
              setDurableApiUnavailable(true);
              return;
            }
            toast({
              title: 'Unable to refresh evaluation job',
              description: error instanceof Error ? error.message : 'Unknown error',
              status: 'error',
            });
          }
        });
    }, 1500);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [activeJob, controlledJobs, durableApiUnavailable, jobs, onJobTerminal, toast, updateJobs]);

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
      void listCampaignJobs(campaignId)
        .then(updateJobs)
        .catch((error: unknown) => {
          if (isDurableEndpointUnavailable(error)) {
            setDurableApiUnavailable(true);
            return;
          }
          toast({
            title: 'Unable to refresh evaluation jobs',
            description: error instanceof Error ? error.message : 'Unknown error',
            status: 'error',
          });
        });
    }, 1500);
    return () => window.clearInterval(timer);
  }, [activeJob, campaignId, controlledJobs, durableApiUnavailable, toast, updateJobs]);

  const submitRerun = async (request: EvaluationRerunRequest, label: string) => {
    if (typeof createCampaignRerun !== 'function') return;
    setAction(label);
    try {
      const nextJob = await createCampaignRerun(campaignId, request);
      updateJobs([nextJob, ...jobs.filter((job) => jobKey(job) !== jobKey(nextJob))]);
      toast({ title: `${label} queued`, status: 'success' });
    } catch (error) {
      toast({
        title: `${label} failed`,
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
        title: 'Unable to load attempt history',
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
        title: 'Unable to cancel evaluation job',
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
      'Retry failed',
    );
  };

  if (loading) {
    return (
      <Box borderWidth="1px" borderRadius="lg" p={4}>
        <HStack><Spinner size="sm" /><Text>Loading evaluation jobs...</Text></HStack>
      </Box>
    );
  }

  if (!selectedJob) return null;

  const disabledActions = isDisabled || activeJob !== null;
  const itemsLoaded = jobItemsKey === selectedJobKey;
  const counts: Array<[string, number | null]> = [
    ['Valid', countValue(selectedJob, 'valid', jobItems, itemsLoaded)],
    ['Failed', countValue(selectedJob, 'failed', jobItems, itemsLoaded)],
    ['Retrying', countValue(selectedJob, 'retrying', jobItems, itemsLoaded)],
    ['Interrupted', countValue(selectedJob, 'interrupted', jobItems, itemsLoaded)],
    ['Missing', countValue(selectedJob, 'missing', jobItems, itemsLoaded)],
    ['Cancelled', countValue(selectedJob, 'cancelled', jobItems, itemsLoaded)],
  ];
  const knownAttempts = mergeAttempts(jobItems, attempts);
  const latestSafeError = newestAttempt(
    knownAttempts.filter((attempt) => Boolean(attempt.safe_error_message)),
  )?.safe_error_message;

  return (
    <Box borderWidth="1px" borderRadius="lg" p={4} bg="bg.panel">
      <HStack justify="space-between" align="flex-start" mb={3}>
        <Box>
          <Heading size="sm">Durable evaluation job</Heading>
          <Text color="text.secondary" fontSize="sm">{jobKey(selectedJob)}</Text>
        </Box>
        <Badge colorScheme={statusColor(selectedJob.status)}>{statusLabel(selectedJob.status)}</Badge>
      </HStack>
      <HStack spacing={4} flexWrap="wrap" mb={4}>
        {counts.map(([label, value]) => <Text key={label} fontSize="sm">{label}: {value ?? '—'}</Text>)}
      </HStack>
      {(latestSafeError ?? selectedJob.latest_safe_error_message) && (
        <Text color="orange.600" fontSize="sm" mb={3}>
          {latestSafeError ?? selectedJob.latest_safe_error_message}
        </Text>
      )}
      <HStack spacing={2} flexWrap="wrap">
        <Button
          size="sm"
          onClick={() => void handleRetryFailed()}
          isDisabled={disabledActions}
          isLoading={action === 'Retry failed'}
        >
          Retry failed
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => void submitRerun({ scope: 'all', stages: 'ragas', question_ids: [], metric_names: [] }, 'RAGAS only')}
          isDisabled={disabledActions}
          isLoading={action === 'RAGAS only'}
        >
          RAGAS only
        </Button>
        {activeJob && (
          <Button size="sm" colorScheme="orange" variant="outline" onClick={() => void handleCancel()} isLoading={action === 'cancel'}>
            Cancel
          </Button>
        )}
        <Button size="sm" variant="ghost" onClick={() => void loadAttempts()} isLoading={action === 'attempts'}>
          {showAttempts ? 'Hide attempt history' : 'Show attempt history'}
        </Button>
      </HStack>
      {showAttempts && (
        <Stack mt={3} spacing={2}>
          <Text fontWeight="600" fontSize="sm">Attempt history</Text>
          {attempts.length === 0 ? <Text color="text.secondary" fontSize="sm">No attempt history available.</Text> : attempts.map((attempt) => (
            <Text key={attempt.attempt_id} fontSize="sm">
              Attempt {attempt.attempt_number}: {attempt.status}{attempt.safe_error_message ? ` — ${attempt.safe_error_message}` : ''}
            </Text>
          ))}
        </Stack>
      )}
    </Box>
  );
}
