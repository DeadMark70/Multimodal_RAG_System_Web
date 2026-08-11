import { render, screen, waitFor } from '@testing-library/react';
import { ChakraProvider } from '@chakra-ui/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import Login from './Login';
import theme from '../theme';
import type { AuthContextType } from '../contexts/auth-context';
import { saveSessionReturnPath } from '../services/sessionReturnPath';

const navigateMock = vi.fn();
const signOutMock = vi.fn();
const useAuthMock = vi.fn<() => AuthContextType>();
const authRenderMock = vi.fn();
const acknowledgeSessionExpiredMock = vi.fn();

vi.mock('../contexts/useAuth', () => ({
  useAuth: () => useAuthMock(),
}));

vi.mock('../services/supabase', () => ({
  supabase: {},
}));

vi.mock('@supabase/auth-ui-react', () => ({
  Auth: (props: Record<string, unknown>) => {
    authRenderMock(props);
    return <div data-testid="supabase-auth">Supabase Auth</div>;
  },
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<Record<string, unknown>>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

describe('Login', () => {
  beforeEach(() => {
    navigateMock.mockReset();
    signOutMock.mockReset();
    authRenderMock.mockReset();
    acknowledgeSessionExpiredMock.mockReset();
    sessionStorage.clear();
    useAuthMock.mockReturnValue({
      session: null,
      user: null,
      loading: false,
      recoveryActive: false,
      sessionExpired: false,
      acknowledgeSessionExpired: acknowledgeSessionExpiredMock,
      signOut: signOutMock,
    });
  });

  it('renders the refreshed login layout for signed-out users', () => {
    render(
      <ChakraProvider theme={theme}>
        <MemoryRouter>
          <Login />
        </MemoryRouter>
      </ChakraProvider>
    );

    expect(screen.getByText('歡迎回到研究工作台')).toBeInTheDocument();
    expect(screen.getByText('Responsible')).toBeInTheDocument();
    expect(screen.getByTestId('supabase-auth')).toBeInTheDocument();
    const forgotPasswordLink = screen.getByRole('link', { name: '前往重設' });
    const signupLink = screen.getByRole('link', { name: '前往註冊' });
    expect(forgotPasswordLink).toHaveAttribute('href', '/forgot-password');
    expect(signupLink).toHaveAttribute('href', '/signup');
    expect(authRenderMock).toHaveBeenCalledWith(
      expect.objectContaining({
        view: 'sign_in',
        showLinks: false,
      })
    );
  });

  it('redirects authenticated users to the dashboard', async () => {
    useAuthMock.mockReturnValue({
      session: { user: { id: '1' } } as AuthContextType['session'],
      user: { id: '1' } as AuthContextType['user'],
      loading: false,
      recoveryActive: false,
      sessionExpired: false,
      acknowledgeSessionExpired: acknowledgeSessionExpiredMock,
      signOut: signOutMock,
    });

    render(
      <ChakraProvider theme={theme}>
        <MemoryRouter>
          <Login />
        </MemoryRouter>
      </ChakraProvider>
    );

    await waitFor(() =>
      expect(navigateMock).toHaveBeenCalledWith('/dashboard', { replace: true })
    );
  });

  it('restores a saved safe route after login', async () => {
    saveSessionReturnPath('/chat?mode=rag');
    useAuthMock.mockReturnValue({
      session: { user: { id: '1' } } as AuthContextType['session'],
      user: { id: '1' } as AuthContextType['user'],
      loading: false,
      recoveryActive: false,
      sessionExpired: false,
      acknowledgeSessionExpired: acknowledgeSessionExpiredMock,
      signOut: signOutMock,
    });

    render(
      <ChakraProvider theme={theme}>
        <MemoryRouter>
          <Login />
        </MemoryRouter>
      </ChakraProvider>
    );

    await waitFor(() =>
      expect(navigateMock).toHaveBeenCalledWith('/chat?mode=rag', { replace: true })
    );
  });

  it('falls back to dashboard when stored return data is unsafe', async () => {
    sessionStorage.setItem('rag.session.return-path.v1', 'https://evil.example');
    useAuthMock.mockReturnValue({
      session: { user: { id: '1' } } as AuthContextType['session'],
      user: { id: '1' } as AuthContextType['user'],
      loading: false,
      recoveryActive: false,
      sessionExpired: false,
      acknowledgeSessionExpired: acknowledgeSessionExpiredMock,
      signOut: signOutMock,
    });

    render(
      <ChakraProvider theme={theme}>
        <MemoryRouter>
          <Login />
        </MemoryRouter>
      </ChakraProvider>
    );

    await waitFor(() =>
      expect(navigateMock).toHaveBeenCalledWith('/dashboard', { replace: true })
    );
    expect(navigateMock).not.toHaveBeenCalledWith(
      expect.stringMatching(/^https?:/),
      expect.anything()
    );
  });
});
