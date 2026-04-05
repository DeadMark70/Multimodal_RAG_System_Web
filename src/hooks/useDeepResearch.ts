/**
 * useDeepResearch Hook
 * 
 * 管理 Interactive Deep Research 工作流程
 * - 生成研究計畫
 * - 編輯/啟用/停用子任務
 * - 執行計畫 (SSE 串流)
 * - 追蹤進度
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { useToast } from '@chakra-ui/react';
import { 
  generateResearchPlan, 
  executeResearchPlanStream 
} from '../services/ragApi';
import { getConversation, addMessage, updateConversation } from '../services/conversationApi';
import type { 
  ChatPipelineStage,
  EditableSubTask, 
  ResearchPlanResponse,
  ExecutePlanResponse,
  TaskPhaseUpdate,
  TaskProgress,
  SSEEvent,
} from '../types/rag';
import { useSessionStore } from '../stores/useSessionStore';
import { useSettingsStore } from '../stores/useSettingsStore';
import { useConversationMutations } from './useConversations';

interface UseDeepResearchOptions {
  docIds?: string[];
  enableGraphPlanning?: boolean;
}

interface ResearchConversationMetadata extends Record<string, unknown> {
  research_engine?: string;
  original_question?: string;
  plan?: ResearchPlanResponse;
  result?: ExecutePlanResponse;
  summary?: string;
  detailed_answer?: string;
}

/** Deep Research 執行階段 (Phase 6 UX 優化) */
export type ResearchPhase = 
  | 'idle' 
  | 'planning' 
  | 'executing' 
  | 'drilldown' 
  | 'synthesis' 
  | 'complete';

export interface UseDeepResearchReturn {
  // 狀態
  plan: ResearchPlanResponse | null;
  isPlanning: boolean;
  isExecuting: boolean;
  progress: TaskProgress[];
  result: ExecutePlanResponse | null;
  error: string | null;
  /** 🆕 Phase 6: 當前執行階段 */
  currentPhase: ResearchPhase;

  // 方法
  generatePlan: (question: string) => Promise<void>;
  updateTask: (taskId: number, updates: Partial<EditableSubTask>) => void;
  toggleTask: (taskId: number) => void;
  deleteTask: (taskId: number) => void;
  executePlan: () => Promise<void>;
  cancelExecution: () => void;
  reset: () => void;
}

type TaskStartEvent = {
  id: number;
  question: string;
  task_type: EditableSubTask['task_type'];
  iteration: number;
};

type TaskDoneEvent = {
  id: number;
  answer: string;
  contexts?: string[];
  iteration: number;
};

function upsertTaskProgress(
  previous: TaskProgress[],
  nextTask: TaskProgress
): TaskProgress[] {
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

function defaultStageLabel(stage: ChatPipelineStage): string {
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

export function useDeepResearch(options: UseDeepResearchOptions = {}): UseDeepResearchReturn {
  const { docIds, enableGraphPlanning } = options;
  const { ragSettings, selectedChatModeId } = useSettingsStore();
  
  const [plan, setPlan] = useState<ResearchPlanResponse | null>(null);
  const [isPlanning, setIsPlanning] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [progress, setProgress] = useState<TaskProgress[]>([]);
  const [result, setResult] = useState<ExecutePlanResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  /** 🆕 Phase 6: 當前執行階段 */
  const [currentPhase, setCurrentPhase] = useState<ResearchPhase>('idle');
  
  const abortControllerRef = useRef<AbortController | null>(null);
  const toast = useToast();

  // Integration with Session and Conversations
  const { currentChatId, actions: { setCurrentChatId } } = useSessionStore();
  const { create: createConversation } = useConversationMutations();

  // 載入歷史紀錄 (如果 currentChatId 存在且是研究類型)
  useEffect(() => {
    if (!currentChatId) return;

    const loadHistory = async () => {
      try {
        const conversation = await getConversation(currentChatId);
        if (conversation.type === 'research') {
          const metadata = (conversation.metadata ?? {}) as ResearchConversationMetadata;
          if (metadata.research_engine === 'agentic_benchmark') {
            return;
          }
          if (metadata.plan) {
            setPlan(metadata.plan);
          }

          const restoredResult = metadata.result ?? (
            metadata.summary || metadata.detailed_answer
              ? metadata as unknown as ExecutePlanResponse
              : null
          );
          if (restoredResult) {
            setResult(restoredResult);
            setCurrentPhase('complete');
          }
        }
      } catch (err) {
        console.error('Failed to load research session', err);
      }
    };

    void loadHistory();
  }, [currentChatId]);

  /**
   * 生成研究計畫
   */
  const generatePlan = useCallback(async (question: string) => {
    if (!question.trim()) return;

    setIsPlanning(true);
    setCurrentPhase('planning');
    setError(null);
    setPlan(null);
    setResult(null);
    setProgress([]);

    try {
      // 1. 建立新的對話 Session (Persistence)
      const conversation = await createConversation({
        title: question,
        type: 'research',
        metadata: {
          mode_preset: selectedChatModeId,
          mode_config_snapshot: ragSettings,
          research_engine: 'deep_research',
          engine: 'agentic',
          original_question: question,
        }
      });
      setCurrentChatId(conversation.id);

      // 2. 生成計畫
      const planResponse = await generateResearchPlan(question, docIds, enableGraphPlanning);
      setPlan(planResponse);

      // 3. 儲存 canonical research metadata
      await updateConversation(conversation.id, {
        metadata: {
          mode_preset: selectedChatModeId,
          mode_config_snapshot: ragSettings,
          research_engine: 'deep_research',
          engine: 'agentic',
          original_question: question,
          plan: planResponse,
        },
      });

      // 4. 儲存使用者問題到對話時間線
      await addMessage(conversation.id, {
        role: 'user',
        content: question,
      });

    } catch (err) {
      const message = err instanceof Error ? err.message : '生成研究計畫失敗';
      setError(message);
      toast({
        title: '計畫生成失敗',
        description: message,
        status: 'error',
        duration: 5000,
      });
    } finally {
      setIsPlanning(false);
    }
  }, [
    docIds,
    enableGraphPlanning,
    ragSettings,
    selectedChatModeId,
    toast,
    createConversation,
    setCurrentChatId,
  ]);

  /**
   * 更新子任務
   */
  const updateTask = useCallback((taskId: number, updates: Partial<EditableSubTask>) => {
    setPlan(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        sub_tasks: prev.sub_tasks.map(task =>
          task.id === taskId ? { ...task, ...updates } : task
        ),
      };
    });
  }, []);

  /**
   * 切換子任務啟用狀態
   */
  const toggleTask = useCallback((taskId: number) => {
    updateTask(taskId, { enabled: undefined }); // Trigger re-render
    setPlan(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        sub_tasks: prev.sub_tasks.map(task =>
          task.id === taskId ? { ...task, enabled: !task.enabled } : task
        ),
      };
    });
  }, [updateTask]);

  /**
   * 刪除子任務
   */
  const deleteTask = useCallback((taskId: number) => {
    setPlan(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        sub_tasks: prev.sub_tasks.filter(task => task.id !== taskId),
      };
    });
  }, []);

  /**
   * 處理 SSE 事件
   */
  const handleSSEEvent = useCallback((event: SSEEvent) => {
    const { type, data } = event;

    switch (type) {
      case 'plan_confirmed':
        // 計畫已確認，開始執行
        setCurrentPhase('executing');
        break;

      case 'task_start':
      case 'drilldown_task_start': {
        const taskData = data as TaskStartEvent;
        setProgress((prev) =>
          upsertTaskProgress(prev, {
            id: taskData.id,
            question: taskData.question,
            taskType: taskData.task_type,
            status: 'running',
            stage: undefined,
            stageLabel: undefined,
            details: null,
            iteration: taskData.iteration,
          })
        );
        setCurrentPhase(taskData.iteration > 0 ? 'drilldown' : 'executing');
        break;
      }

      case 'task_phase_update': {
        const phaseData = data as TaskPhaseUpdate;
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
        const doneData = data as TaskDoneEvent;
        setProgress((prev) =>
          prev.map((task) =>
            task.id === doneData.id && task.iteration === doneData.iteration
              ? {
                  ...task,
                  status: 'done',
                  answer: doneData.answer,
                  contexts: doneData.contexts,
                  stageLabel: task.stageLabel ?? '回答完成',
                }
              : task
          )
        );
        break;
      }

      case 'drilldown_start': {
        // Phase 6: 深入挖掘開始
        setCurrentPhase('drilldown');
        break;
      }

      case 'synthesis_start':
        // Phase 6: 綜合報告生成中
        setCurrentPhase('synthesis');
        break;

      case 'complete': {
        const completeData = data as ExecutePlanResponse;
        setResult(completeData);
        setCurrentPhase('complete');
        
        // 儲存摘要作為時間線訊息，完整結果以 conversation metadata 為準
        if (currentChatId) {
            void addMessage(currentChatId, {
                role: 'assistant',
                content: completeData.summary || '研究完成',
                metadata: { 
                    confidence: completeData.confidence,
                    sources: completeData.all_sources,
                }
            }).catch(console.error);
        }
        break;
      }

      case 'error': {
        const errorData = data as { message: string };
        setError(errorData.message);
        break;
      }
    }
  }, [currentChatId]);

  /**
   * 執行研究計畫
   */
  const executePlan = useCallback(async () => {
    if (!plan || plan.sub_tasks.filter(t => t.enabled).length === 0) {
      toast({
        title: '無法執行',
        description: '請至少啟用一個子任務',
        status: 'warning',
        duration: 3000,
      });
      return;
    }

    setIsExecuting(true);
    setCurrentPhase('executing');
    setError(null);
    setResult(null);

    // 初始化進度
    const initialProgress: TaskProgress[] = plan.sub_tasks
      .filter(t => t.enabled)
      .map(task => ({
        id: task.id,
        question: task.question,
        taskType: task.task_type,
        status: 'pending',
        details: null,
        iteration: 0,
      }));
    setProgress(initialProgress);

    // 建立 AbortController
    abortControllerRef.current = new AbortController();

    try {
      if (currentChatId) {
        await updateConversation(currentChatId, {
          metadata: {
            mode_preset: selectedChatModeId,
            mode_config_snapshot: ragSettings,
            research_engine: 'deep_research',
            engine: 'agentic',
            original_question: plan.original_question,
            plan,
          },
        });
      }

      await executeResearchPlanStream(
        {
          original_question: plan.original_question,
          sub_tasks: plan.sub_tasks.filter(t => t.enabled),
          doc_ids: plan.doc_ids ?? undefined,
          enable_reranking: ragSettings.enable_reranking,
          enable_drilldown: true,
          enable_deep_image_analysis: ragSettings.enable_deep_image_analysis,
          conversation_id: currentChatId || undefined,
        },
        (event: SSEEvent) => {
          handleSSEEvent(event);
        },
        abortControllerRef.current.signal
      );
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        toast({
          title: '已取消',
          description: '研究已被取消',
          status: 'info',
          duration: 3000,
        });
      } else {
        const message = err instanceof Error ? err.message : '執行失敗';
        setError(message);
        toast({
          title: '執行失敗',
          description: message,
          status: 'error',
          duration: 5000,
        });
      }
    } finally {
      setIsExecuting(false);
      abortControllerRef.current = null;
    }
  }, [
    plan,
    toast,
    handleSSEEvent,
    ragSettings,
    selectedChatModeId,
    currentChatId,
  ]);

  /**
   * 取消執行
   */
  const cancelExecution = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  /**
   * 重置狀態
   */
  const reset = useCallback(() => {
    setPlan(null);
    setIsPlanning(false);
    setIsExecuting(false);
    setProgress([]);
    setResult(null);
    setError(null);
    setCurrentPhase('idle');
    setCurrentChatId(null); // Reset chat ID
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, [setCurrentChatId]);

  return {
    plan,
    isPlanning,
    isExecuting,
    progress,
    result,
    error,
    currentPhase,
    generatePlan,
    updateTask,
    toggleTask,
    deleteTask,
    executePlan,
    cancelExecution,
    reset,
  };
}

export default useDeepResearch;
