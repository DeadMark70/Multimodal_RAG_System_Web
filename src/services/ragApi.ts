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
import {
  agenticEventSchemas,
  chatEventSchemas,
  deepResearchEventSchemas,
} from './sse/schemas';
import { streamSse } from './sse/streamSse';
import type { StreamConnectionStatus } from './sse/streamSse';

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

export async function askQuestionStream(
  request: AskRequest,
  onEvent: (event: ChatStreamEvent) => void,
  signal?: AbortSignal,
  onStatus?: (status: StreamConnectionStatus) => void
): Promise<void> {
  const streamUrl = resolveApiUrl(api.defaults.baseURL, '/rag/ask/stream');
  assertAllowedApiTarget(streamUrl);
  await streamSse({
    url: streamUrl,
    body: request,
    schemas: chatEventSchemas,
    onEvent,
    onStatus,
    signal,
  });
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
  signal?: AbortSignal,
  onStatus?: (status: StreamConnectionStatus) => void
): Promise<void> {
  const streamUrl = resolveApiUrl(api.defaults.baseURL, '/rag/execute/stream');
  assertAllowedApiTarget(streamUrl);
  await streamSse({
    url: streamUrl,
    body: request,
    schemas: deepResearchEventSchemas,
    onEvent,
    onStatus,
    signal,
  });
}

/**
 * Agentic Benchmark 研究 (聊天專用, 自動 plan+execute, SSE 串流)
 */
export async function executeAgenticBenchmarkStream(
  request: AgenticBenchmarkRequest,
  onEvent: (event: AgenticBenchmarkSSEEvent) => void,
  signal?: AbortSignal,
  onStatus?: (status: StreamConnectionStatus) => void
): Promise<void> {
  const streamUrl = resolveApiUrl(api.defaults.baseURL, '/rag/agentic/stream');
  assertAllowedApiTarget(streamUrl);
  await streamSse({
    url: streamUrl,
    body: request,
    schemas: agenticEventSchemas,
    onEvent,
    onStatus,
    signal,
  });
}

