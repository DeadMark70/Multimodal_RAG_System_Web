import type { ProcessingStatus } from '../../types/rag';

export type BatchUploadStatus =
  | 'queued'
  | 'uploading'
  | 'ocr_completed'
  | 'indexing'
  | 'image_analysis'
  | 'graph_indexing'
  | 'indexed'
  | 'failed'
  | 'index_failed';

export interface BatchUploadItem {
  id: string;
  fileName: string;
  docId: string | null;
  status: BatchUploadStatus;
  errorMessage: string | null;
  updatedAt: number;
}

export interface UploadStatusMeta {
  label: string;
  colorScheme: string;
  progress: number;
  location: string;
  description: string;
}

export const ACTIVE_BATCH_UPLOAD_STATUSES = new Set<BatchUploadStatus>([
  'queued',
  'uploading',
  'ocr_completed',
  'indexing',
  'image_analysis',
  'graph_indexing',
]);

const STATUS_META: Record<BatchUploadStatus, UploadStatusMeta> = {
  queued: {
    label: '等待上傳',
    colorScheme: 'gray',
    progress: 4,
    location: '佇列',
    description: '檔案已加入批次，等待送往伺服器。',
  },
  uploading: {
    label: '上傳 / OCR 進行中',
    colorScheme: 'blue',
    progress: 18,
    location: '上傳 / OCR',
    description: '正在傳送 PDF，並由伺服器執行 OCR 擷取。',
  },
  ocr_completed: {
    label: 'OCR 已完成',
    colorScheme: 'cyan',
    progress: 36,
    location: 'OCR',
    description: '文字已擷取完成，準備進入背景知識庫流程。',
  },
  indexing: {
    label: 'RAG 索引中',
    colorScheme: 'purple',
    progress: 58,
    location: 'RAG',
    description: '正在把文件文字寫入檢索索引。',
  },
  image_analysis: {
    label: '多模態圖片分析中',
    colorScheme: 'pink',
    progress: 78,
    location: 'Vision',
    description: '正在摘要圖片內容並補齊多模態索引。',
  },
  graph_indexing: {
    label: 'GraphRAG 建圖中',
    colorScheme: 'teal',
    progress: 90,
    location: 'GraphRAG',
    description: '正在抽取實體與關係，建立知識圖譜。',
  },
  indexed: {
    label: '全部完成',
    colorScheme: 'green',
    progress: 100,
    location: '完成',
    description: 'OCR、RAG、圖片分析與 GraphRAG 都已完成。',
  },
  failed: {
    label: '上傳失敗',
    colorScheme: 'red',
    progress: 100,
    location: '上傳 / OCR',
    description: '檔案傳輸或 OCR 階段失敗。',
  },
  index_failed: {
    label: '背景處理失敗',
    colorScheme: 'orange',
    progress: 100,
    location: '背景處理',
    description: 'OCR 之後的 RAG、圖片分析或 GraphRAG 流程失敗。',
  },
};

export function mapProcessingStepToBatchStatus(step: ProcessingStatus): BatchUploadStatus {
  switch (step) {
    case 'indexed':
      return 'indexed';
    case 'index_failed':
      return 'index_failed';
    case 'failed':
      return 'failed';
    case 'indexing':
      return 'indexing';
    case 'image_analysis':
      return 'image_analysis';
    case 'graph_indexing':
      return 'graph_indexing';
    case 'ocr_completed':
    case 'completed':
      return 'ocr_completed';
    default:
      return 'uploading';
  }
}

export function getUploadStatusMeta(status: BatchUploadStatus): UploadStatusMeta {
  return STATUS_META[status];
}
