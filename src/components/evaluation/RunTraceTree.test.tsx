import { ChakraProvider } from '@chakra-ui/react';
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import theme from '../../theme';
import RunTraceTree from './RunTraceTree';

function renderWithTheme(node: React.ReactNode) {
  return render(<ChakraProvider theme={theme}>{node}</ChakraProvider>);
}

describe('RunTraceTree', () => {
  it('renders a normalized zero-duration trace event as 0 ms', () => {
    renderWithTheme(
      <RunTraceTree events={[{
        eventId: 'evt-zero-duration',
        sequence: 1,
        stageName: 'Instant normalized event',
        status: 'success',
        startedAt: '2026-08-13T00:00:00Z',
        durationMs: 0,
      }]} />,
    );

    const zeroDurationRow = screen.getByText('Instant normalized event').closest('tr');
    expect(zeroDurationRow).not.toBeNull();
    expect(within(zeroDurationRow as HTMLElement).getByText('0 ms')).toBeInTheDocument();
  });
});
