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
  sequence: number;
  stageName: string;
  status: string;
  startedAt: string;
  durationMs?: number;
  payload?: Record<string, unknown>;
  error?: Record<string, unknown>;
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
          {events
            .slice()
            .sort((left, right) => left.sequence - right.sequence)
            .map((event) => (
              <Tr key={event.eventId}>
                <Td>{event.sequence}</Td>
                <Td fontWeight="medium">{event.stageName}</Td>
                <Td>
                  <Badge colorScheme={event.status === 'success' ? 'green' : event.status === 'partial' ? 'yellow' : 'gray'}>
                    {event.status}
                  </Badge>
                </Td>
                <Td isNumeric>{event.durationMs ? `${event.durationMs.toLocaleString()} ms` : 'n/a'}</Td>
                <Td>
                  <HStack align="start" spacing={2}>
                    {event.payload ? <JsonDisclosure label="Payload" value={event.payload} /> : null}
                    {event.error ? <JsonDisclosure label="Error" value={event.error} /> : null}
                  </HStack>
                </Td>
              </Tr>
            ))}
        </Tbody>
      </Table>
    </Box>
  );
}
