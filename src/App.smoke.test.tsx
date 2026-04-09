import { render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';

vi.mock('./contexts/AuthContext', () => ({
  AuthProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

vi.mock('./pages/Dashboard', () => ({ default: () => <div>Dashboard Page</div> }));
vi.mock('./pages/Login', () => ({ default: () => <div>Login Page</div> }));
vi.mock('./pages/Signup', () => ({ default: () => <div>Signup Page</div> }));
vi.mock('./pages/ForgotPassword', () => ({ default: () => <div>Forgot Password Page</div> }));
vi.mock('./pages/ResetPassword', () => ({ default: () => <div>Reset Password Page</div> }));
vi.mock('./pages/KnowledgeBase', () => ({ default: () => <div>Knowledge Base Page</div> }));
vi.mock('./pages/Chat', () => ({ default: () => <div>Chat Page</div> }));
vi.mock('./pages/Experiment', () => ({ default: () => <div>Experiment Page</div> }));
vi.mock('./pages/GraphDemo', () => ({ default: () => <div>Graph Demo Page</div> }));
vi.mock('./pages/EvaluationCenter', () => ({ default: () => <div>Evaluation Center Page</div> }));

describe('App Smoke Test', () => {
  beforeEach(() => {
    window.history.pushState({}, '', '/');
  });

  it('renders without crashing', async () => {
    render(<App />);
    await waitFor(() => {
      expect(
        screen.queryByTestId('app-route-fallback') ?? screen.queryByText('Dashboard Page')
      ).toBeTruthy();
    });
    expect(await screen.findByText('Dashboard Page')).toBeInTheDocument();
  });

  it('renders forgot password route', async () => {
    window.history.pushState({}, '', '/forgot-password');
    render(<App />);

    expect(await screen.findByText('Forgot Password Page')).toBeInTheDocument();
  });

  it('renders signup route', async () => {
    window.history.pushState({}, '', '/signup');
    render(<App />);

    expect(await screen.findByText('Signup Page')).toBeInTheDocument();
  });

  it('renders reset password route', async () => {
    window.history.pushState({}, '', '/reset-password');
    render(<App />);

    expect(await screen.findByText('Reset Password Page')).toBeInTheDocument();
  });
});
