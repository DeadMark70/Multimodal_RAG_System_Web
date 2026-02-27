import { beforeEach, describe, expect, it, vi } from 'vitest';
import api from './api';
import { supabase } from './supabase';

vi.mock('./supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
    },
  },
}));

describe('api interceptors', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('injects Authorization header when session exists', async () => {
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
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
