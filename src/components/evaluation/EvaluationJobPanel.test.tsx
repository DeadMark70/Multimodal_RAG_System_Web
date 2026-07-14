import { ChakraProvider } from '@chakra-ui/react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  cancelEvaluationJob as cancelEvaluationJobFn,
  createCampaignRerun as createCampaignRerunFn,
  getEvaluationJob as getEvaluationJobFn,
  listCampaignJobs as listCampaignJobsFn,
  listEvaluationJobItems as listEvaluationJobItemsFn,
  listWorkItemAttempts as listWorkItemAttemptsFn,
} from '../../services/evaluationApi';
import type { EvaluationJob } from '../../types/evaluation';
import theme from '../../theme';
import EvaluationJobPanel from './EvaluationJobPanel';

const {
  mockCancelEvaluationJob,
  mockCreateCampaignRerun,
  mockGetEvaluationJob,
  mockListCampaignJobs,
  mockListEvaluationJobItems,
  mockListWorkItemAttempts,
} = vi.hoisted(() => ({
  mockCancelEvaluationJob: vi.fn<typeof cancelEvaluationJobFn>(),
  mockCreateCampaignRerun: vi.fn<typeof createCampaignRerunFn>(),
  mockGetEvaluationJob: vi.fn<typeof getEvaluationJobFn>(),
  mockListCampaignJobs: vi.fn<typeof listCampaignJobsFn>(),
  mockListEvaluationJobItems: vi.fn<typeof listEvaluationJobItemsFn>(),
  mockListWorkItemAttempts: vi.fn<typeof listWorkItemAttemptsFn>(),
}));

vi.mock('../../services/evaluationApi', () => ({
  cancelEvaluationJob: mockCancelEvaluationJob,
  createCampaignRerun: mockCreateCampaignRerun,
  getEvaluationJob: mockGetEvaluationJob,
  listCampaignJobs: mockListCampaignJobs,
  listEvaluationJobItems: mockListEvaluationJobItems,
  listWorkItemAttempts: mockListWorkItemAttempts,
}));

const job: EvaluationJob = {
  job_id: 'job-1',
  job_type: 'rerun',
  campaign_id: 'cmp-1',
  selection: { work_item_id: 'work-1' },
  config_snapshot: {},
  status: 'completed_with_errors',
  total_items: 5,
  succeeded_items: 2,
  completed_items: 2,
  failed_items: 1,
  cancelled_items: 0,
  counts: { valid: 2, failed: 1, retrying: 1, interrupted: 1, missing: 1 },
  created_at: '2026-07-14T00:00:00Z',
};

function renderPanel() {
  return render(
    <ChakraProvider theme={theme}>
      <EvaluationJobPanel campaignId="cmp-1" />
    </ChakraProvider>,
  );
}

describe('EvaluationJobPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListCampaignJobs.mockResolvedValue([job]);
    mockGetEvaluationJob.mockResolvedValue(job);
    mockCreateCampaignRerun.mockResolvedValue({ ...job, job_id: 'job-2', status: 'completed_with_errors' });
    mockCancelEvaluationJob.mockResolvedValue({ ...job, status: 'cancelled' });
    mockListWorkItemAttempts.mockResolvedValue([
      {
        attempt_id: 'attempt-1',
        job_id: 'job-1',
        job_item_id: 'item-1',
        work_item_id: 'work-1',
        attempt_number: 1,
        status: 'failed',
        started_at: '2026-07-14T00:00:00Z',
        safe_error_message: 'Provider response details were redacted.',
      },
    ]);
    mockListEvaluationJobItems.mockResolvedValue([
      {
        job_item_id: 'item-1',
        job_id: 'job-1',
        work_item_id: 'work-1',
        work_type: 'dataset_execution',
        status: 'failed',
      },
    ]);
  });

  it('shows warning status, durable counts, safe attempt history, and rerun actions', async () => {
    renderPanel();

    await waitFor(() => expect(screen.getByText('Completed with errors')).toBeInTheDocument());
    expect(screen.getByText('Valid: 2')).toBeInTheDocument();
    expect(screen.getByText('Failed: 1')).toBeInTheDocument();
    expect(screen.getByText('Retrying: 1')).toBeInTheDocument();
    expect(screen.getByText('Interrupted: 1')).toBeInTheDocument();
    expect(screen.getByText('Missing: 1')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'RAGAS only' }));
    await waitFor(() => {
      expect(mockCreateCampaignRerun).toHaveBeenCalledWith('cmp-1', {
        scope: 'all',
        stages: 'ragas',
        question_ids: [],
        metric_names: [],
      });
    });

    fireEvent.click(screen.getByRole('button', { name: 'Retry failed' }));
    await waitFor(() => {
      expect(mockCreateCampaignRerun).toHaveBeenCalledWith('cmp-1', {
        scope: 'failed_only',
        stages: 'execution',
        question_ids: [],
        metric_names: [],
      });
    });

    fireEvent.click(screen.getByRole('button', { name: 'Show attempt history' }));
    await waitFor(() => expect(mockListWorkItemAttempts).toHaveBeenCalledWith('work-1'));
    expect(screen.getByText('Provider response details were redacted.')).toBeInTheDocument();
  });

  it('selects the newest terminal job without relabeling cancelled or unknown counts', async () => {
    const older = { ...job, job_id: 'job-old', created_at: '2026-07-13T00:00:00Z', status: 'completed' as const, counts: undefined };
    const newest = { ...job, job_id: 'job-new', created_at: '2026-07-14T00:00:00Z', status: 'cancelled' as const, counts: undefined, cancelled_items: 2 };
    const onJobTerminal = vi.fn();
    mockListCampaignJobs.mockResolvedValue([older, newest]);
    render(
      <ChakraProvider theme={theme}>
        <EvaluationJobPanel campaignId="cmp-1" onJobTerminal={onJobTerminal} />
      </ChakraProvider>,
    );

    await waitFor(() => expect(screen.getByText('job-new')).toBeInTheDocument());
    expect(screen.getByText('Interrupted: —')).toBeInTheDocument();
    expect(screen.getByText('Missing: —')).toBeInTheDocument();
    expect(screen.getByText('Cancelled: 2')).toBeInTheDocument();
    expect(onJobTerminal).toHaveBeenCalledWith(expect.objectContaining({ job_id: 'job-new' }));
  });

  it('selects combined stages when failed execution and RAGAS items coexist', async () => {
    mockListCampaignJobs.mockResolvedValue([job]);
    mockListEvaluationJobItems.mockResolvedValue([
      { job_item_id: 'item-exec', job_id: 'job-1', work_item_id: 'work-exec', work_type: 'dataset_execution', status: 'failed' },
      { job_item_id: 'item-ragas', job_id: 'job-1', work_item_id: 'work-ragas', work_type: 'ragas_metric', status: 'failed' },
    ]);
    renderPanel();
    await waitFor(() => expect(screen.getByText('Completed with errors')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'Retry failed' }));
    await waitFor(() => expect(mockCreateCampaignRerun).toHaveBeenCalledWith('cmp-1', expect.objectContaining({
      scope: 'failed_only',
      stages: 'execution_and_ragas',
    })));
  });
});
