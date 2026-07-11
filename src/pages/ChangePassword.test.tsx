import { ChakraProvider } from '@chakra-ui/react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import ChangePassword from './ChangePassword';
import theme from '../theme';
import type { AuthContextType } from '../contexts/auth-context';

const navigateMock = vi.fn();
const signOutMock = vi.fn();
const toastMock = vi.fn();
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

vi.mock('@chakra-ui/react', async () => {
  const actual = await vi.importActual<Record<string, unknown>>('@chakra-ui/react');
  return {
    ...actual,
    useToast: () => toastMock,
  };
});

function renderPage() {
  return render(
    <ChakraProvider theme={theme}>
      <MemoryRouter>
        <ChangePassword />
      </MemoryRouter>
    </ChakraProvider>
  );
}

function fillValidForm() {
  fireEvent.change(screen.getByLabelText(/^目前密碼/), { target: { value: 'old-password-123' } });
  fireEvent.change(screen.getByLabelText(/^新密碼/), { target: { value: 'new-password-123' } });
  fireEvent.change(screen.getByLabelText(/^確認新密碼/), { target: { value: 'new-password-123' } });
}

describe('ChangePassword', () => {
  beforeEach(() => {
    navigateMock.mockReset();
    signOutMock.mockReset();
    toastMock.mockReset();
    updateUserMock.mockReset();
    updateUserMock.mockResolvedValue({ data: { user: { id: '1' } }, error: null });
    signOutMock.mockResolvedValue(undefined);
    useAuthMock.mockReturnValue({
      session: { user: { id: '1' } } as AuthContextType['session'],
      user: { id: '1', email: 'user@example.com' } as AuthContextType['user'],
      loading: false,
      recoveryActive: false,
      signOut: signOutMock,
    });
  });

  it('requires the current password', async () => {
    renderPage();

    fireEvent.change(screen.getByLabelText(/^新密碼/), { target: { value: 'new-password-123' } });
    fireEvent.change(screen.getByLabelText(/^確認新密碼/), { target: { value: 'new-password-123' } });
    fireEvent.click(screen.getByRole('button', { name: '更新密碼' }));

    expect(await screen.findByText('請輸入目前密碼。')).toBeInTheDocument();
    expect(updateUserMock).not.toHaveBeenCalled();
  });

  it('submits current and new passwords to Supabase', async () => {
    renderPage();
    fillValidForm();

    fireEvent.click(screen.getByRole('button', { name: '更新密碼' }));

    await waitFor(() => expect(updateUserMock).toHaveBeenCalledWith({
      current_password: 'old-password-123',
      password: 'new-password-123',
    }));
  });

  it('signs out and redirects after success', async () => {
    renderPage();
    fillValidForm();

    fireEvent.click(screen.getByRole('button', { name: '更新密碼' }));

    await waitFor(() => expect(signOutMock).toHaveBeenCalledTimes(1));
    expect(navigateMock).toHaveBeenCalledWith('/login', { replace: true });
  });

  it('maps an incorrect current password safely', async () => {
    updateUserMock.mockResolvedValue({
      data: { user: null },
      error: { code: 'invalid_credentials', message: 'raw provider detail' },
    });
    renderPage();
    fillValidForm();

    fireEvent.click(screen.getByRole('button', { name: '更新密碼' }));

    expect(await screen.findByText('目前密碼不正確。')).toBeInTheDocument();
    expect(screen.queryByText('raw provider detail')).not.toBeInTheDocument();
    expect(signOutMock).not.toHaveBeenCalled();
  });
});
