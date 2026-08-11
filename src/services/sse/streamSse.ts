import type { z } from 'zod';

import {
  getAccessToken,
  publishSessionExpired,
  refreshAccessToken,
} from '../sessionRecovery';
import { parseSseEvent } from './protocol';
import type { EventFromSchemaMap } from './schemas';

export type StreamConnectionStatus =
  | { state: 'connecting' }
  | { state: 'connected' }
  | { state: 'reconnecting'; attempt: number; maxAttempts: 2 }
  | { state: 'complete' }
  | { state: 'disconnected' };

export class SseTransportError extends Error {
  readonly kind:
    | 'http'
    | 'rate_limited'
    | 'disconnected'
    | 'server'
    | 'auth';
  readonly status?: number;
  readonly retryAfter?: string;

  constructor(
    kind:
      | 'http'
      | 'rate_limited'
      | 'disconnected'
      | 'server'
      | 'auth',
    message: string,
    status?: number,
    retryAfter?: string
  ) {
    super(message);
    this.name = 'SseTransportError';
    this.kind = kind;
    this.status = status;
    this.retryAfter = retryAfter;
  }
}

type EventSchemaMap = Record<string, z.ZodType>;
type FetchImplementation = (
  input: RequestInfo | URL,
  init?: RequestInit
) => Promise<Response>;
type Sleep = (delayMs: number) => Promise<void>;

export interface StreamSseOptions<TMap extends EventSchemaMap> {
  url: string;
  body: unknown;
  schemas: TMap;
  onEvent: (event: EventFromSchemaMap<TMap>) => void;
  onStatus?: (status: StreamConnectionStatus) => void;
  signal?: AbortSignal;
  fetchImpl?: FetchImplementation;
  sleep?: Sleep;
}

const RETRY_DELAYS_MS = [500, 1500] as const;
const RETRYABLE_STATUSES = new Set([502, 503, 504]);
const jitter = (base: number) =>
  base + Math.floor(Math.random() * Math.min(250, base / 2));

const retryableErrors = new WeakSet<SseTransportError>();

interface AttemptState {
  deliveredEventCount: number;
}

function defaultSleep(delayMs: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, delayMs));
}

function abortError(signal?: AbortSignal): Error {
  if (signal?.reason instanceof Error) {
    return signal.reason;
  }

  return new DOMException('Aborted', 'AbortError');
}

function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) {
    throw abortError(signal);
  }
}

async function waitForRetry(
  delayMs: number,
  sleep: Sleep,
  signal?: AbortSignal
): Promise<void> {
  throwIfAborted(signal);

  if (!signal) {
    await sleep(delayMs);
    return;
  }

  await new Promise<void>((resolve, reject) => {
    const onAbort = () => {
      cleanup();
      reject(abortError(signal));
    };
    const cleanup = () => signal.removeEventListener('abort', onAbort);

    signal.addEventListener('abort', onAbort, { once: true });
    sleep(delayMs).then(
      () => {
        cleanup();
        resolve();
      },
      (error: unknown) => {
        cleanup();
        reject(error instanceof Error ? error : new Error('Retry wait failed'));
      }
    );
  });

  throwIfAborted(signal);
}

function httpError(response: Response): SseTransportError {
  if (response.status === 429) {
    return new SseTransportError(
      'rate_limited',
      '請求過於頻繁，請稍後再試',
      429,
      response.headers.get('Retry-After') ?? undefined
    );
  }

  const kind = response.status >= 500 ? 'server' : 'http';
  const message = `HTTP ${response.status}: ${response.statusText}`;
  if (RETRYABLE_STATUSES.has(response.status)) {
    return retryable(
      new SseTransportError(kind, message, response.status)
    );
  }

  return new SseTransportError(kind, message, response.status);
}

function retryable(error: SseTransportError): SseTransportError {
  retryableErrors.add(error);
  return error;
}

function disconnectedError(): SseTransportError {
  return retryable(
    new SseTransportError('disconnected', '串流連線已中斷')
  );
}

async function getTokenOrExpire(): Promise<string> {
  const currentToken = await getAccessToken();
  if (currentToken) {
    return currentToken;
  }

  const refreshedToken = await refreshAccessToken();
  if (refreshedToken) {
    return refreshedToken;
  }

  await publishSessionExpired();
  throw new SseTransportError('auth', '登入已過期', 401);
}

async function fetchResponse(
  fetchImpl: FetchImplementation,
  url: string,
  serializedBody: string | undefined,
  signal?: AbortSignal,
  accessTokenOverride?: string
): Promise<Response> {
  throwIfAborted(signal);
  const accessToken = accessTokenOverride ?? (await getTokenOrExpire());
  throwIfAborted(signal);

  try {
    return await fetchImpl(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: serializedBody,
      signal,
    });
  } catch (error: unknown) {
    if (signal?.aborted) {
      throw abortError(signal);
    }
    if (error instanceof SseTransportError) {
      throw error;
    }
    throw disconnectedError();
  }
}

async function readStream<TMap extends EventSchemaMap>(
  response: Response,
  schemas: TMap,
  onEvent: (event: EventFromSchemaMap<TMap>) => void,
  state: AttemptState,
  signal?: AbortSignal
): Promise<void> {
  const reader = response.body?.getReader();
  if (!reader) {
    throw disconnectedError();
  }

  const decoder = new TextDecoder();
  let buffer = '';
  let currentEvent = '';
  const currentDataLines: string[] = [];
  let terminal = false;

  const flushEvent = () => {
    if (!currentEvent || currentDataLines.length === 0) {
      currentEvent = '';
      currentDataLines.length = 0;
      return;
    }

    throwIfAborted(signal);
    const event = parseSseEvent(
      schemas,
      currentEvent,
      currentDataLines.join('\n')
    );
    onEvent(event);
    state.deliveredEventCount += 1;
    if (event.type === 'complete' || event.type === 'error') {
      terminal = true;
    }
    currentEvent = '';
    currentDataLines.length = 0;
  };

  const processLine = (rawLine: string) => {
    const line = rawLine.replace(/\r$/, '');
    if (line.startsWith('event:')) {
      currentEvent = line.slice(6).trim();
    } else if (line.startsWith('data:')) {
      currentDataLines.push(line.slice(5).trimStart());
    } else if (line === '') {
      flushEvent();
    }
  };

  while (!terminal) {
    throwIfAborted(signal);
    let result: ReadableStreamReadResult<Uint8Array>;
    try {
      result = await reader.read();
    } catch {
      if (signal?.aborted) {
        throw abortError(signal);
      }
      throw disconnectedError();
    }

    if (result.done) {
      buffer += decoder.decode();
      if (buffer) {
        processLine(buffer);
        buffer = '';
      }
      flushEvent();
      break;
    }

    buffer += decoder.decode(result.value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';
    for (const line of lines) {
      processLine(line);
      if (terminal) {
        break;
      }
    }
  }

  if (!terminal) {
    throw disconnectedError();
  }
}

export async function streamSse<TMap extends EventSchemaMap>({
  url,
  body,
  schemas,
  onEvent,
  onStatus,
  signal,
  fetchImpl = fetch,
  sleep = defaultSleep,
}: StreamSseOptions<TMap>): Promise<void> {
  const serializedBody = JSON.stringify(body);
  let transportRetryCount = 0;
  let refreshedAfterUnauthorized = false;
  onStatus?.({ state: 'connecting' });

  while (true) {
    const state: AttemptState = { deliveredEventCount: 0 };

    try {
      let response = await fetchResponse(
        fetchImpl,
        url,
        serializedBody,
        signal
      );

      if (response.status === 401) {
        if (refreshedAfterUnauthorized) {
          await publishSessionExpired();
          throw new SseTransportError('auth', '登入已過期', 401);
        }

        refreshedAfterUnauthorized = true;
        const refreshedToken = await refreshAccessToken();
        if (!refreshedToken) {
          await publishSessionExpired();
          throw new SseTransportError('auth', '登入已過期', 401);
        }

        response = await fetchResponse(
          fetchImpl,
          url,
          serializedBody,
          signal,
          refreshedToken
        );
        if (response.status === 401) {
          await publishSessionExpired();
          throw new SseTransportError('auth', '登入已過期', 401);
        }
      }

      if (!response.ok) {
        throw httpError(response);
      }

      onStatus?.({ state: 'connected' });
      await readStream(response, schemas, onEvent, state, signal);
      onStatus?.({ state: 'complete' });
      return;
    } catch (error: unknown) {
      if (signal?.aborted) {
        throw abortError(signal);
      }

      const canRetry =
        error instanceof SseTransportError &&
        retryableErrors.has(error) &&
        state.deliveredEventCount === 0 &&
        transportRetryCount < RETRY_DELAYS_MS.length;

      if (canRetry) {
        transportRetryCount += 1;
        onStatus?.({
          state: 'reconnecting',
          attempt: transportRetryCount,
          maxAttempts: 2,
        });
        await waitForRetry(
          jitter(RETRY_DELAYS_MS[transportRetryCount - 1]),
          sleep,
          signal
        );
        continue;
      }

      onStatus?.({ state: 'disconnected' });
      throw error;
    }
  }
}
