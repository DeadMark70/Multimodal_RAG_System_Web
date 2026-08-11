import type { z } from 'zod';

import type { EventFromSchemaMap } from './schemas';

type EventSchemaMap = Record<string, z.ZodType>;

export class SseProtocolError extends Error {
  readonly kind: 'unknown_event' | 'invalid_json' | 'invalid_payload';
  readonly eventName?: string;

  constructor(
    kind: 'unknown_event' | 'invalid_json' | 'invalid_payload',
    message: string,
    eventName?: string
  ) {
    super(message);
    this.name = 'SseProtocolError';
    this.kind = kind;
    this.eventName = eventName;
  }
}

export function parseSseEvent<TMap extends EventSchemaMap>(
  schemas: TMap,
  eventName: string,
  rawData: string
): EventFromSchemaMap<TMap> {
  if (!Object.prototype.hasOwnProperty.call(schemas, eventName)) {
    throw new SseProtocolError(
      'unknown_event',
      `Unknown SSE event: ${eventName}`,
      eventName
    );
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawData);
  } catch {
    throw new SseProtocolError(
      'invalid_json',
      `Invalid JSON for SSE event: ${eventName}`,
      eventName
    );
  }

  const schema = schemas[eventName as keyof TMap];
  const result = schema.safeParse(payload);
  if (!result.success) {
    throw new SseProtocolError(
      'invalid_payload',
      `Invalid payload for SSE event: ${eventName}`,
      eventName
    );
  }

  return {
    type: eventName,
    data: result.data,
  } as EventFromSchemaMap<TMap>;
}
