import { ChakraProvider } from '@chakra-ui/react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import ResetPassword from './ResetPassword';
import theme from '../theme';
import type { AuthContextType } from '../contexts/auth-context';

const navigateMock = vi.fn();
const signOutMock = vi.fn();
const useAuthMock = vi.fn<() => AuthContextType>();

const { updateUserMock } = vi.hoisted(() => ({
  updateUserMock: vi.fn(),
}));

vi.mock('../contexts/useAuth', () => ({
  useAuth: () => useAuthMock(),
}));

vi.mock('../services/supabase', () => ({
  supabase: {
    auth: {
      updateUser: updateUserMock,
    },
  },
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<Record<string, unknown>>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

describe('ResetPassword', () => {
  beforeEach(() => {
    navigateMock.mockReset();
    signOutMock.mockReset();
    updateUserMock.mockReset();
    updateUserMock.mockResolvedValue({ data: { user: { id: '1' } }, error: null });
    useAuthMock.mockReturnValue({
      session: { user: { id: '1' } } as AuthContextType['session'],
      user: { id: '1' } as AuthContextType['user'],
      loading: false,
      signOut: signOutMock,
    });
    signOutMock.mockResolvedValue(undefined);
  });

  it('shows invalid-link state when there is no active reset session', () => {
    useAuthMock.mockReturnValue({
      session: null,
      user: null,
      loading: false,
      signOut: signOutMock,
    });

    render(
      <ChakraProvider theme={theme}>
        <MemoryRouter>
          <ResetPassword />
        </MemoryRouter>
      </ChakraProvider>
    );

    expect(screen.getByRole('heading', { name: '重設連結不可用' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '回登入頁' })).toHaveAttribute('href', '/login');
  });

  it('blocks submission when passwords do not match', async () => {
    render(
      <ChakraProvider theme={theme}>
        <MemoryRouter>
          <ResetPassword />
        </MemoryRouter>
      </ChakraProvider>
    );

    fireEvent.change(screen.getByLabelText(/^新密碼/), { target: { value: 'new-password-1' } });
    fireEvent.change(screen.getByLabelText(/確認新密碼/), { target: { value: 'new-password-2' } });
    fireEvent.click(screen.getByRole('button', { name: '更新密碼' }));

    await waitFor(() => expect(updateUserMock).not.toHaveBeenCalled());
    expect(screen.getByText('兩次輸入的密碼不一致。')).toBeInTheDocument();
  });

  it('updates password and redirects to login on success', async () => {
    render(
      <ChakraProvider theme={theme}>
        <MemoryRouter>
          <ResetPassword />
        </MemoryRouter>
      </ChakraProvider>
    );

    fireEvent.change(screen.getByLabelText(/^新密碼/), { target: { value: 'new-password-123' } });
    fireEvent.change(screen.getByLabelText(/確認新密碼/), { target: { value: 'new-password-123' } });
    fireEvent.click(screen.getByRole('button', { name: '更新密碼' }));

    await waitFor(() => expect(updateUserMock).toHaveBeenCalledWith({ password: 'new-password-123' }));
    await waitFor(() => expect(signOutMock).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(navigateMock).toHaveBeenCalledWith('/login', { replace: true }));
  });
});
