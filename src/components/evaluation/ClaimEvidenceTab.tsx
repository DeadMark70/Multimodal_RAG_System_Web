import { Box, Heading, ListItem, Stack, Text, UnorderedList } from '@chakra-ui/react';
import ClaimEvidenceTable, { type ClaimRow } from './ClaimEvidenceTable';
import RunContextSelector, { type EvaluationRunOption } from './RunContextSelector';

export default function ClaimEvidenceTab({
  runOptions,
  selectedRunId,
  onSelectedRunIdChange,
  claims,
  unsupportedReasons,
}: {
  runOptions?: EvaluationRunOption[];
  selectedRunId?: string;
  onSelectedRunIdChange?: (runId: string) => void;
  claims?: ClaimRow[];
  unsupportedReasons?: string[];
}) {
  if (!claims?.length && !unsupportedReasons?.length) {
    return (
      <Stack spacing={4}>
        <RunContextSelector
          runOptions={runOptions}
          selectedRunId={selectedRunId}
          onSelectedRunIdChange={onSelectedRunIdChange}
        />
        <Text color="text.secondary">Claim-evidence alignment will appear after claim extraction is available.</Text>
      </Stack>
    );
  }

  return (
    <Stack spacing={4}>
      <RunContextSelector
        runOptions={runOptions}
        selectedRunId={selectedRunId}
        onSelectedRunIdChange={onSelectedRunIdChange}
      />
      <Box>
        <Heading size="sm" mb={3}>
          Claim Alignment
        </Heading>
        <ClaimEvidenceTable claims={claims} />
      </Box>
      <Box>
        <Heading size="sm" mb={3}>
          Unsupported Reasons
        </Heading>
        <UnorderedList ml={5}>
          {(unsupportedReasons ?? []).map((reason) => (
            <ListItem key={reason}>{reason}</ListItem>
          ))}
        </UnorderedList>
      </Box>
    </Stack>
  );
}
