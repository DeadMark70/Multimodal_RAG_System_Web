import { fireEvent, render, screen } from '@testing-library/react';
import { ChakraProvider } from '@chakra-ui/react';
import { describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import Sidebar from './Sidebar';
import theme from '../../theme';

vi.mock('../settings', () => ({
  SettingsPanel: () => <div>Settings</div>,
}));

describe('Sidebar UI behavior', () => {
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
});
