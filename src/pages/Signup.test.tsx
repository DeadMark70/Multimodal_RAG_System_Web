import { ChakraProvider } from '@chakra-ui/react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import type { AuthContextType } from '../contexts/auth-context';
import Signup from './Signup';
import theme from '../theme';

const navigateMock = vi.fn();
const useAuthMock = vi.fn<() => AuthContextType>();
const signOutMock = vi.fn();

const { signUpMock } = vi.hoisted(() => ({
  signUpMock: vi.fn(),
}));

vi.mock('../contexts/useAuth', () => ({
  useAuth: () => useAuthMock(),
}));

vi.mock('../services/supabase', () => ({
  supabase: {
    auth: {
      signUp: signUpMock,
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

describe('Signup', () => {
  beforeEach(() => {
    navigateMock.mockReset();
    signOutMock.mockReset();
    signUpMock.mockReset();
    signUpMock.mockResolvedValue({ data: {}, error: null });
    useAuthMock.mockReturnValue({
      session: null,
      user: null,
      loading: false,
      signOut: signOutMock,
    });
  });

  it('renders signup form for signed-out users', () => {
    render(
      <ChakraProvider theme={theme}>
        <MemoryRouter>
          <Signup />
        </MemoryRouter>
      </ChakraProvider>
    );

    expect(screen.getByRole('heading', { name: '建立研究工作台帳號' })).toBeInTheDocument();
    expect(screen.getByLabelText(/Display Name/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Email/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Password/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '回登入頁' })).toHaveAttribute('href', '/login');
  });

  it('submits signup with display name metadata and login redirect', async () => {
    render(
      <ChakraProvider theme={theme}>
        <MemoryRouter>
          <Signup />
        </MemoryRouter>
      </ChakraProvider>
    );

    fireEvent.change(screen.getByLabelText(/Display Name/), { target: { value: 'Test User' } });
    fireEvent.change(screen.getByLabelText(/Email/), { target: { value: 'user@example.com' } });
    fireEvent.change(screen.getByLabelText(/Password/), { target: { value: 'secret-pass' } });
    fireEvent.click(screen.getByRole('button', { name: '建立帳號' }));

    await waitFor(() => expect(signUpMock).toHaveBeenCalledTimes(1));
    expect(signUpMock).toHaveBeenCalledWith({
      email: 'user@example.com',
      password: 'secret-pass',
      options: {
        emailRedirectTo: `${window.location.origin}/login`,
        data: {
          display_name: 'Test User',
          full_name: 'Test User',
        },
      },
    });
    expect(screen.getAllByText('註冊成功，請至信箱完成驗證後再登入。').length).toBeGreaterThan(0);
  });

  it('shows error state when signup fails', async () => {
    signUpMock.mockRejectedValueOnce(new Error('request failed'));

    render(
      <ChakraProvider theme={theme}>
        <MemoryRouter>
          <Signup />
        </MemoryRouter>
      </ChakraProvider>
    );

    fireEvent.change(screen.getByLabelText(/Display Name/), { target: { value: 'Test User' } });
    fireEvent.change(screen.getByLabelText(/Email/), { target: { value: 'user@example.com' } });
    fireEvent.change(screen.getByLabelText(/Password/), { target: { value: 'secret-pass' } });
    fireEvent.click(screen.getByRole('button', { name: '建立帳號' }));

    await waitFor(() => expect(screen.getByText('註冊失敗，請稍後再試。')).toBeInTheDocument());
  });

  it('redirects authenticated users to the dashboard', async () => {
    useAuthMock.mockReturnValue({
      session: { user: { id: '1' } } as AuthContextType['session'],
      user: { id: '1' } as AuthContextType['user'],
      loading: false,
      signOut: signOutMock,
    });

    render(
      <ChakraProvider theme={theme}>
        <MemoryRouter>
          <Signup />
        </MemoryRouter>
      </ChakraProvider>
    );

    await waitFor(() => expect(navigateMock).toHaveBeenCalledWith('/dashboard'));
  });
});
