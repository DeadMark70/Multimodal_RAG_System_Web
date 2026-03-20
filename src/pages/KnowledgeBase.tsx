
import Layout from '../components/layout/Layout';
import PageHeader from '../components/common/PageHeader';
import { 
  CardBody, 
  VStack, 
  Spinner, 
  Flex, 
  Text, 
  Box,
  useDisclosure,
  AlertDialog,
  AlertDialogBody,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogOverlay,
  Button,
  useToast,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
} from '@chakra-ui/react';
import { useEffect, useRef, useState } from 'react';
import UploadZone from '../components/rag/UploadZone';
import DocumentTable from '../components/rag/DocumentTable';
import {
  useDeleteDocument,
  useDocumentList,
  useDocumentStatus,
  useTranslateDocument,
  useUploadDocument,
} from '../hooks/useDocuments';
import SurfaceCard from '../components/common/SurfaceCard';
import { downloadPdf } from '../services/pdfApi';

export default function KnowledgeBase() {
  const { data: documents, isLoading, error, refetch } = useDocumentList();
  const uploadMutation = useUploadDocument();
  const deleteMutation = useDeleteDocument();
  const translateMutation = useTranslateDocument();
  const toast = useToast();

  // 刪除確認對話框
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [activeUploadDocId, setActiveUploadDocId] = useState<string | null>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const { data: processingStatus } = useDocumentStatus(activeUploadDocId, !!activeUploadDocId);

  const handleUpload = async (file: File) => {
    try {
      const result = await uploadMutation.mutateAsync(file);
      setActiveUploadDocId(result.doc_id);
      await refetch();
    } catch {
      // 錯誤已在 hook 中處理
    }
  };

  useEffect(() => {
    if (!processingStatus) return;
    if (processingStatus.is_fully_complete || processingStatus.step === 'failed') {
      setTimeout(() => {
        setActiveUploadDocId(null);
      }, 0);
      void refetch();
    }
  }, [processingStatus, refetch]);

  const handleDeleteClick = (id: string) => {
    setDeleteId(id);
    onOpen();
  };

  const handleDeleteConfirm = async () => {
    if (deleteId) {
      await deleteMutation.mutateAsync(deleteId);
      onClose();
      setDeleteId(null);
    }
  };

  const openPdfInNewTab = async (docId: string, type: 'original' | 'translated') => {
    try {
      const blob = await downloadPdf(docId, type);
      const blobUrl = URL.createObjectURL(blob);
      const opened = window.open(blobUrl, '_blank', 'noopener,noreferrer');

      if (!opened) {
        URL.revokeObjectURL(blobUrl);
        throw new Error('Browser blocked the new tab');
      }

      setTimeout(() => {
        URL.revokeObjectURL(blobUrl);
      }, 60_000);
    } catch (error) {
      const message = error instanceof Error ? error.message : '無法開啟 PDF';
      toast({
        title: '開啟 PDF 失敗',
        description: message,
        status: 'error',
        duration: 4000,
      });
    }
  };

  const handleTranslate = async (id: string) => {
    await translateMutation.mutateAsync(id);
    await refetch();
  };

  return (
    <Layout>
      <PageHeader title="知識庫" subtitle="管理您的研究文件" />
      
      <VStack spacing={6} align="stretch">
        <SurfaceCard>
          <CardBody>
            <UploadZone onUpload={handleUpload} />
            {activeUploadDocId && processingStatus && (
              <Alert
                status={processingStatus.step === 'failed' ? 'error' : 'info'}
                mt={4}
                borderRadius="md"
                variant="left-accent"
              >
                <AlertIcon />
                <Box>
                  <AlertTitle fontSize="sm">文件處理中</AlertTitle>
                  <AlertDescription fontSize="sm">
                    {processingStatus.step_label}
                  </AlertDescription>
                </Box>
              </Alert>
            )}
          </CardBody>
        </SurfaceCard>

        <SurfaceCard>
          <CardBody>
            {isLoading ? (
              <Flex justify="center" align="center" py={8}>
                <Spinner size="lg" color="brand.500" />
                <Text ml={3} color="gray.500">載入中...</Text>
              </Flex>
            ) : error ? (
              <Box textAlign="center" py={8}>
                <Text color="red.500">載入失敗：{error.message}</Text>
                <Button mt={4} size="sm" onClick={() => void refetch()}>
                  重試
                </Button>
              </Box>
            ) : (
              <DocumentTable 
                documents={documents || []}
                onDelete={handleDeleteClick}
                onOpenOriginal={(id) => void openPdfInNewTab(id, 'original')}
                onOpenTranslated={(id) => void openPdfInNewTab(id, 'translated')}
                onTranslate={(id) => void handleTranslate(id)}
              />
            )}
          </CardBody>
        </SurfaceCard>
      </VStack>

      {/* 刪除確認對話框 */}
      <AlertDialog
        isOpen={isOpen}
        leastDestructiveRef={cancelRef}
        onClose={onClose}
      >
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              確認刪除
            </AlertDialogHeader>

            <AlertDialogBody>
              確定要刪除這個文件嗎？此操作無法復原。
            </AlertDialogBody>

            <AlertDialogFooter>
              <Button ref={cancelRef} onClick={onClose}>
                取消
              </Button>
              <Button 
                colorScheme="red" 
                onClick={() => void handleDeleteConfirm()} 
                ml={3}
                isLoading={deleteMutation.isPending}
              >
                刪除
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </Layout>
  );
}
