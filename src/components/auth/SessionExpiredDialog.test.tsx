import { ChakraProvider } from '@chakra-ui/react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AuthContextType } from '../../contexts/auth-context';
import theme from '../../theme';
import SessionExpiredDialog from './SessionExpiredDialog';

const acknowledgeSessionExpiredMock = vi.fn();
const navigateMock = vi.fn();
const useAuthMock = vi.fn<() => AuthContextType>();

vi.mock('../../contexts/useAuth', () => ({
  useAuth: () => useAuthMock(),
}));

vi.mock('react-router-dom', () => ({
  useNavigate: () => navigateMock,
}));

describe('SessionExpiredDialog', () => {
  beforeEach(() => {
    acknowledgeSessionExpiredMock.mockReset();
    navigateMock.mockReset();
    useAuthMock.mockReturnValue({
      session: null,
      user: null,
      loading: false,
      recoveryActive: false,
      sessionExpired: true,
      acknowledgeSessionExpired: acknowledgeSessionExpiredMock,
      signOut: vi.fn(),
    });
  });

  it('blocks with a concise expiration explanation and sends confirmation to login', () => {
    render(
      <ChakraProvider theme={theme}>
        <SessionExpiredDialog />
      </ChakraProvider>
    );

    expect(screen.getByRole('alertdialog', { name: '登入已過期' })).toBeInTheDocument();
    expect(screen.getByText('為了保護你的資料，請重新登入後繼續。')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /取消|關閉/ })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '前往登入' }));

    expect(acknowledgeSessionExpiredMock).toHaveBeenCalledTimes(1);
    expect(navigateMock).toHaveBeenCalledWith('/login?reason=expired', { replace: true });
  });
});
