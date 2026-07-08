import { Badge, Box, Grid, GridItem, Text } from '@chakra-ui/react';

export interface RouterDecision {
  selectedMode: string;
  tier: string;
  complexity: string;
  routingReason: string;
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
            Selected Mode
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
