import { useCallback, useEffect, useRef, useState } from 'react';
import { useToast } from '@chakra-ui/react';

import { addMessage, createConversation, getConversation } from '../services/conversationApi';
import { executeAgenticBenchmarkStream } from '../services/ragApi';
import { useCurrentChatId, useSessionActions } from '../stores/useSessionStore';
import {
  getCurrentSettingsSnapshot,
  useBenchmarkRuntimeSettings,
  useSelectedChatModeId,
} from '../stores/useSettingsStore';
import type {
  AgenticBenchmarkEvaluationUpdate,
  AgenticBenchmarkRequest,
  AgenticBenchmarkPlanReadyData,
  AgenticBenchmarkSSEEvent,
  TaskProgress,
  ExecutePlanResponse,
} from '../types/rag';
import type { AgentTraceStep } from '../types/evaluation';
import { buildConversationTitle } from '../utils/conversationTitle';
import {
  getStreamFailureState,
  isAbortError,
  type StreamUiConnectionStatus,
} from './useChat';

type AgenticBenchmarkPhase =
  | 'idle'
  | 'planning'
  | 'executing'
  | 'drilldown'
  | 'evaluation'
  | 'synthesis'
  | 'complete';

interface ResearchConversationMetadata extends Record<string, unknown> {
  research_engine?: string;
  original_question?: string;
  plan?: AgenticBenchmarkPlanReadyData;
  progress?: AgenticBenchmarkTaskProgress[];
  evaluation_updates?: AgenticBenchmarkEvaluationUpdate[];
  result?: ExecutePlanResponse;
  agent_trace?: {
    coverage_gaps?: string[];
    steps?: AgentTraceStep[];
    [key: string]: unknown;
  };
}

interface AgenticBenchmarkTaskProgress extends TaskProgress {
  routeProfile?: string;
  toolCalls?: Array<Record<string, unknown>>;
}

export interface UseAgenticBenchmarkResearchReturn {
  plan: AgenticBenchmarkPlanReadyData | null;
  isRunning: boolean;
  progress: AgenticBenchmarkTaskProgress[];
  evaluationUpdates: AgenticBenchmarkEvaluationUpdate[];
  traceSteps: AgentTraceStep[];
  result: ExecutePlanResponse | null;
  agentTrace: Record<string, unknown> | null;
  error: string | null;
  currentPhase: AgenticBenchmarkPhase;
  connectionStatus: StreamUiConnectionStatus;
  canRetryLastRequest: boolean;
  runBenchmark: (question: string) => Promise<void>;
  retryLastRequest: () => Promise<void>;
  cancelExecution: () => void;
  reset: () => void;
}

function upsertTaskProgress(
  previous: AgenticBenchmarkTaskProgress[],
  nextTask: AgenticBenchmarkTaskProgress
): AgenticBenchmarkTaskProgress[] {
  const index = previous.findIndex(
    (task) => task.id === nextTask.id && task.iteration === nextTask.iteration
  );

  if (index === -1) {
    return [...previous, nextTask];
  }

  const updated = [...previous];
  updated[index] = { ...updated[index], ...nextTask };
  return updated;
}

function defaultStageLabel(stage: string): string {
  switch (stage) {
    case 'query_expansion':
      return '正在擴展查詢';
    case 'retrieval':
      return '正在檢索文件';
    case 'reranking':
      return '正在重排序結果';
    case 'graph_context':
      return '正在分析圖譜上下文';
    case 'answer_generation':
      return '正在生成回答';
    default:
      return '任務處理中';
  }
}

const TRACE_PHASES: AgentTraceStep['phase'][] = [
  'planning',
  'execution',
  'drilldown',
  'evaluation',
  'synthesis',
];
const TRACE_STATUSES: AgentTraceStep['status'][] = ['completed', 'partial', 'failed'];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isRecordArray(value: unknown): value is Array<Record<string, unknown>> {
  return Array.isArray(value) && value.every(isRecord);
}

function isOptionalNullableString(value: unknown): boolean {
  return value === undefined || value === null || typeof value === 'string';
}

function isAgentTraceStep(value: unknown): value is AgentTraceStep {
  if (!isRecord(value)) {
    return false;
  }

  const toolCallsValid =
    Array.isArray(value.tool_calls) &&
    value.tool_calls.every(
      (toolCall) =>
        isRecord(toolCall) &&
        typeof toolCall.index === 'number' &&
        typeof toolCall.action === 'string' &&
        TRACE_STATUSES.includes(toolCall.status as AgentTraceStep['status']) &&
        isRecord(toolCall.payload) &&
        isOptionalNullableString(toolCall.result_preview)
    );
  const tokenUsage = value.token_usage;
  const tokenUsageValid =
    isRecord(tokenUsage) &&
    ['total_tokens', 'input_tokens', 'output_tokens', 'reasoning_tokens'].every(
      (key) => tokenUsage[key] === undefined || typeof tokenUsage[key] === 'number'
    );

  return (
    typeof value.step_id === 'string' &&
    TRACE_PHASES.includes(value.phase as AgentTraceStep['phase']) &&
    typeof value.step_type === 'string' &&
    typeof value.title === 'string' &&
    TRACE_STATUSES.includes(value.status as AgentTraceStep['status']) &&
    isOptionalNullableString(value.started_at) &&
    isOptionalNullableString(value.completed_at) &&
    isOptionalNullableString(value.input_preview) &&
    isOptionalNullableString(value.output_preview) &&
    isOptionalNullableString(value.raw_text) &&
    toolCallsValid &&
    tokenUsageValid &&
    isRecord(value.metadata)
  );
}

export function useAgenticBenchmarkResearch(
  docIds: string[]
): UseAgenticBenchmarkResearchReturn {
  const toast = useToast();
  const runtimeSettings = useBenchmarkRuntimeSettings();
  const selectedChatModeId = useSelectedChatModeId();
  const currentChatId = useCurrentChatId();
  const { setCurrentChatId } = useSessionActions();

  const [plan, setPlan] = useState<AgenticBenchmarkPlanReadyData | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState<AgenticBenchmarkTaskProgress[]>([]);
  const [evaluationUpdates, setEvaluationUpdates] = useState<AgenticBenchmarkEvaluationUpdate[]>([]);
  const [traceSteps, setTraceSteps] = useState<AgentTraceStep[]>([]);
  const [result, setResult] = useState<ExecutePlanResponse | null>(null);
  const [agentTrace, setAgentTrace] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentPhase, setCurrentPhase] = useState<AgenticBenchmarkPhase>('idle');
  const [connectionStatus, setConnectionStatus] = useState<StreamUiConnectionStatus>({
    state: 'idle',
  });
  const [canRetryLastRequest, setCanRetryLastRequest] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const lastRetryableRequestRef = useRef<AgenticBenchmarkRequest | null>(null);

  useEffect(() => {
    lastRetryableRequestRef.current = null;
    setCanRetryLastRequest(false);
    setConnectionStatus({ state: 'idle' });

    if (!currentChatId) {
      return;
    }

    const loadHistory = async () => {
      try {
        const conversation = await getConversation(currentChatId);
        if (conversation.type !== 'research') {
          return;
        }
        const metadata = (conversation.metadata ?? {}) as ResearchConversationMetadata;
        if (metadata.research_engine !== 'agentic_benchmark') {
          return;
        }
        if (metadata.plan) {
          setPlan(metadata.plan);
        }
        if (Array.isArray(metadata.progress) && metadata.progress.length > 0) {
          setProgress(metadata.progress);
        }
        if (Array.isArray(metadata.evaluation_updates) && metadata.evaluation_updates.length > 0) {
          setEvaluationUpdates(metadata.evaluation_updates);
        }
        if (metadata.result) {
          setResult(metadata.result);
          if (!metadata.progress && metadata.result.sub_tasks.length > 0) {
            setProgress(
              metadata.result.sub_tasks.map((task) => ({
                id: task.id,
                question: task.question,
                taskType: 'rag',
                status: 'done',
                details: null,
                stageLabel: '回答完成',
                answer: task.answer,
                contexts: task.contexts,
                iteration: task.iteration,
              }))
            );
          }
          if (!metadata.plan && metadata.result.sub_tasks.length > 0) {
            const mainTasks = metadata.result.sub_tasks
              .filter((task) => task.iteration === 0)
              .map((task) => ({
                id: task.id,
                question: task.question,
                task_type: 'rag' as const,
                enabled: true,
              }));
            setPlan({
              original_question: metadata.result.question || metadata.original_question || '',
              estimated_complexity: 'medium',
              task_count: mainTasks.length,
              enabled_count: mainTasks.length,
              question_intent: 'restored',
              strategy_tier: 'restored',
              max_iterations: metadata.result.total_iterations,
              sub_tasks: mainTasks,
            });
          }
        }
        if (metadata.agent_trace) {
          setAgentTrace(metadata.agent_trace);
          setTraceSteps(Array.isArray(metadata.agent_trace.steps) ? metadata.agent_trace.steps : []);
          if (!metadata.evaluation_updates && Array.isArray(metadata.agent_trace.coverage_gaps)) {
            setEvaluationUpdates([
              {
                iteration: metadata.result?.total_iterations ?? 0,
                stage: 'restored_coverage',
                gate_pass: metadata.agent_trace.coverage_gaps.length === 0,
                coverage_gaps: metadata.agent_trace.coverage_gaps,
              },
            ]);
          }
        }
        if (metadata.result || metadata.agent_trace) {
          setCurrentPhase('complete');
        }
      } catch (loadError) {
        console.error('Failed to load agentic benchmark session', loadError);
      }
    };

    void loadHistory();
  }, [currentChatId]);

  const handleEvent = useCallback((event: AgenticBenchmarkSSEEvent) => {
    const { type, data } = event;

    switch (type) {
      case 'plan_ready': {
        const planData = data;
        setPlan(planData);
        setCurrentPhase('executing');
        setProgress(
          planData.sub_tasks.map((task) => ({
            id: task.id,
            question: task.question,
            taskType: task.task_type,
            status: 'pending',
            details: null,
            iteration: 0,
          }))
        );
        break;
      }
      case 'task_start':
      case 'drilldown_task_start': {
        const task = data;
        setCurrentPhase(task.iteration > 0 ? 'drilldown' : 'executing');
        setProgress((prev) =>
          upsertTaskProgress(prev, {
            id: task.id,
            question: task.question,
            taskType: task.task_type,
            status: 'running',
            stage: undefined,
            stageLabel: undefined,
            details: null,
            iteration: task.iteration,
            routeProfile:
              typeof task.route_profile === 'string' ? task.route_profile : undefined,
          })
        );
        break;
      }
      case 'task_phase_update': {
        const phaseData = data;
        setProgress((prev) =>
          prev.map((task) =>
            task.id === phaseData.id && task.iteration === phaseData.iteration
              ? {
                  ...task,
                  status: 'running',
                  stage: phaseData.stage,
                  stageLabel: phaseData.label ?? defaultStageLabel(phaseData.stage),
                  details: phaseData.details ?? null,
                }
              : task
          )
        );
        break;
      }
      case 'task_done':
      case 'drilldown_task_done': {
        const doneData = data;
        setProgress((prev) =>
          upsertTaskProgress(prev, {
            id: doneData.id,
            question: doneData.question,
            taskType: 'rag',
            status: 'done',
            answer: doneData.answer ?? undefined,
            contexts: doneData.contexts,
            stageLabel: '回答完成',
            details: null,
            iteration: doneData.iteration,
            routeProfile:
              typeof doneData.route_profile === 'string'
                ? doneData.route_profile
                : undefined,
            toolCalls: isRecordArray(doneData.tool_calls) ? doneData.tool_calls : undefined,
          })
        );
        break;
      }
      case 'drilldown_start':
        setCurrentPhase('drilldown');
        break;
      case 'evaluation_update':
        setCurrentPhase('evaluation');
        setEvaluationUpdates((prev) => [...prev, data]);
        break;
      case 'trace_step':
        if (isAgentTraceStep(data)) {
          setTraceSteps((prev) => [...prev, data]);
        }
        break;
      case 'synthesis_start':
        setCurrentPhase('synthesis');
        break;
      case 'complete': {
        const completeData = data;
        setResult(completeData.result);
        setAgentTrace(completeData.agent_trace);
        setTraceSteps((previous) => {
          const finalSteps = Array.isArray(completeData.agent_trace.steps)
            ? completeData.agent_trace.steps.filter(isAgentTraceStep)
            : [];
          return finalSteps.length > 0 ? finalSteps : previous;
        });
        setCurrentPhase('complete');
        if (currentChatId) {
          const finalReportContent = [
            completeData.result.summary,
            completeData.result.detailed_answer,
          ]
            .filter((section) => Boolean(section && section.trim()))
            .join('\n\n');
          void addMessage(currentChatId, {
            role: 'assistant',
            content: finalReportContent || '研究完成',
            metadata: {
              confidence: completeData.result.confidence,
              sources: completeData.result.all_sources,
              research_engine: 'agentic_benchmark',
            },
          }).catch(console.error);
        }
        break;
      }
      case 'error': {
        setError(data.message);
        break;
      }
    }
  }, [currentChatId]);

  const executeBenchmarkRequest = useCallback(async (request: AgenticBenchmarkRequest) => {
    setConnectionStatus({ state: 'idle' });
    setCanRetryLastRequest(false);
    lastRetryableRequestRef.current = null;
    abortControllerRef.current = new AbortController();

    try {
      await executeAgenticBenchmarkStream(
        request,
        handleEvent,
        abortControllerRef.current.signal,
        setConnectionStatus
      );
      lastRetryableRequestRef.current = null;
      setCanRetryLastRequest(false);
    } catch (runError) {
      if (isAbortError(runError)) {
        lastRetryableRequestRef.current = null;
        setCanRetryLastRequest(false);
        setConnectionStatus({ state: 'idle' });
        setError(null);
        setCurrentPhase('idle');
        toast({
          title: '已取消',
          description: 'Benchmark 研究已取消',
          status: 'info',
          duration: 3000,
        });
        return;
      }

      const failure = getStreamFailureState(runError);
      if (failure) {
        lastRetryableRequestRef.current = failure.canRetry ? request : null;
        setCanRetryLastRequest(failure.canRetry);
        setConnectionStatus(failure.status);
        setError(null);
        return;
      }

      setConnectionStatus({ state: 'idle' });
      const message = runError instanceof Error ? runError.message : 'Agentic benchmark 執行失敗';
      setError(message);
      toast({
        title: '執行失敗',
        description: message,
        status: 'error',
        duration: 5000,
      });
    } finally {
      abortControllerRef.current = null;
    }
  }, [handleEvent, toast]);

  const runBenchmark = useCallback(async (question: string) => {
    if (!question.trim() || isRunning) {
      return;
    }

    setError(null);
    setResult(null);
    setPlan(null);
    setProgress([]);
    setEvaluationUpdates([]);
    setTraceSteps([]);
    setAgentTrace(null);
    setIsRunning(true);
    setCurrentPhase('planning');

    try {
      const settingsSnapshot = getCurrentSettingsSnapshot();
      const conversationTitle = buildConversationTitle(question);
      const conversation = await createConversation({
        title: conversationTitle,
        type: 'research',
        metadata: {
          mode_preset: selectedChatModeId,
          mode_config_snapshot: settingsSnapshot.ragSettings,
          research_engine: 'agentic_benchmark',
          engine: 'agentic_benchmark',
          original_question: question,
        },
      });
      setCurrentChatId(conversation.id);
      await addMessage(conversation.id, {
        role: 'user',
        content: question,
      });

      const request: AgenticBenchmarkRequest = {
        question,
        doc_ids: docIds.length > 0 ? docIds : undefined,
        conversation_id: conversation.id,
        enable_reranking: runtimeSettings.enableReranking,
        enable_deep_image_analysis: runtimeSettings.enableDeepImageAnalysis,
      };
      await executeBenchmarkRequest(request);
    } catch (runError) {
      const message = runError instanceof Error ? runError.message : 'Agentic benchmark 執行失敗';
      setError(message);
      setConnectionStatus({ state: 'idle' });
      toast({
        title: '執行失敗',
        description: message,
        status: 'error',
        duration: 5000,
      });
    } finally {
      setIsRunning(false);
    }
  }, [
    docIds,
    executeBenchmarkRequest,
    isRunning,
    runtimeSettings,
    selectedChatModeId,
    setCurrentChatId,
    toast,
  ]);

  const retryLastRequest = useCallback(async () => {
    const request = lastRetryableRequestRef.current;
    if (!request || isRunning) {
      return;
    }

    setIsRunning(true);
    setCurrentPhase('planning');
    setError(null);
    try {
      await executeBenchmarkRequest(request);
    } finally {
      setIsRunning(false);
    }
  }, [executeBenchmarkRequest, isRunning]);

  const cancelExecution = useCallback(() => {
    abortControllerRef.current?.abort();
  }, []);

  const reset = useCallback(() => {
    setPlan(null);
    setIsRunning(false);
    setProgress([]);
    setEvaluationUpdates([]);
    setTraceSteps([]);
    setResult(null);
    setAgentTrace(null);
    setError(null);
    setCurrentPhase('idle');
    lastRetryableRequestRef.current = null;
    setCanRetryLastRequest(false);
    setConnectionStatus({ state: 'idle' });
    setCurrentChatId(null);
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, [setCurrentChatId]);

  return {
    plan,
    isRunning,
    progress,
    evaluationUpdates,
    traceSteps,
    result,
    agentTrace,
    error,
    currentPhase,
    connectionStatus,
    canRetryLastRequest,
    runBenchmark,
    retryLastRequest,
    cancelExecution,
    reset,
  };
}

export default useAgenticBenchmarkResearch;
