import { render, screen, waitFor } from '@testing-library/react';
import { ChakraProvider } from '@chakra-ui/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import type * as ReactRouterDom from 'react-router-dom';
import Login from './Login';
import theme from '../theme';
import type { AuthContextType } from '../contexts/auth-context';

const navigateMock = vi.fn();
const signOutMock = vi.fn();
const useAuthMock = vi.fn<() => AuthContextType>();

vi.mock('../contexts/useAuth', () => ({
  useAuth: () => useAuthMock(),
}));

vi.mock('../services/supabase', () => ({
  supabase: {},
}));

vi.mock('@supabase/auth-ui-react', () => ({
  Auth: () => <div data-testid="supabase-auth">Supabase Auth</div>,
}));

vi.mock('react-router-dom', async () => {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const actual = (await vi.importActual('react-router-dom')) as unknown as ReactRouterDom;
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

describe('Login', () => {
  beforeEach(() => {
    navigateMock.mockReset();
    signOutMock.mockReset();
    useAuthMock.mockReturnValue({
      session: null,
      user: null,
      loading: false,
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
    expect(forgotPasswordLink).toHaveAttribute('href', '/forgot-password');
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
          <Login />
        </MemoryRouter>
      </ChakraProvider>
    );

    await waitFor(() => expect(navigateMock).toHaveBeenCalledWith('/dashboard'));
  });
});
