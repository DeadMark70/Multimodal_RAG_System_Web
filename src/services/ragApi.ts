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
  AgenticBenchmarkRequest,
  AgenticBenchmarkSSEEvent,
  ChatStreamEvent,
  ResearchPlanResponse,
  ExecutePlanRequest,
  ExecutePlanResponse,
  SSEEvent,
} from '../types/rag';
import { assertAllowedApiTarget, resolveApiUrl } from './networkPolicy';

/**
 * 基本問答 (POST wrapped)
 */
export async function askQuestionSimple(
  question: string, 
  docIds?: string[]
): Promise<AskResponse> {
  const response = await api.post<AskResponse>('/rag/ask', {
    question,
    doc_ids: docIds ?? null,
    enable_evaluation: true,
  });
  return response.data;
}

/**
 * 上下文感知問答 (POST) - 推薦使用
 */
export async function askQuestion(request: AskRequest): Promise<AskResponse> {
  const response = await api.post<AskResponse>('/rag/ask', request);
  return response.data;
}

async function getAccessToken(): Promise<string> {
  const { supabase } = await import('./supabase');
  const { data: { session } } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error('未登入，請重新登入');
  }

  return session.access_token;
}

async function streamSse<TEvent extends { type: string; data: unknown }>(
  path: string,
  request: unknown,
  onEvent: (event: TEvent) => void,
  signal?: AbortSignal
): Promise<void> {
  const accessToken = await getAccessToken();
  const streamUrl = resolveApiUrl(api.defaults.baseURL, path);
  assertAllowedApiTarget(streamUrl);

  const response = await fetch(streamUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
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
  const currentDataLines: string[] = [];

  const flushEvent = () => {
    if (!currentEvent) {
      currentDataLines.length = 0;
      return;
    }
    const dataPayload = currentDataLines.join('\n');
    if (!dataPayload) {
      currentEvent = '';
      currentDataLines.length = 0;
      return;
    }

    onEvent({
      type: currentEvent,
      data: JSON.parse(dataPayload),
    } as TEvent);

    currentEvent = '';
    currentDataLines.length = 0;
  };

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const rawLine of lines) {
      const line = rawLine.replace(/\r$/, '');
      if (line.startsWith('event:')) {
        currentEvent = line.slice(6).trim();
      } else if (line.startsWith('data:')) {
        currentDataLines.push(line.slice(5).trimStart());
      } else if (line === '') {
        flushEvent();
      }
    }
  }

  flushEvent();
}

export async function askQuestionStream(
  request: AskRequest,
  onEvent: (event: ChatStreamEvent) => void,
  signal?: AbortSignal
): Promise<void> {
  await streamSse<ChatStreamEvent>('/rag/ask/stream', request, onEvent, signal);
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
  await streamSse<SSEEvent>('/rag/execute/stream', request, onEvent, signal);
}

/**
 * Agentic Benchmark 研究 (聊天專用, 自動 plan+execute, SSE 串流)
 */
export async function executeAgenticBenchmarkStream(
  request: AgenticBenchmarkRequest,
  onEvent: (event: AgenticBenchmarkSSEEvent) => void,
  signal?: AbortSignal
): Promise<void> {
  await streamSse<AgenticBenchmarkSSEEvent>('/rag/agentic/stream', request, onEvent, signal);
}

