import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ChakraProvider } from '@chakra-ui/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import AccountCard from './AccountCard';
import theme from '../../theme';
import type { AuthContextType } from '../../contexts/auth-context';

const navigateMock = vi.fn();
const toastMock = vi.fn();
const signOutMock = vi.fn();
const useAuthMock = vi.fn<() => AuthContextType>();

vi.mock('../../contexts/useAuth', () => ({
  useAuth: () => useAuthMock(),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<Record<string, unknown>>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

vi.mock('@chakra-ui/react', async () => {
  const actual = await vi.importActual<Record<string, unknown>>('@chakra-ui/react');
  return {
    ...actual,
    useToast: () => toastMock,
  };
});

function createAuthValue(overrides: Partial<AuthContextType> = {}): AuthContextType {
  return {
    session: null,
    user: {
      id: 'user-1',
      app_metadata: {},
      user_metadata: { full_name: 'Test User' },
      aud: 'authenticated',
      created_at: '2026-03-01T00:00:00.000Z',
      email: 'tester@example.com',
    } as AuthContextType['user'],
    loading: false,
    signOut: signOutMock,
    ...overrides,
  };
}

describe('AccountCard', () => {
  beforeEach(() => {
    navigateMock.mockReset();
    toastMock.mockReset();
    signOutMock.mockReset();
    useAuthMock.mockReturnValue(createAuthValue());
  });

  it('renders user identity and email', () => {
    render(
      <ChakraProvider theme={theme}>
        <MemoryRouter>
          <AccountCard onOpenSettings={vi.fn()} />
        </MemoryRouter>
      </ChakraProvider>
    );

    expect(screen.getByText('Test User')).toBeInTheDocument();
    expect(screen.getByText('tester@example.com')).toBeInTheDocument();
  });

  it('uses the auth context logout flow and redirects to login', async () => {
    signOutMock.mockResolvedValue(undefined);

    render(
      <ChakraProvider theme={theme}>
        <MemoryRouter>
          <AccountCard onOpenSettings={vi.fn()} />
        </MemoryRouter>
      </ChakraProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: '登出' }));

    await waitFor(() => expect(signOutMock).toHaveBeenCalledTimes(1));
    expect(toastMock).toHaveBeenCalledWith(
      expect.objectContaining({
        title: '已登出',
        status: 'success',
      })
    );
    expect(navigateMock).toHaveBeenCalledWith('/login', { replace: true });
  });
});
