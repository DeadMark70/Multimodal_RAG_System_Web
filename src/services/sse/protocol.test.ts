import { describe, expect, it } from 'vitest';

import {
  agenticEventSchemas,
  chatEventSchemas,
  deepResearchEventSchemas,
} from './schemas';
import { parseSseEvent, SseProtocolError } from './protocol';

function expectProtocolError(
  parse: () => unknown,
  kind: SseProtocolError['kind']
): void {
  try {
    parse();
  } catch (error: unknown) {
    if (!(error instanceof SseProtocolError)) {
      throw error;
    }
    expect(error.kind).toBe(kind);
    return;
  }

  throw new Error(`Expected ${kind} protocol error`);
}

describe('parseSseEvent', () => {
  it('parses a valid chat complete event', () => {
    expect(
      parseSseEvent(
        chatEventSchemas,
        'complete',
        JSON.stringify({
          question: 'q',
          answer: 'a',
          sources: [],
          metrics: null,
        })
      )
    ).toEqual({
      type: 'complete',
      data: { question: 'q', answer: 'a', sources: [], metrics: null },
    });
  });

  it.each([
    ['unknown', '{}', 'unknown_event'],
    ['phase_update', '{bad', 'invalid_json'],
    ['phase_update', '{"stage":42}', 'invalid_payload'],
  ] as const)('rejects %s before delivery', (eventName, rawData, kind) => {
    expectProtocolError(
      () => parseSseEvent(chatEventSchemas, eventName, rawData),
      kind
    );
  });

  it('parses a valid Deep Research task_start event', () => {
    expect(
      parseSseEvent(
        deepResearchEventSchemas,
        'task_start',
        JSON.stringify({
          id: 1,
          question: 'Find evidence',
          task_type: 'rag',
          iteration: 0,
        })
      )
    ).toEqual({
      type: 'task_start',
      data: {
        id: 1,
        question: 'Find evidence',
        task_type: 'rag',
        iteration: 0,
      },
    });
  });

  it('rejects a malformed Deep Research task_start event', () => {
    expectProtocolError(
      () =>
      parseSseEvent(
        deepResearchEventSchemas,
        'task_start',
        JSON.stringify({
          id: 1,
          question: 'Find evidence',
          task_type: 'unsupported',
          iteration: 0,
        })
      ),
      'invalid_payload'
    );
  });

  it('parses a valid Agentic plan_ready event', () => {
    const data = {
      original_question: 'q',
      estimated_complexity: 'medium',
      task_count: 1,
      enabled_count: 1,
      question_intent: 'compare',
      strategy_tier: 'balanced',
      max_iterations: 2,
      sub_tasks: [
        {
          id: 1,
          question: 'Compare sources',
          task_type: 'graph_analysis',
          enabled: true,
        },
      ],
    };

    expect(
      parseSseEvent(agenticEventSchemas, 'plan_ready', JSON.stringify(data))
    ).toEqual({ type: 'plan_ready', data });
  });

  it('rejects a malformed Agentic plan_ready event', () => {
    expectProtocolError(
      () =>
      parseSseEvent(
        agenticEventSchemas,
        'plan_ready',
        JSON.stringify({
          original_question: 'q',
          estimated_complexity: 'medium',
          task_count: 'one',
          enabled_count: 1,
          question_intent: 'compare',
          strategy_tier: 'balanced',
          max_iterations: 2,
          sub_tasks: [],
        })
      ),
      'invalid_payload'
    );
  });

  it('preserves additive payload fields', () => {
    expect(
      parseSseEvent(
        chatEventSchemas,
        'phase_update',
        JSON.stringify({
          stage: 'retrieval',
          label: 'Searching',
          future_field: { enabled: true },
        })
      )
    ).toEqual({
      type: 'phase_update',
      data: {
        stage: 'retrieval',
        label: 'Searching',
        future_field: { enabled: true },
      },
    });
  });
});
