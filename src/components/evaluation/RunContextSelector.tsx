import { Grid, GridItem, Select, Text } from '@chakra-ui/react';

export interface EvaluationRunOption {
  runId: string;
  campaignId: string;
  questionId: string;
  mode: string;
  repeat: number;
  conditionId?: string | null;
  executionProfile?: string | null;
  agenticExecutionVersion?: 'v8' | 'v9' | 'v10';
  responseStatus?: string | null;
}

function displayMode(option: EvaluationRunOption): string {
  const isAgentic = option.mode === 'agentic' || option.mode.startsWith('agentic-') || option.mode === 'v8' || option.mode === 'v9' || option.mode === 'v10';
  if (!isAgentic) {
    return option.mode;
  }

  const isShadow = option.executionProfile === 'shadow' || option.mode === 'agentic-v9-shadow';
  const version = option.agenticExecutionVersion ?? (option.mode.includes('v10') ? 'v10' : option.mode.includes('v9') ? 'v9' : 'v8');
  return `Agentic ${version}${isShadow ? ' shadow' : ''}`;
}

const conditionKey = (option: EvaluationRunOption) => JSON.stringify([
  option.mode, option.conditionId ?? null, option.executionProfile ?? null, option.agenticExecutionVersion ?? null,
]);

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
  const questionIds = [...new Set(runOptions?.map((option) => option.questionId) ?? [])]
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  const questionRuns = (runOptions ?? []).filter((option) => option.questionId === selectedRun?.questionId)
    .sort((a, b) => displayMode(a).localeCompare(displayMode(b), undefined, { numeric: true })
      || a.repeat - b.repeat || a.runId.localeCompare(b.runId));
  const conditions = [...new Map(questionRuns.map((option) => [conditionKey(option), option])).values()];
  const conditionRuns = questionRuns.filter((option) => selectedRun && conditionKey(option) === conditionKey(selectedRun));
  const selectQuestion = (questionId: string) => {
    const candidates = (runOptions ?? []).filter((option) => option.questionId === questionId);
    // Preserve the experiment condition and repeat when that run is already loaded.
    const sameCondition = candidates.filter((option) => selectedRun && conditionKey(option) === conditionKey(selectedRun));
    const next = sameCondition.find((option) => option.repeat === selectedRun?.repeat)
      ?? sameCondition[0] ?? candidates[0];
    if (next) onSelectedRunIdChange?.(next.runId);
  };

  return (
    <Grid templateColumns={{ base: '1fr', md: 'minmax(0, 1fr) minmax(0, 2fr) minmax(0, 1fr)' }} gap={3}>
      <GridItem minW={0}>
        <Text fontSize="sm" mb={1}>Question</Text>
        <Select size="sm" value={selectedRun?.questionId ?? ''} aria-label="Question selector"
          isDisabled={!questionIds.length || !onSelectedRunIdChange}
          onChange={(event) => selectQuestion(event.target.value)}>
          {questionIds.length ? questionIds.map((questionId) => <option key={questionId} value={questionId}>{questionId}</option>)
            : <option value="">No questions available</option>}
        </Select>
      </GridItem>
      <GridItem minW={0}>
        <Text fontSize="sm" mb={1}>模式／實驗條件</Text>
        <Select size="sm" aria-label="Mode selector" value={conditions.find((option) => selectedRun && conditionKey(option) === conditionKey(selectedRun))?.runId ?? ''}
          isDisabled={!conditions.length || !onSelectedRunIdChange}
          onChange={(event) => {
            const condition = conditions.find((option) => option.runId === event.target.value);
            const candidates = questionRuns.filter((option) => condition && conditionKey(option) === conditionKey(condition));
            const next = candidates.find((option) => option.repeat === selectedRun?.repeat) ?? candidates[0];
            if (next) onSelectedRunIdChange?.(next.runId);
          }}>
          {conditions.length ? conditions.map((option) => <option key={conditionKey(option)} value={option.runId}>
            {displayMode(option)}{option.conditionId ? ` · ${option.conditionId}` : ''}{option.executionProfile && option.executionProfile !== 'shadow' ? ` · ${option.executionProfile}` : ''}
          </option>) : <option value="">No modes available</option>}
        </Select>
      </GridItem>
      <GridItem minW={0}>
        <Text fontSize="sm" mb={1}>執行次數</Text>
        {conditionRuns.length === 1 ? <Text py={1} fontSize="sm">第 {conditionRuns[0].repeat} 次</Text> :
        <Select
          size="sm"
          value={selectedRun?.runId ?? ''}
          onChange={(event) => onSelectedRunIdChange?.(event.target.value)}
          aria-label="Repeat selector"
          isDisabled={!conditionRuns.length || !onSelectedRunIdChange}
        >
          {conditionRuns.length ? conditionRuns.map((option) => (
            <option key={option.runId} value={option.runId}>
              {`第 ${option.repeat} 次`}{conditionRuns.filter((run) => run.repeat === option.repeat).length > 1 ? ` · ${option.runId}` : ''}
            </option>
          )) : <option value="">No runs available</option>}
        </Select>}
      </GridItem>
      <GridItem colSpan={{ base: 1, md: 3 }}>
        <Text fontSize="xs" color="text.secondary">先選題目、模式，再選第幾次執行；選單只列出已載入的作答紀錄，未列出不代表整批沒有該紀錄。切換時優先保留原本條件與次數，若尚未載入則選擇可用紀錄。</Text>
      </GridItem>
    </Grid>
  );
}
