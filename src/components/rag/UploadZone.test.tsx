import { ChakraProvider } from '@chakra-ui/react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import theme from '../../theme';
import UploadZone from './UploadZone';

const toastMock = vi.fn();

vi.mock('@chakra-ui/react', async () => {
  const actual = await vi.importActual<typeof import('@chakra-ui/react')>('@chakra-ui/react');
  return {
    ...actual,
    useToast: () => toastMock,
  };
});

describe('UploadZone', () => {
  it('accepts multiple PDF files from file picker and ignores non-PDF files', async () => {
    const onUpload = vi.fn().mockResolvedValue(undefined);

    const { container } = render(
      <ChakraProvider theme={theme}>
        <UploadZone onUpload={onUpload} />
      </ChakraProvider>
    );

    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    const pdfA = new File(['a'], 'paper-a.pdf', { type: 'application/pdf' });
    const pdfB = new File(['b'], 'paper-b.pdf', { type: 'application/pdf' });
    const txt = new File(['c'], 'notes.txt', { type: 'text/plain' });

    expect(input.multiple).toBe(true);

    fireEvent.change(input, { target: { files: [pdfA, txt, pdfB] } });

    await waitFor(() => {
      expect(onUpload).toHaveBeenCalledWith([pdfA, pdfB]);
    });
    expect(toastMock).toHaveBeenCalledWith(
      expect.objectContaining({
        title: '已忽略非 PDF 檔案',
      })
    );
  });

  it('handles dropping multiple PDFs', async () => {
    const onUpload = vi.fn().mockResolvedValue(undefined);
    const pdfA = new File(['a'], 'drop-a.pdf', { type: 'application/pdf' });
    const pdfB = new File(['b'], 'drop-b.pdf', { type: 'application/pdf' });

    render(
      <ChakraProvider theme={theme}>
        <UploadZone onUpload={onUpload} />
      </ChakraProvider>
    );

    fireEvent.drop(screen.getByText('上傳 PDF 檔案').closest('div') as HTMLElement, {
      dataTransfer: {
        files: [pdfA, pdfB],
      },
    });

    await waitFor(() => {
      expect(onUpload).toHaveBeenCalledWith([pdfA, pdfB]);
    });
  });
});
