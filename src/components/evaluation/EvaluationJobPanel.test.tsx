import { ChakraProvider } from '@chakra-ui/react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  cancelEvaluationJob as cancelEvaluationJobFn,
  createCampaignRerun as createCampaignRerunFn,
  getEvaluationJob as getEvaluationJobFn,
  listCampaignJobs as listCampaignJobsFn,
  listEvaluationJobItems as listEvaluationJobItemsFn,
  listWorkItemAttempts as listWorkItemAttemptsFn,
} from '../../services/evaluationApi';
import type { EvaluationJob, EvaluationJobItemSummary } from '../../types/evaluation';
import theme from '../../theme';
import EvaluationJobPanel from './EvaluationJobPanel';
import { completeFixture } from './researchSummaryFixtures';

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
  it('disables retry only when the current campaign summary confirms all work is complete', async () => {
    const completed = { ...job, status: 'completed' as const, counts: { valid: 1, failed: 0, interrupted: 0 } };
    mockListEvaluationJobItems.mockResolvedValue([]);
    const summary = { ...completeFixture, campaign_id: 'cmp-1' };
    const view = render(<ChakraProvider theme={theme}><EvaluationJobPanel campaignId="cmp-1" jobs={[completed]} summary={summary} /></ChakraProvider>);
    const retry = screen.getByRole('button', { name: '重試失敗或中斷項目' });
    expect(retry).toBeDisabled();
    fireEvent.click(retry);
    expect(mockCreateCampaignRerun).not.toHaveBeenCalled();
    view.rerender(<ChakraProvider theme={theme}><EvaluationJobPanel campaignId="cmp-1" jobs={[completed]} summary={{ ...summary, analysis_status: 'updating' }} /></ChakraProvider>);
    expect(retry).toBeEnabled();
    view.rerender(<ChakraProvider theme={theme}><EvaluationJobPanel campaignId="cmp-1" jobs={[completed]} summary={{ ...summary, failed_run_count: 1, completed_run_count: 3 }} /></ChakraProvider>);
    expect(retry).toBeEnabled();
    view.rerender(<ChakraProvider theme={theme}><EvaluationJobPanel campaignId="cmp-1" jobs={[completed]} summary={{ ...summary, quality_status: 'partial', quality: { faithfulness: { ...summary.quality.faithfulness, failed_samples: 1, status: 'partial' } } }} /></ChakraProvider>);
    expect(retry).toBeEnabled();
    await waitFor(() => expect(mockListEvaluationJobItems).toHaveBeenCalled());
  });
  it('hides historical retry warnings after completion while retaining them in details', async () => {
    const message = 'Provider temporarily unavailable; retrying request (attempt 2).';
    const completed = { ...job, status: 'completed' as const, latest_safe_error_message: message };
    render(<ChakraProvider theme={theme}><EvaluationJobPanel campaignId="cmp-1" jobs={[completed]} /></ChakraProvider>);
    expect(screen.queryByText(message)).not.toBeInTheDocument();
    const historical = screen.getByText(`執行期間曾發生（目前已完成）：${message}`);
    expect(historical.closest('details')).not.toHaveAttribute('open');
    await waitFor(() => expect(mockListEvaluationJobItems).toHaveBeenCalled());
    expect(screen.queryByText(message)).not.toBeInTheDocument();
  });
  it('keeps campaign totals separate from a smaller successful rerun', async () => {
    const summary = { ...completeFixture, campaign_id: 'cmp-1',
      completed_run_count: 64, total_run_count: 64,
      quality: Object.fromEntries(['answer_correctness', 'faithfulness', 'answer_relevancy'].map((metric) => [metric, {
        value: 0.8, status: 'complete' as const, valid_samples: 64, failed_samples: 0,
        missing_samples: 0, evaluator_model: 'judge', metric_version: 'v1',
      }])),
    };
    const rerun = { ...job, status: 'completed' as const, counts: { valid: 15, failed: 0 } };
    const view = render(<ChakraProvider theme={theme}><EvaluationJobPanel campaignId="cmp-1" jobs={[rerun]} summary={summary} /></ChakraProvider>);
    expect(screen.getByText('作答完成：64 / 64')).toBeInTheDocument();
    expect(screen.getByText('有效評分：192')).toBeInTheDocument();
    expect(screen.getByText('評分失敗：0')).toBeInTheDocument();
    expect(screen.getByText('最近一次重跑的工作項目')).toBeInTheDocument();
    expect(screen.getByText('已完成: 15')).toBeInTheDocument();
    view.rerender(<ChakraProvider theme={theme}><EvaluationJobPanel campaignId="cmp-1" jobs={[rerun]} summary={{ ...summary, analysis_status: 'updating' }} /></ChakraProvider>);
    expect(screen.getByText('摘要更新中，暫時顯示上次統計。')).toBeInTheDocument();
    await waitFor(() => expect(mockListEvaluationJobItems).toHaveBeenCalled());
  });
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
    mockListEvaluationJobItems.mockImplementation((jobId) => Promise.resolve([
      {
        job_item_id: 'item-1',
        job_id: jobId,
        work_item_id: 'work-1',
        work_type: 'dataset_execution',
        status: 'failed',
      },
    ]));
  });

  it('shows warning status, durable counts, safe attempt history, and rerun actions', async () => {
    renderPanel();

    await waitFor(() => expect(screen.getByText('已結束，部分項目未完成')).toBeInTheDocument());
    expect(screen.getByText('已完成: 2')).toBeInTheDocument();
    expect(screen.getByText('失敗: 1')).toBeInTheDocument();
    expect(screen.getByText('重試中: 1')).toBeInTheDocument();
    expect(screen.getByText('已中斷: 1')).toBeInTheDocument();
    expect(screen.getByText('缺少項目: 1')).toBeInTheDocument();

    expect(screen.queryByLabelText('重跑題目')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '補分／重跑設定' }));
    fireEvent.change(screen.getByLabelText('重跑方式'), { target: { value: 'ragas' } });
    fireEvent.click(screen.getByRole('button', { name: '重新評分' }));
    await waitFor(() => {
      expect(mockCreateCampaignRerun).toHaveBeenCalledWith('cmp-1', {
        scope: 'all',
        stages: 'ragas',
        question_ids: [],
        modes: [],
        metric_names: [],
      });
    });

    fireEvent.click(screen.getByRole('button', { name: '重試失敗或中斷項目' }));
    await waitFor(() => {
      expect(mockCreateCampaignRerun).toHaveBeenCalledWith('cmp-1', {
        scope: 'failed_only',
        stages: 'execution',
        question_ids: [],
        metric_names: [],
      });
    });

    fireEvent.click(screen.getByRole('button', { name: '查看執行紀錄' }));
    await waitFor(() => expect(mockListWorkItemAttempts).toHaveBeenCalledWith('work-1'));
    expect(await screen.findByText(/第 1 次：執行失敗 — Provider response details were redacted\./)).toBeInTheDocument();
    fireEvent.click(await screen.findByRole('button', { name: '收合執行紀錄' }));
    expect(screen.queryByText(/工作 ID：/)).not.toBeInTheDocument();
    expect(mockListWorkItemAttempts).toHaveBeenCalledTimes(1);
  });

  it('repairs only the selected missing metric and mode', async () => {
    renderPanel();
    fireEvent.click(await screen.findByRole('button', { name: '補分／重跑設定' }));
    fireEvent.change(screen.getByLabelText('重跑題目'), { target: { value: 'Q30' } });
    fireEvent.change(screen.getByLabelText('重跑模式'), { target: { value: 'naive' } });
    fireEvent.change(screen.getByLabelText('評分指標'), { target: { value: 'faithfulness' } });
    fireEvent.click(screen.getByRole('button', { name: '補齊缺少的評分' }));
    await waitFor(() => expect(mockCreateCampaignRerun).toHaveBeenCalledWith('cmp-1', {
      scope: 'missing_only', stages: 'ragas', question_ids: ['Q30'], modes: ['naive'], metric_names: ['faithfulness'],
    }));
  });

  it('reruns an answer with all its metrics and the selected mode only', async () => {
    renderPanel();
    fireEvent.click(await screen.findByRole('button', { name: '補分／重跑設定' }));
    fireEvent.change(screen.getByLabelText('重跑題目'), { target: { value: 'Q13' } });
    fireEvent.change(screen.getByLabelText('重跑模式'), { target: { value: 'agentic-v10' } });
    fireEvent.change(screen.getByLabelText('評分指標'), { target: { value: 'faithfulness' } });
    fireEvent.change(screen.getByLabelText('重跑方式'), { target: { value: 'execution_and_ragas' } });
    expect(screen.getByLabelText('評分指標')).toBeDisabled();
    expect(screen.getByLabelText('評分指標')).toHaveValue('');
    fireEvent.click(screen.getByRole('button', { name: '重新作答並評分' }));
    await waitFor(() => expect(mockCreateCampaignRerun).toHaveBeenCalledWith('cmp-1', {
      scope: 'selected', stages: 'execution_and_ragas', question_ids: ['Q13'], modes: ['agentic-v10'], metric_names: [],
    }));
  });

  it('fills missing scores across the campaign when questions are blank', async () => {
    renderPanel();
    fireEvent.click(await screen.findByRole('button', { name: '補分／重跑設定' }));
    expect(screen.getByLabelText('重跑方式')).toHaveValue('missing');
    fireEvent.click(screen.getByRole('button', { name: '補齊缺少的評分' }));
    await waitFor(() => expect(mockCreateCampaignRerun).toHaveBeenCalledWith('cmp-1', {
      scope: 'missing_only', stages: 'ragas', question_ids: [], modes: [], metric_names: [],
    }));
  });

  it('requires questions for new answers and accepts deduplicated Chinese separators', async () => {
    renderPanel();
    fireEvent.click(await screen.findByRole('button', { name: '補分／重跑設定' }));
    fireEvent.change(screen.getByLabelText('重跑方式'), { target: { value: 'execution_and_ragas' } });
    expect(screen.getByRole('button', { name: '重新作答並評分' })).toBeDisabled();
    fireEvent.change(screen.getByLabelText('重跑題目'), { target: { value: 'Q13、Q30，Q13 Q30' } });
    fireEvent.click(screen.getByRole('button', { name: '重新作答並評分' }));
    await waitFor(() => expect(mockCreateCampaignRerun).toHaveBeenCalledWith('cmp-1', {
      scope: 'selected', stages: 'execution_and_ragas', question_ids: ['Q13', 'Q30'], modes: [], metric_names: [],
    }));
  });

  it('keeps the durable jobs heading visible for an empty campaign', async () => {
    mockListCampaignJobs.mockResolvedValue([]);

    renderPanel();

    expect(await screen.findByRole('heading', { name: '執行狀態與重跑' })).toBeInTheDocument();
    expect(screen.getByText('這批評估尚無執行工作紀錄。')).toBeInTheDocument();
  });

  it('keeps the durable jobs heading visible while jobs load', async () => {
    mockListCampaignJobs.mockReturnValue(new Promise(() => {}));

    renderPanel();

    expect(await screen.findByRole('heading', { name: '執行狀態與重跑' })).toBeInTheDocument();
    expect(screen.getByText('正在載入執行狀態…')).toBeInTheDocument();
  });

  it('keeps the durable jobs heading visible when loading jobs fails', async () => {
    mockListCampaignJobs.mockRejectedValue(new Error('Jobs service unavailable'));

    renderPanel();

    expect(await screen.findByRole('heading', { name: '執行狀態與重跑' })).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('無法載入執行狀態：Jobs service unavailable');
  });

  it('notifies a terminal job only once when the same job is rendered again', async () => {
    const onJobTerminal = vi.fn();
    const { rerender } = render(
      <ChakraProvider theme={theme}>
        <EvaluationJobPanel campaignId="cmp-1" jobs={[job]} onJobTerminal={onJobTerminal} />
      </ChakraProvider>,
    );

    await waitFor(() => expect(onJobTerminal).toHaveBeenCalledTimes(1));
    rerender(
      <ChakraProvider theme={theme}>
        <EvaluationJobPanel campaignId="cmp-1" jobs={[{ ...job }]} onJobTerminal={onJobTerminal} />
      </ChakraProvider>,
    );

    await waitFor(() => expect(onJobTerminal).toHaveBeenCalledTimes(1));
  });

  it('notifies an older job exactly once when polling transitions it to terminal', async () => {
    const newerTerminalJob = {
      ...job,
      job_id: 'job-newer-terminal',
      status: 'completed' as const,
      created_at: '2026-07-15T00:00:00Z',
    };
    const olderRunningJob = {
      ...job,
      job_id: 'job-older-running',
      status: 'running' as const,
      created_at: '2026-07-14T00:00:00Z',
    };
    const olderTerminalJob = { ...olderRunningJob, status: 'completed' as const };
    const onJobTerminal = vi.fn<(notifiedJob: EvaluationJob) => void>();
    mockListCampaignJobs.mockResolvedValue([newerTerminalJob, olderRunningJob]);
    mockGetEvaluationJob.mockResolvedValue(olderTerminalJob);

    const { rerender } = render(
      <ChakraProvider theme={theme}>
        <EvaluationJobPanel campaignId="cmp-1" onJobTerminal={onJobTerminal} />
      </ChakraProvider>,
    );

    await waitFor(
      () => expect(mockGetEvaluationJob).toHaveBeenCalledWith('job-older-running'),
      { timeout: 5000 },
    );
    await waitFor(
      () => expect(onJobTerminal.mock.calls.filter(([notifiedJob]) => (
        notifiedJob.job_id === 'job-older-running'
      ))).toHaveLength(1),
      { timeout: 3500 },
    );

    const pollCountAfterTerminal = mockGetEvaluationJob.mock.calls.length;
    mockListCampaignJobs.mockResolvedValue([newerTerminalJob, olderTerminalJob]);
    rerender(
      <ChakraProvider theme={theme}>
        <EvaluationJobPanel campaignId="cmp-1" onJobTerminal={onJobTerminal} />
      </ChakraProvider>,
    );
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 4500)); });
    expect(mockGetEvaluationJob).toHaveBeenCalledTimes(pollCountAfterTerminal);
    expect(onJobTerminal.mock.calls.filter(([notifiedJob]) => (
      notifiedJob.job_id === 'job-older-running'
    ))).toHaveLength(1);
  }, 15_000);

  it('selects the newest terminal job without relabeling cancelled or unknown counts', async () => {
    const older = { ...job, job_id: 'job-old', created_at: '2026-07-13T00:00:00Z', status: 'completed' as const, counts: undefined };
    const newest = { ...job, job_id: 'job-new', created_at: '2026-07-14T00:00:00Z', status: 'cancelled' as const, counts: undefined, cancelled_items: 2 };
    const onJobTerminal = vi.fn();
    mockListCampaignJobs.mockResolvedValue([older, newest]);
    mockListEvaluationJobItems.mockResolvedValue([]);
    render(
      <ChakraProvider theme={theme}>
        <EvaluationJobPanel campaignId="cmp-1" onJobTerminal={onJobTerminal} />
      </ChakraProvider>,
    );

    await screen.findByText('缺少項目: 5');
    expect(screen.getByText('已中斷: —')).toBeInTheDocument();
    expect(screen.getByText('缺少項目: 5')).toBeInTheDocument();
    expect(screen.getByText('已取消: 2')).toBeInTheDocument();
    expect(onJobTerminal).toHaveBeenCalledWith(expect.objectContaining({ job_id: 'job-new' }));
  });

  it('selects combined stages when failed execution and RAGAS items coexist', async () => {
    mockListCampaignJobs.mockResolvedValue([job]);
    mockListEvaluationJobItems.mockResolvedValue([
      { job_item_id: 'item-exec', job_id: 'job-1', work_item_id: 'work-exec', work_type: 'dataset_execution', status: 'failed' },
      { job_item_id: 'item-ragas', job_id: 'job-1', work_item_id: 'work-ragas', work_type: 'ragas_metric', status: 'failed' },
    ]);
    renderPanel();
    await waitFor(() => expect(screen.getByText('已結束，部分項目未完成')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: '重試失敗或中斷項目' }));
    await waitFor(() => expect(mockCreateCampaignRerun).toHaveBeenCalledWith('cmp-1', expect.objectContaining({
      scope: 'failed_only',
      stages: 'execution_and_ragas',
    })));
  });

  it('retries interrupted RAGAS work as a RAGAS-only rerun', async () => {
    mockListCampaignJobs.mockResolvedValue([job]);
    mockListEvaluationJobItems.mockResolvedValue([
      { job_item_id: 'item-ragas', job_id: 'job-1', work_item_id: 'work-ragas', work_type: 'ragas_metric', status: 'interrupted' },
    ]);
    renderPanel();
    await waitFor(() => expect(screen.getByText('已結束，部分項目未完成')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: '重試失敗或中斷項目' }));
    await waitFor(() => expect(mockCreateCampaignRerun).toHaveBeenCalledWith('cmp-1', expect.objectContaining({
      scope: 'failed_only',
      stages: 'ragas',
    })));
  });

  it('derives counts and safe errors from every job item, and loads every attempt history', async () => {
    const attempts = ['work-1', 'work-2', 'work-3', 'work-4', 'work-5'].map((workItemId, index) => ({
      attempt_id: `attempt-${index + 1}`,
      job_id: 'job-1',
      job_item_id: `item-${index + 1}`,
      work_item_id: workItemId,
      attempt_number: index + 1,
      status: 'failed' as const,
      started_at: `2026-07-14T00:0${5 - index}:00Z`,
      safe_error_message: `Safe error ${index + 1}`,
    }));
    const items: EvaluationJobItemSummary[] = [
      { job_item_id: 'item-1', job_id: 'job-1', work_item_id: 'work-1', work_type: 'dataset_execution', status: 'succeeded', latest_attempt: attempts[0] },
      { job_item_id: 'item-2', job_id: 'job-1', work_item_id: 'work-2', work_type: 'dataset_execution', status: 'failed', latest_attempt: attempts[1] },
      { job_item_id: 'item-3', job_id: 'job-1', work_item_id: 'work-3', work_type: 'ragas_metric', status: 'retry_wait', latest_attempt: attempts[2] },
      { job_item_id: 'item-4', job_id: 'job-1', work_item_id: 'work-4', work_type: 'ragas_metric', status: 'interrupted', latest_attempt: attempts[3] },
      { job_item_id: 'item-5', job_id: 'job-1', work_item_id: 'work-5', work_type: 'ragas_metric', status: 'cancelled', latest_attempt: attempts[4] },
    ];
    const countsless = {
      ...job,
      succeeded_items: undefined,
      completed_items: undefined,
      failed_items: undefined,
      cancelled_items: undefined,
      counts: undefined,
      valid_items: undefined,
      retrying_items: undefined,
      interrupted_items: undefined,
      missing_items: undefined,
      retry_wait_items: undefined,
    } as unknown as EvaluationJob;
    mockListCampaignJobs.mockResolvedValue([countsless]);
    mockListEvaluationJobItems.mockResolvedValue(items);
    mockListWorkItemAttempts.mockImplementation((workItemId) => Promise.resolve([
      attempts.find((attempt) => attempt.work_item_id === workItemId)!,
    ]));

    renderPanel();

    await waitFor(() => expect(screen.getByText('已完成: 1')).toBeInTheDocument());
    expect(screen.getByText('失敗: 1')).toBeInTheDocument();
    expect(screen.getByText('重試中: 1')).toBeInTheDocument();
    expect(screen.getByText('已中斷: 1')).toBeInTheDocument();
    expect(screen.getByText('已取消: 1')).toBeInTheDocument();
    expect(screen.queryByText('Safe error 1')).not.toBeInTheDocument();
    expect(screen.getByText('Safe error 2')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '查看執行紀錄' }));
    await waitFor(() => expect(mockListWorkItemAttempts).toHaveBeenCalledTimes(5));
    expect(screen.getAllByText(/Safe error 1/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Safe error 5/).length).toBeGreaterThanOrEqual(1);
  });

  it('stops durable polling when the jobs endpoint is unavailable', async () => {
    const unavailable = Object.assign(new Error('Not found'), { response: { status: 404 } });
    mockListCampaignJobs.mockRejectedValue(unavailable);
    renderPanel();
    await waitFor(() => expect(screen.queryByText('無法載入執行狀態')).not.toBeInTheDocument());
    await new Promise((resolve) => setTimeout(resolve, 1600));
    expect(mockListCampaignJobs).toHaveBeenCalledTimes(1);
  });

  it('does not render an unsafe aggregate error field', async () => {
    const unsafeJob = {
      ...job,
      counts: undefined,
      latest_safe_error_message: null,
      error_message: 'raw provider secret',
    };
    mockListCampaignJobs.mockResolvedValue([unsafeJob]);
    mockListEvaluationJobItems.mockResolvedValue([]);
    renderPanel();
    await waitFor(() => expect(screen.getByText('已結束，部分項目未完成')).toBeInTheDocument());
    expect(screen.queryByText('raw provider secret')).not.toBeInTheDocument();
  });
});
