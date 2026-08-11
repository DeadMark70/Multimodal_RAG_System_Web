import { AxiosHeaders } from 'axios';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import api from './api';
import { downloadPdf } from './pdfApi';
import {
  resetSessionExpiration,
  subscribeSessionExpired,
} from './sessionRecovery';

const { getSessionMock, refreshSessionMock, signOutMock } = vi.hoisted(() => ({
  getSessionMock: vi.fn(),
  refreshSessionMock: vi.fn(),
  signOutMock: vi.fn(),
}));

vi.mock('./supabase', () => ({
  supabase: {
    auth: {
      getSession: getSessionMock,
      refreshSession: refreshSessionMock,
      signOut: signOutMock,
    },
  },
}));

describe('api interceptors', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
    resetSessionExpiration();
  });

  const responseRejected = (
    error: unknown
  ): Promise<unknown> => (
    api.interceptors.response as unknown as {
      handlers: Array<{ rejected: (error: unknown) => Promise<unknown> }>;
    }
  ).handlers[0].rejected(error);

  it('injects Authorization header when session exists', async () => {
    getSessionMock.mockResolvedValue({
      data: { session: { access_token: 'token-123' } },
      error: null,
    } as never);

    const requestInterceptor = (
      api.interceptors.request as unknown as {
        handlers: Array<{ fulfilled: (config: unknown) => Promise<unknown> }>;
      }
    ).handlers[0].fulfilled;

    const setHeader = vi.fn();
    const config = { headers: { set: setHeader } };

    await requestInterceptor(config);

    expect(setHeader).toHaveBeenCalledWith('Authorization', 'Bearer token-123');
  });

  it('refreshes session when getSession does not return an access token', async () => {
    getSessionMock.mockResolvedValue({
      data: { session: null },
      error: null,
    } as never);
    refreshSessionMock.mockResolvedValue({
      data: { session: { access_token: 'token-refreshed' } },
      error: null,
    } as never);

    const requestInterceptor = (
      api.interceptors.request as unknown as {
        handlers: Array<{ fulfilled: (config: unknown) => Promise<unknown> }>;
      }
    ).handlers[0].fulfilled;

    const setHeader = vi.fn();
    const config = { headers: { set: setHeader } };

    await requestInterceptor(config);

    expect(refreshSessionMock).toHaveBeenCalledTimes(1);
    expect(setHeader).toHaveBeenCalledWith('Authorization', 'Bearer token-refreshed');
  });

  it('blocks non-local api targets in test mode before attaching token', async () => {
    getSessionMock.mockResolvedValue({
      data: { session: { access_token: 'token-123' } },
      error: null,
    } as never);

    const requestInterceptor = (
      api.interceptors.request as unknown as {
        handlers: Array<{ fulfilled: (config: unknown) => Promise<unknown> }>;
      }
    ).handlers[0].fulfilled;

    const setHeader = vi.fn();
    const config = { baseURL: 'https://api.example.com', url: '/v1/items', headers: { set: setHeader } };

    await expect(requestInterceptor(config)).rejects.toThrow('測試/模擬模式禁止呼叫非本機 API');
    expect(setHeader).not.toHaveBeenCalled();
  });

  it('maps backend detail error message to thrown Error', async () => {
    const responseErrorInterceptor = (
      api.interceptors.response as unknown as {
        handlers: Array<{ rejected: (error: unknown) => Promise<unknown> }>;
      }
    ).handlers[0].rejected;

    await expect(
      responseErrorInterceptor({
        response: {
          status: 500,
          data: { detail: 'backend failed' },
        },
        message: 'Request failed',
      })
    ).rejects.toThrow('backend failed');
  });

  it('maps new error envelope message to thrown Error', async () => {
    const responseErrorInterceptor = (
      api.interceptors.response as unknown as {
        handlers: Array<{ rejected: (error: unknown) => Promise<unknown> }>;
      }
    ).handlers[0].rejected;

    await expect(
      responseErrorInterceptor({
        response: {
          status: 400,
          data: { error: { code: 'BAD_REQUEST', message: 'invalid payload' } },
        },
        message: 'Request failed',
      })
    ).rejects.toThrow('invalid payload');
  });

  it('falls back to axios error message when detail is missing', async () => {
    const responseErrorInterceptor = (
      api.interceptors.response as unknown as {
        handlers: Array<{ rejected: (error: unknown) => Promise<unknown> }>;
      }
    ).handlers[0].rejected;

    await expect(
      responseErrorInterceptor({
        response: { status: 503, data: {} },
        message: 'Service unavailable',
      })
    ).rejects.toThrow('Service unavailable');
  });

  it('refreshes and retries one 401 exactly once', async () => {
    refreshSessionMock.mockResolvedValue({
      data: { session: { access_token: 'fresh-token' } },
      error: null,
    } as never);
    const requestSpy = vi.spyOn(api, 'request').mockResolvedValue({ data: 'ok' });

    const result = await responseRejected({
      config: { url: '/rag/ask', headers: new AxiosHeaders() },
      response: { status: 401, data: {} },
      message: 'Unauthorized',
    });

    expect(requestSpy).toHaveBeenCalledTimes(1);
    const retriedConfig = requestSpy.mock.calls[0][0] as {
      _sessionRetry?: boolean;
      headers: AxiosHeaders;
    };
    expect(retriedConfig._sessionRetry).toBe(true);
    expect(retriedConfig.headers.get('Authorization')).toBe(
      'Bearer fresh-token'
    );
    expect(result).toEqual({ data: 'ok' });
  });

  it('does not refresh an already retried 401', async () => {
    signOutMock.mockResolvedValue({ error: null });
    const listener = vi.fn();
    const unsubscribe = subscribeSessionExpired(listener);

    try {
      await expect(
        responseRejected({
          config: {
            url: '/rag/ask',
            headers: new AxiosHeaders(),
            _sessionRetry: true,
          },
          response: { status: 401, data: {} },
          message: 'Unauthorized',
        })
      ).rejects.toMatchObject({ name: 'ApiError', status: 401 });

      expect(refreshSessionMock).not.toHaveBeenCalled();
      expect(signOutMock).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledTimes(1);
    } finally {
      unsubscribe();
    }
  });

  it('publishes expiration when a 401 refresh fails', async () => {
    refreshSessionMock.mockResolvedValue({
      data: { session: null },
      error: new Error('refresh failed'),
    } as never);
    signOutMock.mockResolvedValue({ error: null });
    const requestSpy = vi.spyOn(api, 'request');
    const listener = vi.fn();
    const unsubscribe = subscribeSessionExpired(listener);

    try {
      await expect(
        responseRejected({
          config: { url: '/rag/ask', headers: new AxiosHeaders() },
          response: { status: 401, data: {} },
          message: 'Unauthorized',
        })
      ).rejects.toMatchObject({ name: 'ApiError', status: 401 });

      expect(refreshSessionMock).toHaveBeenCalledTimes(1);
      expect(requestSpy).not.toHaveBeenCalled();
      expect(signOutMock).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledTimes(1);
    } finally {
      unsubscribe();
    }
  });

  it('does not refresh non-401 responses', async () => {
    await expect(
      responseRejected({
        config: { url: '/rag/ask', headers: new AxiosHeaders() },
        response: { status: 403, data: {} },
        message: 'Forbidden',
      })
    ).rejects.toMatchObject({ name: 'ApiError', status: 403 });

    expect(refreshSessionMock).not.toHaveBeenCalled();
    expect(signOutMock).not.toHaveBeenCalled();
  });

  it('preserves a 401 status through the real PDF download service', async () => {
    getSessionMock.mockResolvedValue({
      data: { session: { access_token: 'token-123' } },
      error: null,
    } as never);
    const originalAdapter = api.defaults.adapter;
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    api.defaults.adapter = vi.fn().mockRejectedValue({
      response: {
        status: 401,
        data: { error: { code: 'UNAUTHORIZED', message: 'Session expired' } },
      },
      message: 'Request failed with status code 401',
    });

    try {
      await expect(downloadPdf('doc-1', 'original')).rejects.toMatchObject({
        message: 'Session expired',
        status: 401,
      });
    } finally {
      api.defaults.adapter = originalAdapter;
      consoleError.mockRestore();
    }
  });
});
