/**
 * useDocuments Hook
 *
 * 使用 React Query 管理文件 CRUD 操作與批次上傳流程
 */

import { useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@chakra-ui/react';

import {
  mapProcessingStepToBatchStatus,
  type BatchUploadItem,
  type BatchUploadStatus,
} from '../features/uploads/uploadProgress';
import {
  deleteDocument,
  getDocumentStatus,
  listDocuments,
  translateDocument,
  uploadPdf,
} from '../services/pdfApi';
import {
  useBatchUploads,
  useIsBatchUploading,
  useUploadProgressStore,
} from '../stores/useUploadProgressStore';
import type { QueryClient } from '@tanstack/react-query';

const BATCH_UPLOAD_CONCURRENCY = 2;
const POLL_INTERVAL_MS = 3000;
const activePollers = new Map<string, Promise<void>>();
const TRANSIENT_STATUS_AUTH_ERRORS = [
  'Missing Authorization header',
  'Authentication failed',
  '認證失敗',
];

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function createBatchItems(files: File[]): BatchUploadItem[] {
  const now = Date.now();
  return files.map((file, index) => ({
    id: `${file.name}-${index}-${now}`,
    fileName: file.name,
    docId: null,
    status: 'queued',
    errorMessage: null,
    updatedAt: now,
  }));
}

function patchTrackedUpload(id: string, patch: Partial<BatchUploadItem>) {
  useUploadProgressStore.getState().actions.updateUpload(id, {
    ...patch,
    updatedAt: Date.now(),
  });
}

function isTransientStatusAuthError(error: unknown): boolean {
  return (
    error instanceof Error &&
    TRANSIENT_STATUS_AUTH_ERRORS.some((message) => error.message.includes(message))
  );
}

async function pollUntilSettled(
  uploadId: string,
  docId: string,
  queryClient: QueryClient
): Promise<void> {
  const existingPoller = activePollers.get(uploadId);
  if (existingPoller) {
    await existingPoller;
    return;
  }

  const poller = (async () => {
    while (true) {
      let status;

      try {
        status = await getDocumentStatus(docId);
      } catch (error) {
        if (isTransientStatusAuthError(error)) {
          await sleep(750);
          continue;
        }
        throw error;
      }

      const nextStatus = mapProcessingStepToBatchStatus(status.step);

      patchTrackedUpload(uploadId, {
        status: nextStatus,
        errorMessage: status.error_message,
      });

      if (
        nextStatus === 'indexed' ||
        nextStatus === 'failed' ||
        nextStatus === 'index_failed'
      ) {
        break;
      }

      await sleep(POLL_INTERVAL_MS);
    }
  })()
    .finally(async () => {
      activePollers.delete(uploadId);
      await queryClient.invalidateQueries({ queryKey: ['documents'] });
    });

  activePollers.set(uploadId, poller);
  await poller;
}

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

export function useBatchUploadDocuments() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const uploads = useBatchUploads();
  const isUploading = useIsBatchUploading();

  const uploadFiles = useCallback(async (files: File[]) => {
    if (files.length === 0) {
      return;
    }

    const batch = createBatchItems(files);
    useUploadProgressStore.getState().actions.setUploads(batch);

    let cursor = 0;

    const worker = async () => {
      while (cursor < files.length) {
        const currentIndex = cursor;
        cursor += 1;

        const upload = batch[currentIndex];
        const file = files[currentIndex];

        patchTrackedUpload(upload.id, {
          status: 'uploading',
          errorMessage: null,
        });

        try {
          const result = await uploadPdf(file);
          const initialStatus = result.status === 'failed' ? 'failed' : 'ocr_completed';

          patchTrackedUpload(upload.id, {
            docId: result.doc_id,
            status: initialStatus,
            errorMessage: result.pdf_error ?? (result.status === 'failed' ? result.message : null),
          });

          if (initialStatus === 'failed') {
            continue;
          }

          await pollUntilSettled(upload.id, result.doc_id, queryClient);
        } catch (error) {
          patchTrackedUpload(upload.id, {
            status: 'failed',
            errorMessage: error instanceof Error ? error.message : '上傳失敗',
          });
        }
      }
    };

    await Promise.all(
      Array.from({ length: Math.min(BATCH_UPLOAD_CONCURRENCY, files.length) }, () => worker())
    );

    await queryClient.invalidateQueries({ queryKey: ['documents'] });

    const completed = useUploadProgressStore.getState().uploads;
    const successCount = completed.filter((upload) => upload.status === 'indexed').length;
    const indexFailedCount = completed.filter((upload) => upload.status === 'index_failed').length;
    const failedCount = completed.filter((upload) => upload.status === 'failed').length;

    const summaryParts = [
      successCount > 0 ? `${successCount} 份完成索引` : null,
      indexFailedCount > 0 ? `${indexFailedCount} 份背景處理失敗` : null,
      failedCount > 0 ? `${failedCount} 份上傳失敗` : null,
    ].filter(Boolean);

    toast({
      title:
        failedCount > 0 || indexFailedCount > 0 ? '批次上傳已完成，部分檔案需要處理' : '批次上傳完成',
      description:
        summaryParts.length > 0 ? summaryParts.join('，') : '所有檔案都已完成處理。',
      status:
        failedCount > 0 || indexFailedCount > 0
          ? successCount > 0
            ? 'warning'
            : 'error'
          : 'success',
      duration: 5000,
    });
  }, [queryClient, toast]);

  return {
    uploads,
    uploadFiles,
    isUploading,
  };
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
    refetchInterval: POLL_INTERVAL_MS,
  });
}

export default {
  useDocumentList,
  useUploadDocument,
  useBatchUploadDocuments,
  useDeleteDocument,
  useTranslateDocument,
  useDocumentStatus,
};

export type { BatchUploadItem, BatchUploadStatus };
