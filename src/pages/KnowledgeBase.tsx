
import Layout from '../components/layout/Layout';
import PageHeader from '../components/common/PageHeader';
import { 
  Card, 
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
} from '@chakra-ui/react';
import { useRef, useState } from 'react';
import UploadZone from '../components/rag/UploadZone';
import DocumentTable from '../components/rag/DocumentTable';
import { useDocumentList, useUploadDocument, useDeleteDocument } from '../hooks/useDocuments';

export default function KnowledgeBase() {
  const { data: documents, isLoading, error, refetch } = useDocumentList();
  const uploadMutation = useUploadDocument();
  const deleteMutation = useDeleteDocument();
  const toast = useToast();

  // 刪除確認對話框
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);

  const handleUpload = async (file: File) => {
    try {
      await uploadMutation.mutateAsync(file);
      refetch();
    } catch {
      // 錯誤已在 hook 中處理
    }
  };

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

  const handleView = () => {
    // TODO: 開啟文件預覽
    toast({
      title: '功能開發中',
      description: '文件預覽功能即將推出',
      status: 'info',
      duration: 2000,
    });
  };

  return (
    <Layout>
      <PageHeader title="知識庫" subtitle="管理您的研究文件" />
      
      <VStack spacing={6} align="stretch">
        <Card>
          <CardBody>
            <UploadZone onUpload={handleUpload} />
          </CardBody>
        </Card>

        <Card>
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
                onView={handleView}
              />
            )}
          </CardBody>
        </Card>
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
