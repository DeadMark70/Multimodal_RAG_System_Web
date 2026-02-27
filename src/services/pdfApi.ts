/**
 * PDF 文件管理 API 服務
 * 
 * 端點：
 * - GET /pdfmd/list - 取得文件列表
 * - POST /pdfmd/upload_pdf_md - 上傳並翻譯 PDF
 * - GET /pdfmd/file/{doc_id}/status - 取得處理狀態
 * - GET /pdfmd/file/{doc_id} - 下載翻譯 PDF
 * - DELETE /pdfmd/file/{doc_id} - 刪除文件
 * - GET /pdfmd/file/{doc_id}/summary - 取得摘要
 */

import api from './api';
import type { DocumentItem, ProcessingStatus, UploadPdfResponse } from '../types/rag';

/**
 * 文件列表回應
 */
export interface DocumentListResponse {
  documents: DocumentItem[];
  total: number;
}

/**
 * 取得文件列表
 */
export async function listDocuments(): Promise<DocumentListResponse> {
  const response = await api.get<DocumentListResponse>('/pdfmd/list');
  return response.data;
}

/**
 * 上傳 PDF 並翻譯
 * @returns 上傳任務狀態（包含 doc_id 與背景處理資訊）
 */
export async function uploadPdf(file: File): Promise<UploadPdfResponse> {
  const formData = new FormData();
  formData.append('file', file);
  
  const response = await api.post<UploadPdfResponse>('/pdfmd/upload_pdf_md', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    timeout: 300000, // 5 分鐘逾時 (大檔案處理)
  });
  
  return response.data;
}

/**
 * 處理狀態回應
 */
export interface StatusResponse {
  step: ProcessingStatus;
  step_label: string;
  is_pdf_ready: boolean;
  is_fully_complete: boolean;
}

/**
 * 取得文件處理狀態
 */
export async function getDocumentStatus(docId: string): Promise<StatusResponse> {
  const response = await api.get<StatusResponse>(`/pdfmd/file/${docId}/status`);
  return response.data;
}

/**
 * 下載翻譯後的 PDF
 */
export async function downloadPdf(docId: string): Promise<Blob> {
  const response = await api.get(`/pdfmd/file/${docId}`, {
    responseType: 'blob',
  });
  return response.data;
}

/**
 * 刪除文件
 */
export async function deleteDocument(docId: string): Promise<{ status: string; message: string }> {
  const response = await api.delete(`/pdfmd/file/${docId}`);
  return response.data;
}

/**
 * 摘要回應
 */
export interface SummaryResponse {
  status: 'ready' | 'generating' | 'not_available';
  summary: string | null;
}

/**
 * 取得文件摘要
 */
export async function getDocumentSummary(docId: string): Promise<SummaryResponse> {
  const response = await api.get<SummaryResponse>(`/pdfmd/file/${docId}/summary`);
  return response.data;
}

/**
 * 重新生成摘要
 */
export async function regenerateSummary(docId: string): Promise<{ status: string; message: string }> {
  const response = await api.post(`/pdfmd/file/${docId}/summary/regenerate`);
  return response.data;
}
