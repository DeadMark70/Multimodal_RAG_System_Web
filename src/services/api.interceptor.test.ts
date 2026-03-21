import { beforeEach, describe, expect, it, vi } from 'vitest';
import api from './api';

const { getSessionMock, refreshSessionMock } = vi.hoisted(() => ({
  getSessionMock: vi.fn(),
  refreshSessionMock: vi.fn(),
}));

vi.mock('./supabase', () => ({
  supabase: {
    auth: {
      getSession: getSessionMock,
      refreshSession: refreshSessionMock,
    },
  },
}));

describe('api interceptors', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

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
});
