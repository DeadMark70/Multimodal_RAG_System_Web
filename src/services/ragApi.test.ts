import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as ragApi from './ragApi';
import api from './api';
import { supabase } from './supabase';

vi.mock('./api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
    patch: vi.fn(),
    defaults: {
      baseURL: 'http://mock-api.local',
    },
  },
}));

vi.mock('./supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
    },
  },
}));

describe('ragApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  it('calls GET /rag/ask with question and doc_ids', async () => {
    (api.get as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { question: 'q', answer: 'a', sources: [], metrics: null },
    });

    const result = await ragApi.askQuestionSimple('q', ['d1', 'd2']);

    expect(api.get).toHaveBeenCalledWith('/rag/ask?question=q&doc_ids=d1%2Cd2');
    expect(result.answer).toBe('a');
  });

  it('calls POST /rag/ask for context-aware question', async () => {
    (api.post as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { question: 'q', answer: 'a', sources: [], metrics: null },
    });

    const payload = { question: 'q', enable_evaluation: true };
    const result = await ragApi.askQuestion(payload);

    expect(api.post).toHaveBeenCalledWith('/rag/ask', payload);
    expect(result.question).toBe('q');
  });

  it('parses SSE stream without calling real backend', async () => {
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: { access_token: 'mock-token' } },
      error: null,
    } as never);

    const encoder = new TextEncoder();
    const chunks = [
      encoder.encode('event: task_start\ndata: {"id":1}\n\n'),
      encoder.encode('event: complete\ndata: {"summary":"ok"}\n\n'),
    ];

    let index = 0;
    const reader = {
      read: vi.fn(async () => {
        if (index >= chunks.length) {
          return { done: true, value: undefined };
        }
        const value = chunks[index];
        index += 1;
        return { done: false, value };
      }),
    };

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        body: {
          getReader: () => reader,
        },
      })
    );

    const onEvent = vi.fn();
    await ragApi.executeResearchPlanStream(
      {
        original_question: 'q',
        sub_tasks: [{ id: 1, question: 'sq', task_type: 'rag', enabled: true }],
      },
      onEvent
    );

    expect(fetch).toHaveBeenCalledWith(
      'http://mock-api.local/rag/execute/stream',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer mock-token',
        }),
      })
    );
    expect(onEvent).toHaveBeenCalledTimes(2);
    expect(onEvent).toHaveBeenNthCalledWith(1, {
      type: 'task_start',
      data: { id: 1 },
    });
    expect(onEvent).toHaveBeenNthCalledWith(2, {
      type: 'complete',
      data: { summary: 'ok' },
    });
  });
});
