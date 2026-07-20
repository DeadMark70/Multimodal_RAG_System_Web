import { Badge, Box, Heading, Stack, Text } from '@chakra-ui/react';
import EvidenceCoveragePanel, { type EvidenceCoverageRow } from './EvidenceCoveragePanel';
import RetrievedChunksTable, { type RetrievedChunkRow } from './RetrievedChunksTable';
import RunContextSelector, { type EvaluationRunOption } from './RunContextSelector';

interface RetrievalQueryRow {
  queryLabel: string;
  queryText: string;
}

export default function RetrievalEvidenceTab({
  runOptions,
  selectedRunId,
  onSelectedRunIdChange,
  retrievals,
  chunks,
  coverage,
  coverageStatus,
  graph,
}: {
  runOptions?: EvaluationRunOption[];
  selectedRunId?: string;
  onSelectedRunIdChange?: (runId: string) => void;
  retrievals?: RetrievalQueryRow[];
  chunks?: RetrievedChunkRow[];
  coverage?: EvidenceCoverageRow[];
  coverageStatus?: string;
  graph?: {
    status: 'recorded' | 'fallback' | 'not_instrumented';
    events: Array<Record<string, unknown>>;
    evidenceItems: Array<Record<string, unknown>>;
  };
}) {
  return (
    <Stack spacing={4}>
      <RunContextSelector
        runOptions={runOptions}
        selectedRunId={selectedRunId}
        onSelectedRunIdChange={onSelectedRunIdChange}
      />
      {!retrievals?.length && !chunks?.length && !coverage?.length ? (
        <Text color="text.secondary">Retrieval evidence will appear after a run records chunk-level details.</Text>
      ) : null}
      {retrievals?.length || chunks?.length || coverage?.length ? (
        <>
      <Box>
        <Heading size="sm" mb={3}>
          Queries
        </Heading>
        <Stack spacing={2}>
          {(retrievals ?? []).map((retrieval) => (
            <Box key={retrieval.queryText} borderWidth="1px" borderRadius="md" px={3} py={2}>
              <Text fontSize="xs" textTransform="uppercase" color="text.secondary">
                {retrieval.queryLabel}
              </Text>
              <Text>{retrieval.queryText}</Text>
            </Box>
          ))}
        </Stack>
      </Box>

      <Box>
        <Heading size="sm" mb={3}>
          Retrieved Chunks
        </Heading>
        <RetrievedChunksTable chunks={chunks} />
      </Box>

      <Box>
        <Heading size="sm" mb={3}>
          Evidence Coverage
        </Heading>
        <EvidenceCoveragePanel coverage={coverage} coverageStatus={coverageStatus} />
      </Box>
        </>
      ) : null}
      <Box borderWidth="1px" borderRadius="md" px={3} py={3}>
        <Heading size="sm" mb={2}>Graph observability</Heading>
        <Badge colorScheme={graph?.status === 'recorded' ? 'green' : graph?.status === 'fallback' ? 'orange' : 'gray'}>
          {graph?.status ?? 'not_instrumented'}
        </Badge>
        {graph?.status === 'recorded' ? (
          <Text mt={2} fontSize="sm">
            {`${graph.events.length} graph event(s), ${graph.evidenceItems.length} graph evidence item(s) recorded.`}
          </Text>
        ) : graph?.status === 'fallback' ? (
          <Text mt={2} fontSize="sm">Graph route recorded a fallback reason; no graph traversal event was persisted.</Text>
        ) : (
          <Text mt={2} fontSize="sm" color="text.secondary">Graph traversal is not instrumented for this run; mode alone is not evidence of traversal.</Text>
        )}
      </Box>
    </Stack>
  );
}
