import { render, screen } from '@testing-library/react';
import { beforeEach, describe, it, expect, vi } from 'vitest';
import Layout from './Layout';
import { ChakraProvider } from '@chakra-ui/react';
import theme from '../../theme';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import type { AuthContextType } from '../../contexts/auth-context';

// Mock Sidebar to isolate
vi.mock('./Sidebar', () => ({ default: () => <div data-testid="sidebar">Sidebar</div> }));

const useAuthMock = vi.fn<() => AuthContextType>();

function createAuthValue(overrides: Partial<AuthContextType> = {}): AuthContextType {
  const user = {
    id: '1',
    app_metadata: {},
    user_metadata: {},
    aud: 'authenticated',
    created_at: '2026-03-01T00:00:00.000Z',
  } as AuthContextType['user'];

  return {
    session: { user } as AuthContextType['session'],
    user,
    loading: false,
    signOut: vi.fn(),
    ...overrides,
  };
}

// Mock useAuth
vi.mock('../../contexts/useAuth', () => ({
  useAuth: () => useAuthMock(),
}));

describe('Layout', () => {
  beforeEach(() => {
    useAuthMock.mockReturnValue(createAuthValue());
  });

  it('renders children and sidebar when authenticated', () => {
    render(
      <ChakraProvider theme={theme}>
        <MemoryRouter initialEntries={['/dashboard']}>
          <Routes>
            <Route
              path="/dashboard"
              element={(
                <Layout>
                  <div>Child Content</div>
                </Layout>
              )}
            />
            <Route path="/login" element={<div>Login Page</div>} />
          </Routes>
        </MemoryRouter>
      </ChakraProvider>
    );

    expect(screen.getByTestId('sidebar')).toBeInTheDocument();
    expect(screen.getByText('Child Content')).toBeInTheDocument();
  });

  it('redirects unauthenticated users to login', () => {
    useAuthMock.mockReturnValue({
      ...createAuthValue(),
      session: null,
      user: null,
    });

    render(
      <ChakraProvider theme={theme}>
        <MemoryRouter initialEntries={['/dashboard']}>
          <Routes>
            <Route
              path="/dashboard"
              element={(
                <Layout>
                  <div>Protected Content</div>
                </Layout>
              )}
            />
            <Route path="/login" element={<div>Login Page</div>} />
          </Routes>
        </MemoryRouter>
      </ChakraProvider>
    );

    expect(screen.getByText('Login Page')).toBeInTheDocument();
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });
});
