import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ChakraProvider } from '@chakra-ui/react';
import { describe, expect, it, vi } from 'vitest';

import theme from '../../theme';
import MessageBubble from './MessageBubble';

vi.mock('../common/ImagePreviewModal', () => ({
  default: ({
    isOpen,
    imageAlt,
  }: {
    isOpen: boolean;
    imageAlt: string;
  }) => (isOpen ? <div>Preview: {imageAlt}</div> : null),
}));

describe('MessageBubble', () => {
  it('toggles sources visibility for assistant messages', async () => {
    render(
      <ChakraProvider theme={theme}>
        <MessageBubble
          role="assistant"
          content="Answer body"
          sources={[
            {
              doc_id: 'doc-1',
              filename: 'report.pdf',
              page: 1,
              snippet: 'snippet',
              score: 0.9,
            },
          ]}
        />
      </ChakraProvider>
    );

    expect(screen.getByText(/report\.pdf/i)).not.toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: '切換來源顯示' }));
    await waitFor(() => {
      expect(screen.getByText(/report\.pdf/i)).toBeVisible();
    });
  });

  it('renders markdown images and opens preview with preserved alt text', () => {
    render(
      <ChakraProvider theme={theme}>
        <MessageBubble role="assistant" content="![diagram](/uploads/diagram.png)" />
      </ChakraProvider>
    );

    fireEvent.click(screen.getByAltText('diagram'));
    expect(screen.getByText('Preview: diagram')).toBeInTheDocument();
  });

  it('blocks external markdown images to avoid browser-side tracking requests', () => {
    render(
      <ChakraProvider theme={theme}>
        <MessageBubble role="assistant" content="![tracker](https://evil.example.com/pixel.png)" />
      </ChakraProvider>
    );

    expect(screen.queryByAltText('tracker')).not.toBeInTheDocument();
    expect(screen.getByTestId('markdown-blocked-image')).toHaveTextContent('已封鎖外部圖片來源');
  });

  it('renders untrusted markdown links as blocked text', () => {
    render(
      <ChakraProvider theme={theme}>
        <MessageBubble role="assistant" content="[惡意連結](https://evil.example.com/phish)" />
      </ChakraProvider>
    );

    expect(screen.queryByRole('link', { name: '惡意連結' })).not.toBeInTheDocument();
    expect(screen.getByTestId('markdown-blocked-link')).toHaveTextContent('惡意連結');
  });

  it('renders markdown lists and source tokens for assistant messages', () => {
    render(
      <ChakraProvider theme={theme}>
        <MessageBubble
          role="assistant"
          content={'Answer intro\n* item one\n* item two\n\n[來源: 子問題3]'}
        />
      </ChakraProvider>,
    );

    expect(screen.getByRole('list')).toBeInTheDocument();
    expect(screen.getByText('item one')).toBeInTheDocument();
    expect(screen.getByTestId('markdown-source-token')).toHaveTextContent('[來源: 子問題3]');
  });
});
