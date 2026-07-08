import { Box, Grid, GridItem, Table, Tbody, Td, Text, Th, Thead, Tr } from '@chakra-ui/react';

export interface EvidenceCoverageRow {
  atomicFactId: string;
  factText: string;
  retrieved: boolean;
  packed: boolean;
  mentioned: boolean;
  cited: boolean;
  status: string;
}

const yesNo = (value: boolean) => (value ? 'yes' : 'no');

export default function EvidenceCoveragePanel({ coverage }: { coverage?: EvidenceCoverageRow[] }) {
  if (!coverage?.length) {
    return <Text color="text.secondary">No evidence coverage rows are available for this run.</Text>;
  }

  const totals = {
    retrieved: coverage.filter((row) => row.retrieved).length,
    packed: coverage.filter((row) => row.packed).length,
    mentioned: coverage.filter((row) => row.mentioned).length,
    cited: coverage.filter((row) => row.cited).length,
  };

  return (
    <Box>
      <Grid templateColumns={{ base: 'repeat(2, 1fr)', xl: 'repeat(4, 1fr)' }} gap={3} mb={3}>
        <GridItem borderWidth="1px" borderRadius="md" px={3} py={2}>
          <Text fontSize="xs" textTransform="uppercase" color="text.secondary">
            Retrieved
          </Text>
          <Text fontSize="lg" fontWeight="semibold">
            {totals.retrieved}
          </Text>
        </GridItem>
        <GridItem borderWidth="1px" borderRadius="md" px={3} py={2}>
          <Text fontSize="xs" textTransform="uppercase" color="text.secondary">
            Packed
          </Text>
          <Text fontSize="lg" fontWeight="semibold">
            {totals.packed}
          </Text>
        </GridItem>
        <GridItem borderWidth="1px" borderRadius="md" px={3} py={2}>
          <Text fontSize="xs" textTransform="uppercase" color="text.secondary">
            Mentioned
          </Text>
          <Text fontSize="lg" fontWeight="semibold">
            {totals.mentioned}
          </Text>
        </GridItem>
        <GridItem borderWidth="1px" borderRadius="md" px={3} py={2}>
          <Text fontSize="xs" textTransform="uppercase" color="text.secondary">
            Cited
          </Text>
          <Text fontSize="lg" fontWeight="semibold">
            {totals.cited}
          </Text>
        </GridItem>
      </Grid>

      <Box overflowX="auto">
        <Table size="sm">
          <Thead>
            <Tr>
              <Th>Atomic Fact</Th>
              <Th>Retrieved</Th>
              <Th>Packed</Th>
              <Th>Mentioned</Th>
              <Th>Cited</Th>
              <Th>Status</Th>
            </Tr>
          </Thead>
          <Tbody>
            {coverage.map((row) => (
              <Tr key={row.atomicFactId}>
                <Td>
                  <Text fontWeight="medium">{row.atomicFactId}</Text>
                  <Text fontSize="sm" color="text.secondary">
                    {row.factText}
                  </Text>
                </Td>
                <Td>{yesNo(row.retrieved)}</Td>
                <Td>{yesNo(row.packed)}</Td>
                <Td>{yesNo(row.mentioned)}</Td>
                <Td>{yesNo(row.cited)}</Td>
                <Td>{row.status}</Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </Box>
    </Box>
  );
}
