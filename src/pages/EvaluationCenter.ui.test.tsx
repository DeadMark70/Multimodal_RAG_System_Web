import { render, screen } from '@testing-library/react';
import { ChakraProvider } from '@chakra-ui/react';
import { describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import theme from '../theme';
import EvaluationCenter from './EvaluationCenter';

vi.mock('../components/layout/Layout', () => ({
  default: ({ children }: { children: ReactNode }) => <div data-testid="layout">{children}</div>,
}));

vi.mock('../components/evaluation/TestCaseManager', () => ({
  default: () => <div>TestCaseManager</div>,
}));

vi.mock('../components/evaluation/ModelConfigPanel', () => ({
  default: () => <div>ModelConfigPanel</div>,
}));

describe('EvaluationCenter UI', () => {
  it('renders evaluation tabs', () => {
    render(
      <ChakraProvider theme={theme}>
        <EvaluationCenter />
      </ChakraProvider>
    );

    expect(screen.getByTestId('layout')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: '題庫管理' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: '模型設定' })).toBeInTheDocument();
    expect(screen.getByText('TestCaseManager')).toBeInTheDocument();
  });
});

