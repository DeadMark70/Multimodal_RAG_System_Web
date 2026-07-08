import { Box, Heading, Stack, Text } from '@chakra-ui/react';
import EvidenceCoveragePanel, { type EvidenceCoverageRow } from './EvidenceCoveragePanel';
import RetrievedChunksTable, { type RetrievedChunkRow } from './RetrievedChunksTable';

interface RetrievalQueryRow {
  queryLabel: string;
  queryText: string;
}

export default function RetrievalEvidenceTab({
  retrievals,
  chunks,
  coverage,
}: {
  retrievals?: RetrievalQueryRow[];
  chunks?: RetrievedChunkRow[];
  coverage?: EvidenceCoverageRow[];
}) {
  if (!retrievals?.length && !chunks?.length && !coverage?.length) {
    return <Text color="text.secondary">Retrieval evidence will appear after a run records chunk-level details.</Text>;
  }

  return (
    <Stack spacing={4}>
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
        <EvidenceCoveragePanel coverage={coverage} />
      </Box>
    </Stack>
  );
}
