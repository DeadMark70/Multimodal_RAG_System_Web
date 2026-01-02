/**
 * RAG API 服務
 * 
 * 端點：
 * - POST /rag/ask - 上下文感知問答
 * - POST /rag/research - 深度研究 (舊版一鍵)
 * - POST /rag/plan - 生成研究計畫 (🆕)
 * - POST /rag/execute - 執行研究計畫 (🆕)
 * - POST /rag/execute/stream - SSE 串流執行 (🆕)
 */

import api from './api';
import type { 
  AskRequest, 
  AskResponse,
  ResearchPlanResponse,
  ExecutePlanRequest,
  ExecutePlanResponse,
  SSEEvent,
} from '../types/rag';

/**
 * 基本問答 (GET)
 */
export async function askQuestionSimple(
  question: string, 
  docIds?: string[]
): Promise<AskResponse> {
  const params = new URLSearchParams({ question });
  if (docIds && docIds.length > 0) {
    params.append('doc_ids', docIds.join(','));
  }
  
  const response = await api.get<AskResponse>(`/rag/ask?${params.toString()}`);
  return response.data;
}

/**
 * 上下文感知問答 (POST) - 推薦使用
 */
export async function askQuestion(request: AskRequest): Promise<AskResponse> {
  const response = await api.post<AskResponse>('/rag/ask', request);
  return response.data;
}

/**
 * 深度研究請求介面 (舊版)
 */
export interface ResearchRequest {
  question: string;
  max_subtasks?: number;
  enable_reranking?: boolean;
}

/**
 * 深度研究回應介面 (舊版)
 */
export interface ResearchResponse {
  question: string;
  summary: string;
  detailed_answer: string;
  sub_tasks: SubTask[];
  all_sources: string[];
  confidence: number;
}

export interface SubTask {
  id: number;
  question: string;
  answer: string;
  sources: string[];
}

/**
 * 深度研究 - Plan-and-Solve 模式 (舊版一鍵)
 */
export async function deepResearch(request: ResearchRequest): Promise<ResearchResponse> {
  const response = await api.post<ResearchResponse>('/rag/research', request);
  return response.data;
}

// ========== Interactive Deep Research API (🆕 v2.1) ==========

/**
 * 生成研究計畫 (Human-in-the-loop)
 */
export async function generateResearchPlan(
  question: string,
  docIds?: string[],
  enableGraphPlanning?: boolean
): Promise<ResearchPlanResponse> {
  const response = await api.post<ResearchPlanResponse>('/rag/plan', {
    question,
    doc_ids: docIds,
    enable_graph_planning: enableGraphPlanning,
  });
  return response.data;
}

/**
 * 執行研究計畫 (非串流)
 */
export async function executeResearchPlan(
  request: ExecutePlanRequest
): Promise<ExecutePlanResponse> {
  const response = await api.post<ExecutePlanResponse>('/rag/execute', request);
  return response.data;
}

/**
 * 執行研究計畫 (SSE 串流)
 * 
 * @param request 執行計畫請求
 * @param onEvent SSE 事件回調
 * @param signal AbortController signal 用於取消
 */
export async function executeResearchPlanStream(
  request: ExecutePlanRequest,
  onEvent: (event: SSEEvent) => void,
  signal?: AbortSignal
): Promise<void> {
  // 🔧 直接從 Supabase 取得 session token (修復 401 問題)
  const { supabase } = await import('./supabase');
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session?.access_token) {
    throw new Error('未登入，請重新登入');
  }
  
  const response = await fetch(`${api.defaults.baseURL}/rag/execute/stream`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
    },
    body: JSON.stringify(request),
    signal,
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('Response body is not readable');
  }

  const decoder = new TextDecoder();
  let buffer = '';
  let currentEvent = '';
  let currentData = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || ''; // 保留最後不完整的行

    for (const line of lines) {
      if (line.startsWith('event:')) {
        currentEvent = line.slice(6).trim();
      } else if (line.startsWith('data:')) {
        currentData = line.slice(5).trim();
      } else if (line === '') {
        // 空行表示事件結束，觸發 callback
        if (currentEvent && currentData) {
          try {
            console.log('[SSE] Event:', currentEvent, 'Data:', currentData.slice(0, 100) + '...');
            onEvent({ 
              type: currentEvent as SSEEvent['type'], 
              data: JSON.parse(currentData) 
            });
          } catch (e) {
            console.error('[SSE] Parse error:', e);
          }
        }
        currentEvent = '';
        currentData = '';
      }
    }
  }

  // 處理最後殘留的事件 (如果沒有結尾空行)
  if (currentEvent && currentData) {
    try {
      console.log('[SSE] Final Event:', currentEvent);
      onEvent({ 
        type: currentEvent as SSEEvent['type'], 
        data: JSON.parse(currentData) 
      });
    } catch (e) {
      console.error('[SSE] Final parse error:', e);
    }
  }
}

