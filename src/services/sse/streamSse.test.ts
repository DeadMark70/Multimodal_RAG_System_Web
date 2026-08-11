import { beforeEach, describe, expect, it, vi } from 'vitest';

import { chatEventSchemas } from './schemas';
import type { ChatStreamEvent } from './schemas';
import {
  SseTransportError,
  streamSse,
  type StreamConnectionStatus,
  type StreamSseOptions,
} from './streamSse';

const sessionMocks = vi.hoisted(() => ({
  getAccessToken: vi.fn(),
  refreshAccessToken: vi.fn(),
  publishSessionExpired: vi.fn(),
}));

vi.mock('../sessionRecovery', () => sessionMocks);

const encoder = new TextEncoder();
const validPhaseFrame =
  'event: phase_update\r\ndata: {"stage":"retrieval"}\r\n\r\n';
const validCompleteFrame =
  'event: complete\r\ndata: {"question":"q","answer":"ok","sources":[],"metrics":null}';

function response(status: number, headers?: HeadersInit): Response {
  return new Response(null, {
    status,
    statusText: status === 429 ? 'Too Many Requests' : 'Request failed',
    headers,
  });
}

function sseResponse(...chunks: string[]): Response {
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      chunks.forEach((chunk) => controller.enqueue(encoder.encode(chunk)));
      controller.close();
    },
  });

  return new Response(body, {
    status: 200,
    headers: { 'Content-Type': 'text/event-stream' },
  });
}

function brokenSseResponse(firstChunk: string): Response {
  let deliveredChunk = false;
  const body = new ReadableStream<Uint8Array>(
    {
      pull(controller) {
        if (!deliveredChunk) {
          deliveredChunk = true;
          controller.enqueue(encoder.encode(firstChunk));
          return;
        }

        controller.error(new TypeError('connection reset'));
      },
    },
    { highWaterMark: 0 }
  );

  return new Response(body, { status: 200 });
}

describe('streamSse', () => {
  let fetchMock: ReturnType<typeof vi.fn<typeof fetch>>;
  let onEvent: ReturnType<typeof vi.fn<(event: ChatStreamEvent) => void>>;
  let statuses: StreamConnectionStatus[];

  function options(
    overrides: Partial<StreamSseOptions<typeof chatEventSchemas>> = {}
  ): StreamSseOptions<typeof chatEventSchemas> {
    return {
      url: 'http://127.0.0.1:8000/rag/ask/stream',
      body: { question: 'q' },
      schemas: chatEventSchemas,
      onEvent,
      onStatus: (status) => statuses.push(status),
      fetchImpl: fetchMock,
      sleep: vi.fn().mockResolvedValue(undefined),
      ...overrides,
    };
  }

  beforeEach(() => {
    vi.clearAllMocks();
    fetchMock = vi.fn<typeof fetch>();
    onEvent = vi.fn<(event: ChatStreamEvent) => void>();
    statuses = [];
    sessionMocks.getAccessToken.mockResolvedValue('current-token');
    sessionMocks.refreshAccessToken.mockResolvedValue('fresh-token');
    sessionMocks.publishSessionExpired.mockResolvedValue(undefined);
  });

  it('retries two pre-event 503 responses then succeeds', async () => {
    fetchMock
      .mockResolvedValueOnce(response(503))
      .mockResolvedValueOnce(response(503))
      .mockResolvedValueOnce(sseResponse(validCompleteFrame));

    await streamSse(options());

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(statuses).toEqual([
      { state: 'connecting' },
      { state: 'reconnecting', attempt: 1, maxAttempts: 2 },
      { state: 'reconnecting', attempt: 2, maxAttempts: 2 },
      { state: 'connected' },
      { state: 'complete' },
    ]);
  });

  it('does not retry after one valid event', async () => {
    fetchMock.mockResolvedValueOnce(brokenSseResponse(validPhaseFrame));

    await expect(streamSse(options())).rejects.toMatchObject({
      kind: 'disconnected',
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(onEvent).toHaveBeenCalledTimes(1);
  });

  it('rejects malformed payloads before delivery or retry', async () => {
    fetchMock.mockResolvedValueOnce(
      sseResponse('event: phase_update\ndata: {"stage":42}\n\n')
    );

    await expect(streamSse(options())).rejects.toMatchObject({
      name: 'SseProtocolError',
      kind: 'invalid_payload',
    });

    expect(onEvent).not.toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('rejects EOF without a terminal event', async () => {
    fetchMock.mockResolvedValueOnce(sseResponse(validPhaseFrame));

    await expect(streamSse(options())).rejects.toEqual(
      new SseTransportError('disconnected', '串流連線已中斷')
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('maps 429 without automatically retrying', async () => {
    fetchMock.mockResolvedValueOnce(
      response(429, { 'Retry-After': '5' })
    );

    await expect(streamSse(options())).rejects.toMatchObject({
      kind: 'rate_limited',
      status: 429,
      retryAfter: '5',
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('maps non-retryable 400 responses to HTTP errors', async () => {
    fetchMock.mockResolvedValueOnce(response(400));

    await expect(streamSse(options())).rejects.toMatchObject({
      kind: 'http',
      status: 400,
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('stops without retrying when aborted', async () => {
    const controller = new AbortController();
    fetchMock.mockImplementationOnce(() => {
      controller.abort();
      return Promise.reject(new DOMException('Aborted', 'AbortError'));
    });

    await expect(
      streamSse(options({ signal: controller.signal }))
    ).rejects.toMatchObject({ name: 'AbortError' });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(statuses).not.toContainEqual({ state: 'reconnecting' });
    expect(onEvent).not.toHaveBeenCalled();
  });

  it('refreshes once after a 401 and repeats the same attempt', async () => {
    fetchMock
      .mockResolvedValueOnce(response(401))
      .mockResolvedValueOnce(sseResponse(validCompleteFrame));

    await streamSse(options());

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(sessionMocks.refreshAccessToken).toHaveBeenCalledTimes(1);
    expect(
      new Headers(fetchMock.mock.calls[0]?.[1]?.headers).get('Authorization')
    ).toBe('Bearer current-token');
    expect(
      new Headers(fetchMock.mock.calls[1]?.[1]?.headers).get('Authorization')
    ).toBe('Bearer fresh-token');
    expect(statuses).not.toContainEqual(
      expect.objectContaining({ state: 'reconnecting' })
    );
  });

  it('publishes expiration and rejects a second 401', async () => {
    fetchMock
      .mockResolvedValueOnce(response(401))
      .mockResolvedValueOnce(response(401));

    await expect(streamSse(options())).rejects.toMatchObject({
      kind: 'auth',
      status: 401,
      message: '登入已過期',
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(sessionMocks.refreshAccessToken).toHaveBeenCalledTimes(1);
    expect(sessionMocks.publishSessionExpired).toHaveBeenCalledTimes(1);
  });

  it('falls back to a refresh when no current token exists', async () => {
    sessionMocks.getAccessToken.mockResolvedValueOnce(null);
    fetchMock.mockResolvedValueOnce(sseResponse(validCompleteFrame));

    await streamSse(options());

    expect(sessionMocks.refreshAccessToken).toHaveBeenCalledTimes(1);
    expect(
      new Headers(fetchMock.mock.calls[0]?.[1]?.headers).get('Authorization')
    ).toBe('Bearer fresh-token');
  });

  it('parses multiline data fields across chunk boundaries', async () => {
    fetchMock.mockResolvedValueOnce(
      sseResponse(
        'event: phase_up',
        'date\r\ndata: {"stage":\r\n',
        'data: "retrieval", "label":"Searching"}\r\n\r\nevent: complete\r\n',
        'data: {"question":"q","answer":"ok","sources":[],"metrics":null}'
      )
    );

    await streamSse(options());

    expect(onEvent).toHaveBeenNthCalledWith(1, {
      type: 'phase_update',
      data: { stage: 'retrieval', label: 'Searching' },
    });
    expect(onEvent).toHaveBeenNthCalledWith(2, {
      type: 'complete',
      data: { question: 'q', answer: 'ok', sources: [], metrics: null },
    });
  });

  it('stops delivery after a terminal event in the same chunk', async () => {
    fetchMock.mockResolvedValueOnce(
      sseResponse(`${validCompleteFrame}\r\n\r\n${validPhaseFrame}`)
    );

    await streamSse(options());

    expect(onEvent).toHaveBeenCalledTimes(1);
    expect(onEvent).toHaveBeenCalledWith({
      type: 'complete',
      data: { question: 'q', answer: 'ok', sources: [], metrics: null },
    });
  });

  it('stops after the third retryable HTTP failure', async () => {
    fetchMock.mockResolvedValue(response(503));

    await expect(streamSse(options())).rejects.toMatchObject({
      kind: 'server',
      status: 503,
    });

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(statuses).toEqual([
      { state: 'connecting' },
      { state: 'reconnecting', attempt: 1, maxAttempts: 2 },
      { state: 'reconnecting', attempt: 2, maxAttempts: 2 },
      { state: 'disconnected' },
    ]);
  });
});
