import {
  Badge,
  Box,
  Grid,
  GridItem,
  Heading,
  HStack,
  Select,
  Stack,
  Text,
} from '@chakra-ui/react';
import { useMemo } from 'react';
import RunTraceTree, { type RunTraceEvent } from './RunTraceTree';
import { formatOptionalTokens } from './evaluationDisplay';

interface LegacyStep {
  stepId: string;
  phase: string;
  title: string;
  status: string;
  durationMs?: number;
}

interface RunOption {
  runId: string;
  campaignId: string;
  questionId: string;
  mode: string;
  repeat: number;
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
  runOptions?: RunOption[];
  selectedRunId?: string;
  onSelectedRunIdChange?: (runId: string) => void;
  metadata?: RunMetadata;
  traceEvents?: RunTraceEvent[];
  legacySteps?: LegacyStep[];
}) {
  const selectedRun = useMemo(
    () => runOptions?.find((option) => option.runId === selectedRunId) ?? runOptions?.[0],
    [runOptions, selectedRunId]
  );

  return (
    <Stack spacing={4}>
      <Grid templateColumns={{ base: '1fr', xl: 'repeat(4, 1fr)' }} gap={3}>
        <GridItem>
          <Text fontSize="sm" mb={1}>
            Run
          </Text>
          <Select
            size="sm"
            value={selectedRun?.runId ?? ''}
            onChange={(event) => onSelectedRunIdChange?.(event.target.value)}
            aria-label="Run selector"
            isDisabled={!runOptions?.length || !onSelectedRunIdChange}
          >
            {runOptions?.length ? (
              runOptions.map((option) => (
                <option key={option.runId} value={option.runId}>
                  {`${option.questionId} · ${option.mode} · repeat ${option.repeat}`}
                </option>
              ))
            ) : (
              <option value="">No runs available</option>
            )}
          </Select>
        </GridItem>
        <GridItem>
          <Text fontSize="sm" mb={1}>
            Question
          </Text>
          <Select size="sm" value={selectedRun?.questionId ?? ''} isDisabled aria-label="Question identity">
            <option value={selectedRun?.questionId ?? ''}>{selectedRun?.questionId ?? 'n/a'}</option>
          </Select>
        </GridItem>
        <GridItem>
          <Text fontSize="sm" mb={1}>
            Mode
          </Text>
          <Select size="sm" value={selectedRun?.mode ?? ''} isDisabled aria-label="Mode identity">
            <option value={selectedRun?.mode ?? ''}>{selectedRun?.mode ?? 'n/a'}</option>
          </Select>
        </GridItem>
        <GridItem>
          <Text fontSize="sm" mb={1}>
            Repeat
          </Text>
          <Select size="sm" value={String(selectedRun?.repeat ?? '')} isDisabled aria-label="Repeat identity">
            <option value={String(selectedRun?.repeat ?? '')}>{selectedRun?.repeat ?? 'n/a'}</option>
          </Select>
        </GridItem>
      </Grid>

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
          </GridItem>
        </Grid>
      ) : null}

      {legacySteps?.length ? <LegacyTraceTree steps={legacySteps} /> : <RunTraceTree events={traceEvents} />}
    </Stack>
  );
}
