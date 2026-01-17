import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import Layout from './Layout';
import { ChakraProvider } from '@chakra-ui/react';
import theme from '../../theme';
import { MemoryRouter } from 'react-router-dom';
import React from 'react';

// Mock Sidebar to isolate
vi.mock('./Sidebar', () => ({ default: () => <div data-testid="sidebar">Sidebar</div> }));

// Mock useAuth
vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    session: { user: { id: '1' } },
    loading: false,
  }),
}));

describe('Layout', () => {
  it('renders children and sidebar when authenticated', () => {
    render(
      <ChakraProvider theme={theme}>
        <MemoryRouter>
          <Layout>
            <div>Child Content</div>
          </Layout>
        </MemoryRouter>
      </ChakraProvider>
    );

    expect(screen.getByTestId('sidebar')).toBeInTheDocument();
    expect(screen.getByText('Child Content')).toBeInTheDocument();
  });
});