import { Badge, Box, Heading, Stack, Text } from '@chakra-ui/react';
import RouterDecisionCard, { type RouterDecision } from './RouterDecisionCard';

interface RouterLabData {
  analysisType: 'retrospective';
  decisions: RouterDecision[];
}

export interface ExecutionRouteView {
  route: string;
  decisionSource: string | null;
  routeReason: string | null;
  matchedRules: string[];
  candidateRoutes: string[];
  fallbackReason: string | null;
}

export default function RouterLabTab({ data, executionRoute }: {
  data?: RouterLabData;
  executionRoute?: ExecutionRouteView;
}) {
  if (!data && !executionRoute) {
    return <Text color="text.secondary">Router analysis and execution route are unavailable.</Text>;
  }

  return (
    <Stack spacing={4}>
      {executionRoute ? (
        <Box borderWidth="1px" borderRadius="md" p={3}>
          <Heading size="sm" mb={2}>Execution Route</Heading>
          <Stack spacing={1} fontSize="sm">
            <Text>Route: {executionRoute.route}</Text>
            {executionRoute.decisionSource ? <Text>Decision source: {executionRoute.decisionSource}</Text> : null}
            {executionRoute.routeReason ? <Text>Reason: {executionRoute.routeReason}</Text> : null}
            {executionRoute.matchedRules.length ? <Text>Matched rules: {executionRoute.matchedRules.join(', ')}</Text> : null}
            {executionRoute.candidateRoutes.length ? <Text>Candidate routes: {executionRoute.candidateRoutes.join(', ')}</Text> : null}
            {executionRoute.fallbackReason ? <Text>Fallback: {executionRoute.fallbackReason}</Text> : null}
          </Stack>
        </Box>
      ) : null}

      {data ? (
        <Box>
          <Heading size="sm" mb={2}>Retrospective Router Analysis</Heading>
          <Badge mb={3} colorScheme="yellow">{data.analysisType}</Badge>
          {data.decisions.length ? (
            <Stack spacing={3}>
              {data.decisions.map((decision) => (
                <RouterDecisionCard
                  key={decision.routingDecisionId}
                  decision={decision}
                />
              ))}
            </Stack>
          ) : (
            <Text color="text.secondary">No retrospective router decisions were recorded.</Text>
          )}
        </Box>
      ) : null}
    </Stack>
  );
}
