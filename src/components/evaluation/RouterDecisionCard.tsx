import { Badge, Box, Grid, GridItem, Text } from '@chakra-ui/react';

export interface RouterDecision {
  selectedMode: string;
  tier: string;
  complexity: string;
  routingReason: string;
  questionId?: string;
  runId?: string;
  repeat?: number | null;
}

export default function RouterDecisionCard({
  decision,
  analysisType,
}: {
  decision: RouterDecision;
  analysisType: string;
}) {
  return (
    <Box borderWidth="1px" borderColor="border.subtle" borderRadius="md" p={3}>
      <Grid templateColumns={{ base: '1fr', md: 'repeat(4, 1fr)' }} gap={3}>
        <GridItem>
          <Text fontSize="xs" textTransform="uppercase" color="text.secondary">
            Source
          </Text>
          <Text fontWeight="semibold">
            {decision.questionId ?? 'n/a'}{decision.runId ? ` · ${decision.runId}` : ''}
            {decision.repeat != null ? ` · repeat ${decision.repeat}` : ''}
          </Text>
        </GridItem>
        <GridItem>
          <Text fontSize="xs" textTransform="uppercase" color="text.secondary">
            {analysisType === 'actual' ? 'Selected Mode' : 'Retrospective best-mode observation'}
          </Text>
          <Text fontWeight="semibold">{decision.selectedMode}</Text>
        </GridItem>
        <GridItem>
          <Text fontSize="xs" textTransform="uppercase" color="text.secondary">
            Tier
          </Text>
          <Text fontWeight="semibold">{decision.tier}</Text>
        </GridItem>
        <GridItem>
          <Text fontSize="xs" textTransform="uppercase" color="text.secondary">
            Complexity
          </Text>
          <Text fontWeight="semibold">{decision.complexity}</Text>
        </GridItem>
        <GridItem>
          <Text fontSize="xs" textTransform="uppercase" color="text.secondary">
            Analysis
          </Text>
          <Badge colorScheme={analysisType === 'actual' ? 'green' : 'yellow'}>{analysisType}</Badge>
        </GridItem>
      </Grid>
      <Box mt={3}>
        <Text fontSize="xs" textTransform="uppercase" color="text.secondary">
          Routing Reason
        </Text>
        <Text>{decision.routingReason}</Text>
      </Box>
    </Box>
  );
}
