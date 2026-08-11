import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { AppErrorBoundary } from './AppErrorBoundary';

const Crash = () => {
  throw new Error('render secret stack');
};

describe('AppErrorBoundary', () => {
  it('renders safe recovery actions without the exception text', () => {
    const reload = vi.fn();
    const goHome = vi.fn();
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const preventExpectedRenderError = (event: ErrorEvent) => event.preventDefault();
    window.addEventListener('error', preventExpectedRenderError);

    try {
      render(
        <AppErrorBoundary onReload={reload} onGoHome={goHome}>
          <Crash />
        </AppErrorBoundary>,
      );

      expect(screen.getByRole('heading', { name: '應用程式發生錯誤' })).toBeInTheDocument();
      expect(screen.queryByText(/render secret stack/)).not.toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: '重新載入' }));
      fireEvent.click(screen.getByRole('button', { name: '回首頁' }));
      expect(reload).toHaveBeenCalledOnce();
      expect(goHome).toHaveBeenCalledOnce();
    } finally {
      window.removeEventListener('error', preventExpectedRenderError);
      consoleError.mockRestore();
    }
  });

  it('renders healthy children unchanged', () => {
    render(
      <AppErrorBoundary>
        <p>Healthy application content</p>
      </AppErrorBoundary>,
    );

    expect(screen.getByText('Healthy application content')).toBeInTheDocument();
  });
});
