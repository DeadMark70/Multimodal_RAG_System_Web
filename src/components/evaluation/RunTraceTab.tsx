import {
  Badge,
  Box,
  Grid,
  GridItem,
  Heading,
  HStack,
  Stack,
  Text,
} from '@chakra-ui/react';
import RunContextSelector, { type EvaluationRunOption } from './RunContextSelector';
import RunTraceTree, { type RunTraceEvent } from './RunTraceTree';
import { formatOptionalTokens } from './evaluationDisplay';

interface LegacyStep {
  stepId: string;
  phase: string;
  title: string;
  status: string;
  durationMs?: number;
}

interface RunMetadata {
  questionId: string;
  mode: string;
  repeat: number;
  finalAnswerPreview?: string;
  retrievalSummary?: string;
  claimsSummary?: string;
  totalTokens?: number | null;
  accountingStatus?: 'complete' | 'partial' | 'not_available';
  accountingDiagnostics?: {
    observed_call_count: number;
    measured_call_count: number;
    missing_usage_call_count: number;
    unbalanced_call_count: number;
    unclassified_phase_call_count: number;
    missing_usage_by_phase?: Record<string, number>;
    missing_usage_by_purpose?: Record<string, number>;
    missing_usage_by_provider?: Record<string, number>;
  };
}

function LegacyTraceTree({ steps }: { steps: LegacyStep[] }) {
  return (
    <Box overflowX="auto">
      <HStack mb={3}>
        <Badge colorScheme="gray">legacy trace</Badge>
      </HStack>
      <Stack spacing={2}>
        {steps.map((step, index) => (
          <Box key={step.stepId} borderWidth="1px" borderRadius="md" px={3} py={2}>
            <HStack justify="space-between">
              <Text fontWeight="medium">{step.title}</Text>
              <Text fontSize="sm" color="text.secondary">
                {`${index + 1}. ${step.phase} - ${step.status}${step.durationMs ? ` - ${step.durationMs} ms` : ''}`}
              </Text>
            </HStack>
          </Box>
        ))}
      </Stack>
    </Box>
  );
}

export default function RunTraceTab({
  runOptions,
  selectedRunId,
  onSelectedRunIdChange,
  metadata,
  traceEvents,
  legacySteps,
}: {
  runOptions?: EvaluationRunOption[];
  selectedRunId?: string;
  onSelectedRunIdChange?: (runId: string) => void;
  metadata?: RunMetadata;
  traceEvents?: RunTraceEvent[];
  legacySteps?: LegacyStep[];
}) {
  return (
    <Stack spacing={4}>
      <RunContextSelector
        runOptions={runOptions}
        selectedRunId={selectedRunId}
        onSelectedRunIdChange={onSelectedRunIdChange}
      />

      {metadata ? (
        <Grid templateColumns={{ base: '1fr', xl: 'repeat(4, 1fr)' }} gap={3}>
          <GridItem borderWidth="1px" borderRadius="md" px={3} py={2}>
            <Heading size="xs" mb={2}>
              Answer
            </Heading>
            <Text fontSize="sm">{metadata.finalAnswerPreview ?? 'No answer preview.'}</Text>
          </GridItem>
          <GridItem borderWidth="1px" borderRadius="md" px={3} py={2}>
            <Heading size="xs" mb={2}>
              Retrieval
            </Heading>
            <Text fontSize="sm">{metadata.retrievalSummary ?? 'No retrieval summary.'}</Text>
          </GridItem>
          <GridItem borderWidth="1px" borderRadius="md" px={3} py={2}>
            <Heading size="xs" mb={2}>
              Claims
            </Heading>
            <Text fontSize="sm">{metadata.claimsSummary ?? 'No claim summary.'}</Text>
          </GridItem>
          <GridItem borderWidth="1px" borderRadius="md" px={3} py={2}>
            <Heading size="xs" mb={2}>
              Tokens
            </Heading>
            <Text fontSize="sm">{formatOptionalTokens(metadata.totalTokens)}</Text>
            <Text fontSize="xs" color="text.secondary">
              Accounting: {metadata.accountingStatus ?? 'not_available'}
            </Text>
            {metadata.accountingDiagnostics ? (
              <>
                <Text fontSize="xs" color="text.secondary">
                  {`Calls ${metadata.accountingDiagnostics.measured_call_count}/${metadata.accountingDiagnostics.observed_call_count}; missing usage ${metadata.accountingDiagnostics.missing_usage_call_count}; unbalanced ${metadata.accountingDiagnostics.unbalanced_call_count}; unclassified phase ${metadata.accountingDiagnostics.unclassified_phase_call_count}`}
                </Text>
                {Object.keys(metadata.accountingDiagnostics.missing_usage_by_phase ?? {}).length ? (
                  <Text fontSize="xs" color="text.secondary">
                    {`Missing by phase: ${Object.entries(metadata.accountingDiagnostics.missing_usage_by_phase ?? {}).map(([phase, count]) => `${phase}=${count}`).join(', ')}`}
                  </Text>
                ) : null}
              </>
            ) : null}
          </GridItem>
        </Grid>
      ) : null}

      {legacySteps?.length ? <LegacyTraceTree steps={legacySteps} /> : <RunTraceTree events={traceEvents} />}
    </Stack>
  );
}
