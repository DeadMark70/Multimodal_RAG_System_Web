/**
 * useDeepResearch Hook
 * 
 * 管理 Interactive Deep Research 工作流程
 * - 生成研究計畫
 * - 編輯/啟用/停用子任務
 * - 執行計畫 (SSE 串流)
 * - 追蹤進度
 */

import { useState, useCallback, useRef } from 'react';
import { useToast } from '@chakra-ui/react';
import { 
  generateResearchPlan, 
  executeResearchPlanStream 
} from '../services/ragApi';
import type { 
  EditableSubTask, 
  ResearchPlanResponse,
  ExecutePlanResponse,
  TaskProgress,
  SSEEvent,
} from '../types/rag';

interface UseDeepResearchOptions {
  docIds?: string[];
  enableGraphPlanning?: boolean;
}

interface UseDeepResearchReturn {
  // 狀態
  plan: ResearchPlanResponse | null;
  isPlanning: boolean;
  isExecuting: boolean;
  progress: TaskProgress[];
  result: ExecutePlanResponse | null;
  error: string | null;

  // 方法
  generatePlan: (question: string) => Promise<void>;
  updateTask: (taskId: number, updates: Partial<EditableSubTask>) => void;
  toggleTask: (taskId: number) => void;
  deleteTask: (taskId: number) => void;
  executePlan: () => Promise<void>;
  cancelExecution: () => void;
  reset: () => void;
}

export function useDeepResearch(options: UseDeepResearchOptions = {}): UseDeepResearchReturn {
  const { docIds, enableGraphPlanning } = options;
  
  const [plan, setPlan] = useState<ResearchPlanResponse | null>(null);
  const [isPlanning, setIsPlanning] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [progress, setProgress] = useState<TaskProgress[]>([]);
  const [result, setResult] = useState<ExecutePlanResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const abortControllerRef = useRef<AbortController | null>(null);
  const toast = useToast();

  /**
   * 生成研究計畫
   */
  const generatePlan = useCallback(async (question: string) => {
    if (!question.trim()) return;

    setIsPlanning(true);
    setError(null);
    setPlan(null);
    setResult(null);
    setProgress([]);

    try {
      const planResponse = await generateResearchPlan(question, docIds, enableGraphPlanning);
      setPlan(planResponse);
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
  }, [docIds, enableGraphPlanning, toast]);

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
    setError(null);
    setResult(null);

    // 初始化進度
    const initialProgress: TaskProgress[] = plan.sub_tasks
      .filter(t => t.enabled)
      .map(task => ({
        id: task.id,
        question: task.question,
        status: 'pending',
        iteration: 0,
      }));
    setProgress(initialProgress);

    // 建立 AbortController
    abortControllerRef.current = new AbortController();

    try {
      await executeResearchPlanStream(
        {
          original_question: plan.original_question,
          sub_tasks: plan.sub_tasks.filter(t => t.enabled),
          doc_ids: plan.doc_ids ?? undefined,
          enable_drilldown: true,
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
  }, [plan, toast]);

  /**
   * 處理 SSE 事件
   */
  const handleSSEEvent = useCallback((event: SSEEvent) => {
    const { type, data } = event;

    switch (type) {
      case 'plan_confirmed':
        // 計畫已確認，開始執行
        break;

      case 'task_start':
      case 'drilldown_task_start': {
        const taskData = data as { id: number; question: string; iteration: number };
        setProgress(prev => {
          const exists = prev.find(p => p.id === taskData.id && p.iteration === taskData.iteration);
          if (exists) {
            return prev.map(p =>
              p.id === taskData.id && p.iteration === taskData.iteration
                ? { ...p, status: 'running' }
                : p
            );
          }
          return [...prev, {
            id: taskData.id,
            question: taskData.question,
            status: 'running',
            iteration: taskData.iteration,
          }];
        });
        break;
      }

      case 'task_done':
      case 'drilldown_task_done': {
        const doneData = data as { id: number; answer: string; iteration: number };
        setProgress(prev =>
          prev.map(p =>
            p.id === doneData.id && p.iteration === doneData.iteration
              ? { ...p, status: 'done', answer: doneData.answer }
              : p
          )
        );
        break;
      }

      case 'drilldown_start': {
        // 深入挖掘開始，可以顯示提示
        break;
      }

      case 'synthesis_start':
        // 綜合報告生成中
        break;

      case 'complete': {
        const completeData = data as ExecutePlanResponse;
        setResult(completeData);
        break;
      }

      case 'error': {
        const errorData = data as { message: string };
        setError(errorData.message);
        break;
      }
    }
  }, []);

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
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  return {
    plan,
    isPlanning,
    isExecuting,
    progress,
    result,
    error,
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
