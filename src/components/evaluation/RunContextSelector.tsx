import { Grid, GridItem, Select, Text } from '@chakra-ui/react';

export interface EvaluationRunOption {
  runId: string;
  campaignId: string;
  questionId: string;
  mode: string;
  repeat: number;
  conditionId?: string | null;
  executionProfile?: string | null;
  agenticExecutionVersion?: 'v8' | 'v9';
  responseStatus?: string | null;
}

function displayMode(option: EvaluationRunOption): string {
  const isAgentic = option.mode === 'agentic' || option.mode.startsWith('agentic-');
  if (!isAgentic) {
    return option.mode;
  }

  const isShadow = option.executionProfile === 'shadow' || option.mode === 'agentic-v9-shadow';
  const version = option.agenticExecutionVersion ?? (option.mode.includes('v9') ? 'v9' : 'v8');
  return `Agentic ${version}${isShadow ? ' shadow' : ''}`;
}

export default function RunContextSelector({
  runOptions,
  selectedRunId,
  onSelectedRunIdChange,
}: {
  runOptions?: EvaluationRunOption[];
  selectedRunId?: string;
  onSelectedRunIdChange?: (runId: string) => void;
}) {
  const selectedRun = runOptions?.find((option) => option.runId === selectedRunId) ?? runOptions?.[0];

  return (
    <Grid templateColumns={{ base: '1fr', xl: 'repeat(4, 1fr)' }} gap={3}>
      <GridItem>
        <Text fontSize="sm" mb={1}>Run</Text>
        <Select
          size="sm"
          value={selectedRun?.runId ?? ''}
          onChange={(event) => onSelectedRunIdChange?.(event.target.value)}
          aria-label="Run selector"
          isDisabled={!runOptions?.length || !onSelectedRunIdChange}
        >
          {runOptions?.length ? runOptions.map((option) => (
            <option key={option.runId} value={option.runId}>
              {`${option.questionId} · ${displayMode(option)} · repeat ${option.repeat}`}
            </option>
          )) : <option value="">No runs available</option>}
        </Select>
      </GridItem>
      <GridItem>
        <Text fontSize="sm" mb={1}>Question</Text>
        <Select size="sm" value={selectedRun?.questionId ?? ''} isDisabled aria-label="Question identity">
          <option value={selectedRun?.questionId ?? ''}>{selectedRun?.questionId ?? 'n/a'}</option>
        </Select>
      </GridItem>
      <GridItem>
        <Text fontSize="sm" mb={1}>Mode</Text>
        <Select size="sm" value={selectedRun?.mode ?? ''} isDisabled aria-label="Mode identity">
          <option value={selectedRun?.mode ?? ''}>{selectedRun?.mode ?? 'n/a'}</option>
        </Select>
      </GridItem>
      <GridItem>
        <Text fontSize="sm" mb={1}>Repeat</Text>
        <Select size="sm" value={String(selectedRun?.repeat ?? '')} isDisabled aria-label="Repeat identity">
          <option value={String(selectedRun?.repeat ?? '')}>{selectedRun?.repeat ?? 'n/a'}</option>
        </Select>
      </GridItem>
    </Grid>
  );
}
