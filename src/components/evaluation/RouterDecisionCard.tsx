import { Box, Grid, GridItem, Text } from '@chakra-ui/react';

export interface RouterDecision {
  routingDecisionId: string;
  runId: string;
  campaignId: string;
  questionId: string;
  repeat: number;
  spanId: string | null;
  selectedMode: string;
  decisionSource: string | null;
  candidateRoutes: string[];
  matchedRules: string[];
  fallbackReason: string | null;
  confidence: number | null;
  reason: string | null;
  createdAt: string;
}

export default function RouterDecisionCard({
  decision,
}: {
  decision: RouterDecision;
}) {
  return (
    <Box borderWidth="1px" borderColor="border.subtle" borderRadius="md" p={3}>
      <Grid templateColumns={{ base: '1fr', md: 'repeat(3, 1fr)' }} gap={3}>
        <GridItem>
          <Text fontSize="xs" textTransform="uppercase" color="text.secondary">
            Source
          </Text>
          <Text fontWeight="semibold">
            {decision.questionId} · {decision.runId} · repeat {decision.repeat}
          </Text>
        </GridItem>
        <GridItem>
          <Text fontSize="xs" textTransform="uppercase" color="text.secondary">
            Retrospective selected mode
          </Text>
          <Text fontWeight="semibold">{decision.selectedMode}</Text>
        </GridItem>
        {decision.decisionSource ? <GridItem>
          <Text fontSize="xs" textTransform="uppercase" color="text.secondary">
            Decision source
          </Text>
          <Text>{decision.decisionSource}</Text>
        </GridItem> : null}
        {decision.confidence != null ? <GridItem>
          <Text fontSize="xs" textTransform="uppercase" color="text.secondary">
            Confidence
          </Text>
          <Text>{decision.confidence}</Text>
        </GridItem> : null}
        {decision.matchedRules.length ? <GridItem>
          <Text fontSize="xs" textTransform="uppercase" color="text.secondary">
            Matched rules
          </Text>
          <Text>{decision.matchedRules.join(', ')}</Text>
        </GridItem> : null}
        {decision.candidateRoutes.length ? <GridItem>
          <Text>Candidate routes: {decision.candidateRoutes.join(', ')}</Text>
        </GridItem> : null}
      </Grid>
      {decision.reason ? <Box mt={3}>
        <Text fontSize="xs" textTransform="uppercase" color="text.secondary">
          Reason
        </Text>
        <Text>{decision.reason}</Text>
      </Box> : null}
      {decision.fallbackReason ? <Text mt={3}>Fallback: {decision.fallbackReason}</Text> : null}
    </Box>
  );
}
