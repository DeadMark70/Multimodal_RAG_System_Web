import { ChakraProvider } from '@chakra-ui/react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import ForgotPassword from './ForgotPassword';
import theme from '../theme';

const { resetPasswordForEmailMock } = vi.hoisted(() => ({
  resetPasswordForEmailMock: vi.fn(),
}));

vi.mock('../services/supabase', () => ({
  supabase: {
    auth: {
      resetPasswordForEmail: resetPasswordForEmailMock,
    },
  },
}));

describe('ForgotPassword', () => {
  beforeEach(() => {
    resetPasswordForEmailMock.mockReset();
    resetPasswordForEmailMock.mockResolvedValue({ data: {}, error: null });
  });

  it('submits reset email request with redirect target', async () => {
    render(
      <ChakraProvider theme={theme}>
        <MemoryRouter>
          <ForgotPassword />
        </MemoryRouter>
      </ChakraProvider>
    );

    fireEvent.change(screen.getByLabelText(/Email/), { target: { value: 'user@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: '發送重設郵件' }));

    await waitFor(() => expect(resetPasswordForEmailMock).toHaveBeenCalledTimes(1));
    expect(resetPasswordForEmailMock).toHaveBeenCalledWith(
      'user@example.com',
      expect.objectContaining({
        redirectTo: `${window.location.origin}/reset-password`,
      })
    );
    expect(screen.getAllByText('如果信箱存在，我們已寄出重設密碼郵件，請至信箱確認。').length).toBeGreaterThan(0);
  });

  it('shows error state when reset email request fails', async () => {
    resetPasswordForEmailMock.mockRejectedValueOnce(new Error('request failed'));

    render(
      <ChakraProvider theme={theme}>
        <MemoryRouter>
          <ForgotPassword />
        </MemoryRouter>
      </ChakraProvider>
    );

    fireEvent.change(screen.getByLabelText(/Email/), { target: { value: 'user@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: '發送重設郵件' }));

    await waitFor(() =>
      expect(screen.getByText('寄送失敗，請稍後再試。')).toBeInTheDocument()
    );
  });
});
