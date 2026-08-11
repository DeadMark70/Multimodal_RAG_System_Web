import { z } from 'zod';

const pipelineStageSchema = z.enum([
  'query_expansion',
  'retrieval',
  'reranking',
  'graph_context',
  'answer_generation',
]);

const taskTypeSchema = z.enum(['rag', 'graph_analysis']);

const sourceSchema = z
  .object({
    doc_id: z.string().min(1),
    filename: z.string().nullable(),
    page: z.number().int().positive().nullable(),
    snippet: z.string().nullable(),
    score: z.number().min(0).max(1).nullable(),
    bbox: z
      .tuple([z.number(), z.number(), z.number(), z.number()])
      .nullable()
      .optional(),
  })
  .passthrough();

const editableTaskSchema = z
  .object({
    id: z.number().int(),
    question: z.string(),
    task_type: taskTypeSchema,
    enabled: z.boolean(),
  })
  .passthrough();

const errorSchema = z
  .object({
    message: z.string(),
    task_id: z.number().int().optional(),
  })
  .passthrough();

const metricsSchema = z
  .object({
    accuracy: z.number().optional(),
    completeness: z.number().optional(),
    clarity: z.number().optional(),
    weighted_score: z.number().optional(),
    is_passing: z.boolean().optional(),
    suggestion: z.string().optional(),
    faithfulness: z.enum(['grounded', 'hallucinated', 'uncertain']),
    confidence_score: z.number(),
  })
  .passthrough();

const taskStartSchema = z
  .object({
    id: z.number().int(),
    question: z.string(),
    task_type: taskTypeSchema,
    iteration: z.number().int(),
  })
  .passthrough();

const taskPhaseUpdateSchema = z
  .object({
    id: z.number().int(),
    iteration: z.number().int(),
    stage: pipelineStageSchema,
    label: z.string().optional(),
    details: z.record(z.string(), z.unknown()).nullable(),
  })
  .passthrough();

const taskDoneSchema = z
  .object({
    id: z.number().int(),
    question: z.string(),
    answer: z.string().nullable().optional(),
    sources: z.array(z.string()),
    contexts: z.array(z.string()),
    iteration: z.number().int(),
  })
  .passthrough();

const drilldownStartSchema = z
  .object({
    iteration: z.number().int(),
    new_task_count: z.number().int(),
  })
  .passthrough();

const synthesisStartSchema = z
  .object({
    total_tasks: z.number().int(),
  })
  .passthrough();

const subTaskResultSchema = z
  .object({
    id: z.number().int(),
    question: z.string(),
    answer: z.string(),
    sources: z.array(z.string()),
    contexts: z.array(z.string()).optional(),
    is_drilldown: z.boolean(),
    iteration: z.number().int(),
    thought_process: z.string().optional(),
  })
  .passthrough();

const deepCompleteSchema = z
  .object({
    question: z.string(),
    summary: z.string(),
    detailed_answer: z.string(),
    sub_tasks: z.array(subTaskResultSchema),
    all_sources: z.array(z.string()),
    confidence: z.number(),
    total_iterations: z.number().int(),
    metrics: metricsSchema.optional(),
  })
  .passthrough();

export const chatEventSchemas = {
  phase_update: z
    .object({
      stage: pipelineStageSchema,
      label: z.string().optional(),
      message: z.string().optional(),
    })
    .passthrough(),
  complete: z
    .object({
      question: z.string(),
      answer: z.string(),
      sources: z.array(sourceSchema),
      metrics: metricsSchema.nullable(),
    })
    .passthrough(),
  error: errorSchema,
} as const;

export const deepResearchEventSchemas = {
  plan_confirmed: z
    .object({
      task_count: z.number().int(),
      enabled_count: z.number().int(),
    })
    .passthrough(),
  task_start: taskStartSchema,
  task_phase_update: taskPhaseUpdateSchema,
  task_done: taskDoneSchema,
  drilldown_start: drilldownStartSchema,
  drilldown_task_start: taskStartSchema,
  drilldown_task_done: taskDoneSchema,
  synthesis_start: synthesisStartSchema,
  complete: deepCompleteSchema,
  error: errorSchema,
} as const;

export const agenticEventSchemas = {
  plan_ready: z
    .object({
      original_question: z.string(),
      estimated_complexity: z.enum(['simple', 'medium', 'complex']),
      task_count: z.number().int(),
      enabled_count: z.number().int(),
      question_intent: z.string(),
      strategy_tier: z.string(),
      max_iterations: z.number().int(),
      sub_tasks: z.array(editableTaskSchema),
    })
    .passthrough(),
  task_start: taskStartSchema,
  task_phase_update: taskPhaseUpdateSchema,
  task_done: taskDoneSchema,
  drilldown_start: drilldownStartSchema,
  drilldown_task_start: taskStartSchema,
  drilldown_task_done: taskDoneSchema,
  evaluation_update: z
    .object({
      iteration: z.number().int(),
      stage: z.string(),
      gate_pass: z.boolean().optional(),
      coverage_gaps: z.array(z.string()).optional(),
      details: z.record(z.string(), z.unknown()).optional(),
    })
    .passthrough(),
  trace_step: z
    .object({
      step_id: z.string(),
      title: z.string().optional(),
    })
    .passthrough(),
  synthesis_start: synthesisStartSchema,
  complete: z
    .object({
      result: deepCompleteSchema,
      agent_trace: z.record(z.string(), z.unknown()),
    })
    .passthrough(),
  error: errorSchema,
} as const;

type EventSchemaMap = Record<string, z.ZodType>;

export type EventFromSchemaMap<TMap extends EventSchemaMap> = {
  [TType in keyof TMap]: {
    type: TType;
    data: z.output<TMap[TType]>;
  };
}[keyof TMap];

export type ChatStreamEvent = EventFromSchemaMap<typeof chatEventSchemas>;
export type SSEEvent = EventFromSchemaMap<typeof deepResearchEventSchemas>;
export type AgenticBenchmarkSSEEvent = EventFromSchemaMap<
  typeof agenticEventSchemas
>;
