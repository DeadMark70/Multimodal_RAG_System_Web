/**
 * useDocuments Hook
 * 
 * 使用 React Query 管理文件 CRUD 操作
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  deleteDocument,
  getDocumentStatus,
  listDocuments,
  translateDocument,
  uploadPdf,
} from '../services/pdfApi';
import { useToast } from '@chakra-ui/react';

// 文件清單 Query
export function useDocumentList() {
  return useQuery({
    queryKey: ['documents'],
    queryFn: async () => {
      const response = await listDocuments();
      return response.documents;
    },
    staleTime: 30000,
  });
}

// 上傳文件 Mutation
export function useUploadDocument() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: async (file: File) => {
      return await uploadPdf(file);
    },
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: ['documents'] });
      toast({
        title: '上傳成功',
        description: result.pdf_available
          ? '文件已可下載，背景索引進行中。'
          : '文件正在背景處理中，請稍候。',
        status: 'success',
        duration: 3000,
      });
    },
    onError: (error: Error) => {
      toast({
        title: '上傳失敗',
        description: error.message || '發生未知錯誤',
        status: 'error',
        duration: 5000,
      });
    },
  });
}

// 刪除文件 Mutation
export function useDeleteDocument() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: async (docId: string) => {
      return await deleteDocument(docId);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['documents'] });
      toast({
        title: '刪除成功',
        status: 'success',
        duration: 2000,
      });
    },
    onError: (error: Error) => {
      toast({
        title: '刪除失敗',
        description: error.message,
        status: 'error',
        duration: 3000,
      });
    },
  });
}

// 手動翻譯文件 Mutation
export function useTranslateDocument() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: async (docId: string) => {
      return await translateDocument(docId);
    },
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: ['documents'] });
      toast({
        title: result.pdf_available ? '翻譯完成' : '翻譯完成但 PDF 生成失敗',
        description: result.pdf_available
          ? '已產生翻譯 PDF，可從文件列表開啟。'
          : (result.pdf_error || result.message),
        status: result.pdf_available ? 'success' : 'warning',
        duration: 4000,
      });
    },
    onError: (error: Error) => {
      toast({
        title: '翻譯失敗',
        description: error.message,
        status: 'error',
        duration: 4000,
      });
    },
  });
}

// 查詢文件狀態
export function useDocumentStatus(docId: string | null, enabled: boolean = true) {
  return useQuery({
    queryKey: ['documentStatus', docId],
    queryFn: async () => {
      if (!docId) return null;
      return await getDocumentStatus(docId);
    },
    enabled: enabled && !!docId,
    refetchInterval: 3000, // 每 3 秒檢查一次狀態
  });
}

export default {
  useDocumentList,
  useUploadDocument,
  useDeleteDocument,
  useTranslateDocument,
  useDocumentStatus,
};
