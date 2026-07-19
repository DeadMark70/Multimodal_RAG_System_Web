import { Box, Table, Tbody, Td, Text, Th, Thead, Tr } from '@chakra-ui/react';
import { formatOptionalNumber } from './evaluationDisplay';

export interface RetrievedChunkRow {
  rank: number;
  docId: string;
  page: string;
  modality: string;
  denseScore: number | null;
  bm25Score: number | null;
  rerankScore: number | null;
  inContext: boolean;
  usedInAnswer: boolean;
  goldMatch: boolean;
  excerpt?: string;
}

const yesNo = (value: boolean) => (value ? 'yes' : 'no');

export default function RetrievedChunksTable({ chunks }: { chunks?: RetrievedChunkRow[] }) {
  if (!chunks?.length) {
    return <Text color="text.secondary">No retrieved chunks were recorded for this run.</Text>;
  }

  return (
    <Box overflowX="auto">
      <Table size="sm">
        <Thead>
          <Tr>
            <Th isNumeric>Rank</Th>
            <Th>Doc</Th>
            <Th>Page</Th>
            <Th>Modality</Th>
            <Th isNumeric>Dense</Th>
            <Th isNumeric>BM25</Th>
            <Th isNumeric>Rerank</Th>
            <Th>In Context</Th>
            <Th>Used In Answer</Th>
            <Th>Gold Match</Th>
          </Tr>
        </Thead>
        <Tbody>
          {chunks.map((chunk) => (
            <Tr key={`${chunk.docId}-${chunk.rank}`}>
              <Td isNumeric>{chunk.rank}</Td>
              <Td fontWeight="medium">{chunk.docId}</Td>
              <Td>{chunk.page}</Td>
              <Td>{chunk.modality}</Td>
              <Td isNumeric>{formatOptionalNumber(chunk.denseScore, 2)}</Td>
              <Td isNumeric>{formatOptionalNumber(chunk.bm25Score, 1)}</Td>
              <Td isNumeric>{formatOptionalNumber(chunk.rerankScore, 2)}</Td>
              <Td>{yesNo(chunk.inContext)}</Td>
              <Td>{yesNo(chunk.usedInAnswer)}</Td>
              <Td>{yesNo(chunk.goldMatch)}</Td>
            </Tr>
          ))}
        </Tbody>
      </Table>
    </Box>
  );
}
