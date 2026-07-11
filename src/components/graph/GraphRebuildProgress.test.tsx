import { ChakraProvider } from '@chakra-ui/react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import theme from '../../theme';
import type { GraphRebuildStatus } from '../../types/graph';
import { GraphRebuildProgress } from './GraphRebuildProgress';

const runningStatus: GraphRebuildStatus = {
  job_id: 'job-1',
  state: 'running',
  phase: 'extracting',
  total: 50,
  processed: 23,
  succeeded: 21,
  empty: 0,
  failed: 1,
  partial: 1,
  pending: 27,
  progress_percent: 46,
  max_attempts: 5,
  current_document: {
    doc_id: 'doc-24',
    file_name: 'paper.pdf',
    state: 'running',
    attempt: 2,
    cumulative_attempts: 2,
    chunk_count: 0,
    chunks_succeeded: 0,
    chunks_failed: 0,
    entities_added: 0,
    edges_added: 0,
    last_error: null,
    started_at: null,
    completed_at: null,
  },
  documents: [],
  can_resume: false,
  can_retry_failed: false,
  live_graph_unchanged: true,
  last_error: null,
};

function renderProgress(status: GraphRebuildStatus, onResume = vi.fn()) {
  return render(
    <ChakraProvider theme={theme}>
      <GraphRebuildProgress status={status} isActionPending={false} onResume={onResume} />
    </ChakraProvider>,
  );
}

describe('GraphRebuildProgress', () => {
  it('renders durable progress, current document, and old-graph notice', () => {
    renderProgress(runningStatus);

    expect(screen.getByText('23 / 50（46%）')).toBeInTheDocument();
    expect(screen.getByText(/paper.pdf：第 2 次，共 5 次/)).toBeInTheDocument();
    expect(screen.getByText(/目前查詢仍使用舊圖譜/)).toBeInTheDocument();
  });

  it('offers resume for interrupted jobs', () => {
    const onResume = vi.fn();
    renderProgress({ ...runningStatus, state: 'interrupted', can_resume: true }, onResume);

    fireEvent.click(screen.getByRole('button', { name: '繼續重建' }));

    expect(onResume).toHaveBeenCalledOnce();
  });
});
