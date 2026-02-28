import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import Sidebar from './Sidebar';
import { ChakraProvider } from '@chakra-ui/react';
import theme from '../../theme';
import { MemoryRouter } from 'react-router-dom';

// Mock SettingsPanel
vi.mock('../settings', () => ({
  SettingsPanel: () => <div>Settings</div>
}));

describe('Sidebar', () => {
  it('renders with navigation items', () => {
    render(
      <ChakraProvider theme={theme}>
        <MemoryRouter>
          <Sidebar />
        </MemoryRouter>
      </ChakraProvider>
    );

    expect(screen.getAllByText('3R 儀表板').length).toBeGreaterThan(0);
    expect(screen.getAllByText('儀表板').length).toBeGreaterThan(0);
    expect(screen.getByText('設定')).toBeInTheDocument();
  });
});
