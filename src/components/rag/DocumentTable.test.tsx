import { ChakraProvider } from '@chakra-ui/react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import theme from '../../theme';
import DocumentTable from './DocumentTable';

const baseDocument = {
  id: 'doc-1',
  file_name: 'demo.pdf',
  created_at: '2026-03-20T12:00:00Z',
  status: 'ready',
  processing_step: 'ocr_completed',
  has_original_pdf: true,
  has_translated_pdf: false,
  can_translate: true,
};

describe('DocumentTable', () => {
  beforeEach(() => {
    HTMLElement.prototype.scrollTo = vi.fn();
  });

  it('shows translate and original PDF actions for OCR-complete documents', async () => {
    const onDelete = vi.fn();
    const onOpenOriginal = vi.fn();
    const onOpenTranslated = vi.fn();
    const onTranslate = vi.fn();

    render(
      <ChakraProvider theme={theme}>
        <DocumentTable
          documents={[baseDocument]}
          onDelete={onDelete}
          onOpenOriginal={onOpenOriginal}
          onOpenTranslated={onOpenTranslated}
          onTranslate={onTranslate}
        />
      </ChakraProvider>
    );

    expect(screen.getByText('OCR 已完成')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '文件操作 demo.pdf' }));

    fireEvent.click(screen.getByText('開啟原始 PDF'));
    expect(onOpenOriginal).toHaveBeenCalledWith('doc-1');

    fireEvent.click(screen.getByRole('button', { name: '文件操作 demo.pdf' }));
    fireEvent.click(screen.getByText('翻譯'));
    expect(onTranslate).toHaveBeenCalledWith('doc-1');
    expect(onOpenTranslated).not.toHaveBeenCalled();
  });

  it('shows translated action when translated PDF exists', async () => {
    const onOpenTranslated = vi.fn();

    render(
      <ChakraProvider theme={theme}>
        <DocumentTable
          documents={[
            {
              ...baseDocument,
              status: 'completed',
              processing_step: 'indexed',
              has_translated_pdf: true,
              can_translate: false,
            },
          ]}
          onDelete={vi.fn()}
          onOpenOriginal={vi.fn()}
          onOpenTranslated={onOpenTranslated}
          onTranslate={vi.fn()}
        />
      </ChakraProvider>
    );

    expect(screen.getByText('已索引 / 已翻譯')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '文件操作 demo.pdf' }));
    fireEvent.click(screen.getByText('開啟翻譯 PDF'));

    expect(onOpenTranslated).toHaveBeenCalledWith('doc-1');
    expect(screen.queryByRole('menuitem', { name: '翻譯' })).not.toBeInTheDocument();
  });
});
