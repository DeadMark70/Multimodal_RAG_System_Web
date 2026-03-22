import { beforeEach, describe, expect, it, vi } from 'vitest';

import api from './api';
import * as graphApi from './graphApi';

vi.mock('./api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

describe('graphApi', () => {
  const mockedApi = api as unknown as {
    get: ReturnType<typeof vi.fn>;
    post: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('lists graph documents via GET /graph/documents', async () => {
    mockedApi.get.mockResolvedValue({
      data: {
        documents: [
          {
            doc_id: 'doc-1',
            status: 'failed',
            chunk_count: 2,
            chunks_succeeded: 1,
            chunks_failed: 1,
            entities_added: 3,
            edges_added: 2,
            last_error: 'chunk 1: quota exceeded',
            last_attempted_at: null,
            last_succeeded_at: null,
            file_name: 'demo.pdf',
            is_eligible: true,
          },
        ],
        total: 1,
      },
    });

    const result = await graphApi.getGraphDocuments();

    expect(mockedApi.get).toHaveBeenCalledWith('/graph/documents');
    expect(result.documents[0].status).toBe('failed');
    expect(result.total).toBe(1);
  });

  it('starts a full rebuild via POST /graph/rebuild-full', async () => {
    mockedApi.post.mockResolvedValue({
      data: {
        status: 'started',
        message: '完整圖譜重構已開始',
        details: { document_count: 3 },
      },
    });

    const result = await graphApi.rebuildFullGraph();

    expect(mockedApi.post).toHaveBeenCalledWith('/graph/rebuild-full');
    expect(result.status).toBe('started');
  });

  it('retries a single graph document via POST /graph/documents/{doc_id}/retry', async () => {
    mockedApi.post.mockResolvedValue({
      data: {
        status: 'started',
        message: '單一文件 GraphRAG 重試已開始',
      },
    });

    const result = await graphApi.retryGraphDocument('doc-123');

    expect(mockedApi.post).toHaveBeenCalledWith('/graph/documents/doc-123/retry');
    expect(result.message).toContain('重試');
  });
});
