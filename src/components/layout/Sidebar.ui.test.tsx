import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { ChakraProvider } from '@chakra-ui/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import Sidebar from './Sidebar';
import theme from '../../theme';
import type { AuthContextType } from '../../contexts/auth-context';

const navigateMock = vi.fn();
const toastMock = vi.fn();
const signOutMock = vi.fn();
const useAuthMock = vi.fn<() => AuthContextType>();

vi.mock('../settings', () => ({
  SettingsPanel: () => <div>Settings</div>,
}));

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
  const user = {
    id: 'user-1',
    app_metadata: {},
    user_metadata: { full_name: 'Sidebar User' },
    aud: 'authenticated',
    created_at: '2026-03-01T00:00:00.000Z',
    email: 'sidebar@example.com',
  } as AuthContextType['user'];

  return {
    session: { user } as AuthContextType['session'],
    user,
    loading: false,
    signOut: signOutMock,
    ...overrides,
  };
}

describe('Sidebar UI behavior', () => {
  beforeEach(() => {
    navigateMock.mockReset();
    toastMock.mockReset();
    signOutMock.mockReset();
    useAuthMock.mockReturnValue(createAuthValue());
  });

  it('marks current route as active and opens mobile navigation drawer', () => {
    render(
      <ChakraProvider theme={theme}>
        <MemoryRouter initialEntries={['/dashboard']}>
          <Sidebar />
        </MemoryRouter>
      </ChakraProvider>
    );

    const dashboardLabels = screen.getAllByText('儀表板');
    const activeDashboardLink = dashboardLabels
      .map((node) => node.closest('a'))
      .find((link): link is HTMLAnchorElement => Boolean(link?.getAttribute('aria-current') === 'page'));
    expect(activeDashboardLink).toBeDefined();

    fireEvent.click(screen.getByLabelText('開啟導覽'));
    expect(screen.getByText('導覽')).toBeInTheDocument();
  });

  it('closes the mobile drawer before completing logout', async () => {
    signOutMock.mockResolvedValue(undefined);

    render(
      <ChakraProvider theme={theme}>
        <MemoryRouter initialEntries={['/dashboard']}>
          <Sidebar />
        </MemoryRouter>
      </ChakraProvider>
    );

    fireEvent.click(screen.getByLabelText('開啟導覽'));

    const dialog = screen.getByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: '登出' }));

    await waitFor(() => expect(signOutMock).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.queryByText('導覽')).not.toBeInTheDocument());
    expect(navigateMock).toHaveBeenCalledWith('/login', { replace: true });
  });
});
