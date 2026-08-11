import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  beginIntentionalSignOut,
  cancelIntentionalSignOut,
  getAccessToken,
  publishSessionExpired,
  refreshAccessToken,
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

describe('session recovery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetSessionExpiration();
  });

  it('returns the current access token', async () => {
    getSessionMock.mockResolvedValue({
      data: { session: { access_token: 'current-token' } },
      error: null,
    });

    await expect(getAccessToken()).resolves.toBe('current-token');
  });

  it('coalesces concurrent refreshes', async () => {
    refreshSessionMock.mockResolvedValue({
      data: { session: { access_token: 'fresh-token' } },
      error: null,
    });

    const [first, second] = await Promise.all([
      refreshAccessToken(),
      refreshAccessToken(),
    ]);

    expect(first).toBe('fresh-token');
    expect(second).toBe('fresh-token');
    expect(refreshSessionMock).toHaveBeenCalledTimes(1);
  });

  it('publishes expiration and local sign-out once', async () => {
    signOutMock.mockResolvedValue({ error: null });
    const listener = vi.fn();
    const unsubscribe = subscribeSessionExpired(listener);

    await Promise.all([publishSessionExpired(), publishSessionExpired()]);

    expect(signOutMock).toHaveBeenCalledTimes(1);
    expect(signOutMock).toHaveBeenCalledWith({ scope: 'local' });
    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
  });

  it('notifies expiration listeners when local sign-out fails', async () => {
    signOutMock.mockRejectedValue(new Error('storage unavailable'));
    const listener = vi.fn();
    const unsubscribe = subscribeSessionExpired(listener);

    await expect(publishSessionExpired()).resolves.toBeUndefined();

    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
  });

  it('suppresses delayed expiration after intentional sign-out begins', async () => {
    const listener = vi.fn();
    const unsubscribe = subscribeSessionExpired(listener);

    beginIntentionalSignOut();
    await publishSessionExpired();

    expect(signOutMock).not.toHaveBeenCalled();
    expect(listener).not.toHaveBeenCalled();
    unsubscribe();
  });

  it('allows genuine expiration after an intentional sign-out is cancelled', async () => {
    signOutMock.mockResolvedValue({ error: null });
    const listener = vi.fn();
    const unsubscribe = subscribeSessionExpired(listener);

    beginIntentionalSignOut();
    cancelIntentionalSignOut();
    await publishSessionExpired();

    expect(signOutMock).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
  });

  it('allows expiration after a successful token lifecycle reset', async () => {
    signOutMock.mockResolvedValue({ error: null });
    const listener = vi.fn();
    const unsubscribe = subscribeSessionExpired(listener);

    beginIntentionalSignOut();
    resetSessionExpiration();
    await publishSessionExpired();

    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
  });
});
