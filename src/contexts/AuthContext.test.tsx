import { render, waitFor } from '@testing-library/react';
import { act } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AuthChangeEvent, Session } from '@supabase/supabase-js';
import { AuthProvider } from './AuthContext';

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
  beforeEach(() => {
    authStateChangeCallback = null;
    getSessionMock.mockReset();
    onAuthStateChangeMock.mockReset();
    unsubscribeMock.mockReset();

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
});
