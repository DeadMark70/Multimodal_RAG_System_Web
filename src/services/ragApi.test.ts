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
      baseURL: 'http://127.0.0.1:8000',
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
  const mockedApi = api as unknown as {
    post: ReturnType<typeof vi.fn>;
    defaults: { baseURL: string };
  };
  const mockedAuth = vi.mocked(supabase.auth);

  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  it('calls POST /rag/ask for simple ask wrapper', async () => {
    mockedApi.post.mockResolvedValue({
      data: { question: 'q', answer: 'a', sources: [], metrics: null },
    });

    const result = await ragApi.askQuestionSimple('q', ['d1', 'd2']);

    expect(mockedApi.post).toHaveBeenCalledWith('/rag/ask', {
      question: 'q',
      doc_ids: ['d1', 'd2'],
      enable_evaluation: true,
    });
    expect(result.answer).toBe('a');
  });

  it('calls POST /rag/ask for context-aware question', async () => {
    mockedApi.post.mockResolvedValue({
      data: { question: 'q', answer: 'a', sources: [], metrics: null },
    });

    const payload = { question: 'q', enable_evaluation: true };
    const result = await ragApi.askQuestion(payload);

    expect(mockedApi.post).toHaveBeenCalledWith('/rag/ask', payload);
    expect(result.question).toBe('q');
  });

  it('parses ordinary ask SSE stream without calling real backend', async () => {
    mockedAuth.getSession.mockResolvedValue({
      data: { session: { access_token: 'mock-token' } },
      error: null,
    } as never);

    const encoder = new TextEncoder();
    const chunks: Uint8Array[] = [
      encoder.encode('event: phase_update\r\ndata: {"stage":"retrieval"}\r\n\r\n'),
      encoder.encode('event: complete\r\ndata: {"question":"q","answer":"ok","sources":[],"metrics":null}\r\n\r\n'),
    ];

    let index = 0;
    const reader = {
      read: vi.fn(() => {
        if (index >= chunks.length) {
          return Promise.resolve({ done: true, value: undefined });
        }

        const value = chunks[index];
        index += 1;
        return Promise.resolve({ done: false, value });
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
    await ragApi.askQuestionStream(
      {
        question: 'q',
        enable_multi_query: true,
      },
      onEvent
    );

    expect(fetch).toHaveBeenCalledWith(
      'http://127.0.0.1:8000/rag/ask/stream',
      expect.any(Object)
    );
    expect(onEvent).toHaveBeenNthCalledWith(1, {
      type: 'phase_update',
      data: { stage: 'retrieval' },
    });
    expect(onEvent).toHaveBeenNthCalledWith(2, {
      type: 'complete',
      data: { question: 'q', answer: 'ok', sources: [], metrics: null },
    });
  });

  it('parses deep research SSE stream without calling real backend', async () => {
    mockedAuth.getSession.mockResolvedValue({
      data: { session: { access_token: 'mock-token' } },
      error: null,
    } as never);

    const encoder = new TextEncoder();
    const chunks: Uint8Array[] = [
      encoder.encode('event: task_start\r\ndata: {"id":1}\r\n\r\n'),
      encoder.encode('event: complete\r\ndata: {"summary":"ok"}\r\n\r\n'),
    ];

    let index = 0;
    const reader = {
      read: vi.fn(() => {
        if (index >= chunks.length) {
          return Promise.resolve({ done: true, value: undefined });
        }

        const value = chunks[index];
        index += 1;
        return Promise.resolve({ done: false, value });
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
      'http://127.0.0.1:8000/rag/execute/stream',
      expect.any(Object)
    );
    expect(onEvent).toHaveBeenCalledTimes(2);
  });

  it('parses agentic benchmark SSE stream without calling real backend', async () => {
    mockedAuth.getSession.mockResolvedValue({
      data: { session: { access_token: 'mock-token' } },
      error: null,
    } as never);

    const encoder = new TextEncoder();
    const chunks: Uint8Array[] = [
      encoder.encode('event: plan_ready\r\ndata: {"task_count":2}\r\n\r\n'),
      encoder.encode('event: trace_step\r\n'),
      encoder.encode('data: {"step_id":"s1","title":"step"}\r\n\r\n'),
      encoder.encode(
        'event: complete\r\ndata: {"result":{"summary":"ok","detailed_answer":"details","question":"q","sub_tasks":[],"all_sources":[],"confidence":1,"total_iterations":0},"agent_trace":{"steps":[]}}\r\n\r\n'
      ),
    ];

    let index = 0;
    const reader = {
      read: vi.fn(() => {
        if (index >= chunks.length) {
          return Promise.resolve({ done: true, value: undefined });
        }

        const value = chunks[index];
        index += 1;
        return Promise.resolve({ done: false, value });
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
    await ragApi.executeAgenticBenchmarkStream(
      {
        question: 'q',
      },
      onEvent
    );

    expect(fetch).toHaveBeenCalledWith(
      'http://127.0.0.1:8000/rag/agentic/stream',
      expect.any(Object)
    );
    expect(onEvent).toHaveBeenCalledTimes(3);
    expect(onEvent).toHaveBeenNthCalledWith(1, {
      type: 'plan_ready',
      data: { task_count: 2 },
    });
    expect(onEvent).toHaveBeenNthCalledWith(2, {
      type: 'trace_step',
      data: { step_id: 's1', title: 'step' },
    });
  });

  it('blocks ordinary ask SSE stream when target is non-local in test mode', async () => {
    mockedApi.defaults.baseURL = 'https://api.example.com';
    mockedAuth.getSession.mockResolvedValue({
      data: { session: { access_token: 'mock-token' } },
      error: null,
    } as never);

    await expect(
      ragApi.askQuestionStream(
        {
          question: 'q',
        },
        vi.fn()
      )
    ).rejects.toThrow('測試/模擬模式禁止呼叫非本機 API');
  });
});
