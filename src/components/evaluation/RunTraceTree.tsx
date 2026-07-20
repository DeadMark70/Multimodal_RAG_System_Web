import {
  Badge,
  Box,
  Button,
  Code,
  HStack,
  Table,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
  VStack,
} from '@chakra-ui/react';
import { useState } from 'react';

export interface RunTraceEvent {
  eventId: string;
  spanId?: string;
  sequence: number;
  stageName: string;
  status: string;
  startedAt: string;
  durationMs?: number;
  payload?: Record<string, unknown>;
  error?: Record<string, unknown>;
}

interface TraceEventGroup {
  representative: RunTraceEvent;
  lifecycle: RunTraceEvent[];
}

function groupLifecycleEvents(events: RunTraceEvent[]): TraceEventGroup[] {
  const groups = new Map<string, RunTraceEvent[]>();
  for (const event of events.slice().sort((left, right) => left.sequence - right.sequence)) {
    const key = event.spanId ? `${event.spanId}:${event.stageName}` : event.eventId;
    const current = groups.get(key) ?? [];
    current.push(event);
    groups.set(key, current);
  }
  return Array.from(groups.values()).map((lifecycle) => ({
    representative:
      lifecycle.find((event) => !['running', 'partial'].includes(event.status))
      ?? lifecycle[lifecycle.length - 1],
    lifecycle,
  }));
}

function JsonDisclosure({ label, value }: { label: string; value: Record<string, unknown> }) {
  const [open, setOpen] = useState(false);

  return (
    <VStack align="stretch" spacing={2}>
      <Button size="xs" variant="outline" alignSelf="start" onClick={() => setOpen((current) => !current)}>
        {label}
      </Button>
      {open ? (
        <Code whiteSpace="pre-wrap" p={2} borderRadius="md">
          {JSON.stringify(value, null, 2)}
        </Code>
      ) : null}
    </VStack>
  );
}

export default function RunTraceTree({ events }: { events?: RunTraceEvent[] }) {
  const [expandedSpans, setExpandedSpans] = useState<Set<string>>(new Set());

  if (!events?.length) {
    return <Text color="text.secondary">No trace events are available for this run yet.</Text>;
  }

  return (
    <Box overflowX="auto">
      <Table size="sm">
        <Thead>
          <Tr>
            <Th>Sequence</Th>
            <Th>Stage</Th>
            <Th>Status</Th>
            <Th isNumeric>Duration</Th>
            <Th>Details</Th>
          </Tr>
        </Thead>
        <Tbody>
          {groupLifecycleEvents(events).flatMap(({ representative, lifecycle }) => {
            const lifecycleKey = representative.spanId ?? representative.eventId;
            const expanded = expandedSpans.has(lifecycleKey);
            const rows = [representative];
            if (expanded) {
              rows.push(...lifecycle.filter((event) => event.eventId !== representative.eventId));
            }
            return rows.map((event, index) => (
              <Tr key={event.eventId}>
                <Td>{event.sequence}</Td>
                <Td fontWeight="medium">{event.stageName}{index > 0 ? ' · lifecycle' : ''}</Td>
                <Td>
                  <Badge colorScheme={event.status === 'success' ? 'green' : event.status === 'partial' ? 'yellow' : 'gray'}>
                    {event.status}
                  </Badge>
                </Td>
                <Td isNumeric>{event.durationMs ? `${event.durationMs.toLocaleString()} ms` : 'n/a'}</Td>
                <Td>
                  <HStack align="start" spacing={2}>
                    {index === 0 && lifecycle.length > 1 ? (
                      <Button
                        size="xs"
                        variant="outline"
                        onClick={() => setExpandedSpans((current) => {
                          const next = new Set(current);
                          if (next.has(lifecycleKey)) next.delete(lifecycleKey);
                          else next.add(lifecycleKey);
                          return next;
                        })}
                      >
                        {expanded ? 'Hide lifecycle' : `Show lifecycle (${lifecycle.length})`}
                      </Button>
                    ) : null}
                    {event.payload ? <JsonDisclosure label="Payload" value={event.payload} /> : null}
                    {event.error ? <JsonDisclosure label="Error" value={event.error} /> : null}
                  </HStack>
                </Td>
              </Tr>
            ));
          })}
        </Tbody>
      </Table>
    </Box>
  );
}
