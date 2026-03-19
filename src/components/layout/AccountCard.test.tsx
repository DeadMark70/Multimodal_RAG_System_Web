import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ChakraProvider } from '@chakra-ui/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import type * as ChakraUI from '@chakra-ui/react';
import type * as ReactRouterDom from 'react-router-dom';
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
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const actual = (await vi.importActual('react-router-dom')) as unknown as ReactRouterDom;
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

vi.mock('@chakra-ui/react', async () => {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const actual = (await vi.importActual('@chakra-ui/react')) as unknown as ChakraUI;
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  return {
    ...actual,
    useToast: () => toastMock,
  };
});

describe('AccountCard', () => {
  beforeEach(() => {
    navigateMock.mockReset();
    toastMock.mockReset();
    signOutMock.mockReset();
    useAuthMock.mockReturnValue({
      session: null,
      user: {
        email: 'tester@example.com',
        user_metadata: { full_name: 'Test User' },
      },
      loading: false,
      signOut: signOutMock,
    });
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
