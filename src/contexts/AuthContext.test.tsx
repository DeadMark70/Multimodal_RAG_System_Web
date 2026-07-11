import { render, waitFor } from '@testing-library/react';
import { act } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AuthChangeEvent, Session } from '@supabase/supabase-js';
import { AuthProvider } from './AuthContext';
import { useAuth } from './useAuth';

let authStateChangeCallback: ((event: AuthChangeEvent, session: Session | null) => void) | null = null;

const { getSessionMock, onAuthStateChangeMock, signOutMock, unsubscribeMock } = vi.hoisted(() => ({
  getSessionMock: vi.fn(),
  onAuthStateChangeMock: vi.fn(),
  signOutMock: vi.fn(),
  unsubscribeMock: vi.fn(),
}));

vi.mock('../services/supabase', () => ({
  supabase: {
    auth: {
      getSession: getSessionMock,
      onAuthStateChange: onAuthStateChangeMock,
      signOut: signOutMock,
    },
  },
}));

describe('AuthProvider', () => {
  const TriggerSignOut = () => {
    const { signOut } = useAuth();
    return (
      <button
        type="button"
        onClick={() => {
          void signOut();
        }}
      >
        sign-out
      </button>
    );
  };

  const RecoveryProbe = () => {
    const { recoveryActive } = useAuth();
    return <div data-testid="recovery-active">{String(recoveryActive)}</div>;
  };

  beforeEach(() => {
    authStateChangeCallback = null;
    getSessionMock.mockReset();
    onAuthStateChangeMock.mockReset();
    unsubscribeMock.mockReset();
    signOutMock.mockReset();

    getSessionMock.mockResolvedValue({
      data: { session: null },
    });

    onAuthStateChangeMock.mockImplementation((callback: (event: AuthChangeEvent, session: Session | null) => void) => {
      authStateChangeCallback = callback;
      return {
        data: {
          subscription: {
            unsubscribe: unsubscribeMock,
          },
        },
      };
    });

    window.history.pushState({}, '', '/');
  });

  it('redirects to reset-password route when PASSWORD_RECOVERY event arrives', async () => {
    render(
      <AuthProvider>
        <div>child</div>
      </AuthProvider>
    );

    await waitFor(() => expect(authStateChangeCallback).not.toBeNull());

    act(() => {
      authStateChangeCallback?.('PASSWORD_RECOVERY', null);
    });

    expect(window.location.pathname).toBe('/reset-password');
  });

  it('activates recovery only after PASSWORD_RECOVERY', async () => {
    const { getByTestId } = render(
      <AuthProvider>
        <RecoveryProbe />
      </AuthProvider>
    );

    await waitFor(() => expect(authStateChangeCallback).not.toBeNull());
    expect(getByTestId('recovery-active')).toHaveTextContent('false');

    act(() => {
      authStateChangeCallback?.('PASSWORD_RECOVERY', null);
    });

    expect(getByTestId('recovery-active')).toHaveTextContent('true');
  });

  it('does not activate recovery for a persisted normal session', async () => {
    getSessionMock.mockResolvedValue({
      data: { session: { user: { id: '1' } } },
    });

    const { getByTestId } = render(
      <AuthProvider>
        <RecoveryProbe />
      </AuthProvider>
    );

    await waitFor(() => expect(getByTestId('recovery-active')).toHaveTextContent('false'));
  });

  it('does not redirect for non-recovery auth events', async () => {
    render(
      <AuthProvider>
        <div>child</div>
      </AuthProvider>
    );

    await waitFor(() => expect(authStateChangeCallback).not.toBeNull());

    act(() => {
      authStateChangeCallback?.('SIGNED_IN', null);
    });

    expect(window.location.pathname).toBe('/');
  });

  it('falls back to local sign-out when global sign-out fails', async () => {
    signOutMock
      .mockResolvedValueOnce({ error: new Error('session missing') })
      .mockResolvedValueOnce({ error: null });

    const { getByRole } = render(
      <AuthProvider>
        <TriggerSignOut />
      </AuthProvider>
    );

    await waitFor(() => expect(authStateChangeCallback).not.toBeNull());

    act(() => {
      getByRole('button', { name: 'sign-out' }).click();
    });

    await waitFor(() => {
      expect(signOutMock).toHaveBeenNthCalledWith(1, { scope: 'global' });
      expect(signOutMock).toHaveBeenNthCalledWith(2, { scope: 'local' });
    });
  });

  it('clears recovery state on sign-out', async () => {
    signOutMock.mockResolvedValue({ error: null });

    const { getByRole, getByTestId } = render(
      <AuthProvider>
        <RecoveryProbe />
        <TriggerSignOut />
      </AuthProvider>
    );

    await waitFor(() => expect(authStateChangeCallback).not.toBeNull());
    act(() => {
      authStateChangeCallback?.('PASSWORD_RECOVERY', null);
    });
    expect(getByTestId('recovery-active')).toHaveTextContent('true');

    act(() => {
      getByRole('button', { name: 'sign-out' }).click();
    });

    await waitFor(() => expect(getByTestId('recovery-active')).toHaveTextContent('false'));
  });
});
