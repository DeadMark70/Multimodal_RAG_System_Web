import {
  Alert,
  AlertIcon,
  Badge,
  Box,
  Button,
  Divider,
  Flex,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  Spinner,
  Stack,
  Text,
} from '@chakra-ui/react';
import { Component, useEffect, useState, type ReactNode } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';

import { downloadPdf } from '../../services/pdfApi';
import type { SourceEvidence } from '../../types/evidence';

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

export interface SourceViewerOverlayProps {
  evidence: SourceEvidence;
  onClose: () => void;
}

interface PdfErrorBoundaryProps {
  children: ReactNode;
  fallback: ReactNode;
}

interface PdfErrorBoundaryState {
  hasError: boolean;
}

class PdfErrorBoundary extends Component<PdfErrorBoundaryProps, PdfErrorBoundaryState> {
  state: PdfErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): PdfErrorBoundaryState {
    return { hasError: true };
  }

  render() {
    return this.state.hasError ? this.props.fallback : this.props.children;
  }
}

function provenanceLabel(status: SourceEvidence['provenanceStatus']) {
  if (status === 'full') return '已驗證';
  if (status === 'partial') return '部分驗證';
  return '僅文件關聯';
}

function provenanceColor(status: SourceEvidence['provenanceStatus']) {
  if (status === 'full') return 'green';
  if (status === 'partial') return 'yellow';
  return 'gray';
}

export default function SourceViewerOverlay({ evidence, onClose }: SourceViewerOverlayProps) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [renderFailed, setRenderFailed] = useState(false);
  const [numPages, setNumPages] = useState<number | null>(null);
  const citedPage = evidence.page ?? 1;
  const [pageNumber, setPageNumber] = useState(citedPage);

  useEffect(() => {
    setPageNumber(citedPage);
  }, [citedPage]);

  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | null = null;

    setBlobUrl(null);
    setDownloadError(null);
    setRenderFailed(false);
    setNumPages(null);

    void downloadPdf(evidence.docId, 'original')
      .then((blob) => {
        if (cancelled) return;

        objectUrl = URL.createObjectURL(blob);
        setBlobUrl(objectUrl);
      })
      .catch((error: unknown) => {
        if (cancelled) return;

        const status = typeof error === 'object' && error !== null && 'response' in error
          ? (error as { response?: { status?: number } }).response?.status
          : undefined;
        setDownloadError(status === 401 ? '登入狀態已失效，請重新登入。' : '無法載入 PDF。');
      });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [evidence.docId]);

  const openInBrowser = () => {
    if (blobUrl) {
      window.open(`${blobUrl}#page=${pageNumber}`, '_blank', 'noopener,noreferrer');
    }
  };

  const failurePanel = (
    <Stack spacing={3} align="start">
      <Alert status="error"><AlertIcon />PDF 預覽載入失敗</Alert>
      <Button onClick={openInBrowser} isDisabled={!blobUrl}>使用瀏覽器開啟</Button>
    </Stack>
  );

  return (
    <Modal isOpen onClose={onClose} size="full">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>{evidence.filename ?? '來源文件'}</ModalHeader>
        <ModalCloseButton />
        <ModalBody pb={6}>
          <Flex direction={{ base: 'column', lg: 'row' }} gap={6} h="full">
            <Box flex="1" minW={0} overflow="auto" bg="gray.50" p={4}>
              {downloadError ? (
                <Alert status="error"><AlertIcon />{downloadError}</Alert>
              ) : !blobUrl ? (
                <Flex minH="240px" align="center" justify="center"><Spinner /></Flex>
              ) : renderFailed ? failurePanel : (
                <PdfErrorBoundary fallback={failurePanel}>
                  <Document file={blobUrl} onLoadSuccess={(pdf) => setNumPages(pdf.numPages)} onLoadError={() => setRenderFailed(true)}>
                    <Stack spacing={3} align="start">
                      <Box position="relative" display="inline-block">
                        <Page pageNumber={pageNumber} />
                        {evidence.bbox && (
                          <Box
                            data-testid="source-bbox-highlight"
                            position="absolute"
                            pointerEvents="none"
                            border="3px solid"
                            borderColor="yellow.400"
                            bg="yellow.200"
                            opacity={0.35}
                            left={`${evidence.bbox[0] * 100}%`}
                            top={`${evidence.bbox[1] * 100}%`}
                            width={`${(evidence.bbox[2] - evidence.bbox[0]) * 100}%`}
                            height={`${(evidence.bbox[3] - evidence.bbox[1]) * 100}%`}
                          />
                        )}
                      </Box>
                      <Flex align="center" gap={3}>
                        <Button size="sm" onClick={() => setPageNumber((page) => Math.max(1, page - 1))} isDisabled={pageNumber === 1}>
                          上一頁
                        </Button>
                        <Text fontSize="sm">第 {pageNumber} 頁{numPages ? `／共 ${numPages} 頁` : ''}</Text>
                        <Button size="sm" onClick={() => setPageNumber((page) => page + 1)} isDisabled={numPages !== null && pageNumber >= numPages}>
                          下一頁
                        </Button>
                      </Flex>
                    </Stack>
                  </Document>
                </PdfErrorBoundary>
              )}
            </Box>

            <Box w={{ base: 'full', lg: '320px' }} flexShrink={0}>
              <Stack spacing={4}>
                <Box>
                  <Text fontSize="sm" color="gray.500">文件</Text>
                  <Text fontWeight="semibold">{evidence.filename ?? '未命名文件'}</Text>
                </Box>
                <Box>
                  <Text fontSize="sm" color="gray.500">頁碼</Text>
                  <Text>第 {pageNumber} 頁{numPages ? `／共 ${numPages} 頁` : ''}</Text>
                </Box>
                <Box>
                  <Text fontSize="sm" color="gray.500" mb={1}>溯源狀態</Text>
                  <Badge colorScheme={provenanceColor(evidence.provenanceStatus)}>{provenanceLabel(evidence.provenanceStatus)}</Badge>
                </Box>
                <Divider />
                <Box>
                  <Text fontSize="sm" color="gray.500" mb={1}>原文</Text>
                  <Text whiteSpace="pre-wrap">{evidence.quote ?? '沒有可用的原文片段。'}</Text>
                </Box>
              </Stack>
            </Box>
          </Flex>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}
