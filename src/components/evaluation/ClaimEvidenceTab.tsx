import { Box, Heading, ListItem, Stack, Text, UnorderedList } from '@chakra-ui/react';
import ClaimEvidenceTable, { type ClaimRow } from './ClaimEvidenceTable';

export default function ClaimEvidenceTab({
  claims,
  unsupportedReasons,
}: {
  claims?: ClaimRow[];
  unsupportedReasons?: string[];
}) {
  if (!claims?.length && !unsupportedReasons?.length) {
    return <Text color="text.secondary">Claim-evidence alignment will appear after claim extraction is available.</Text>;
  }

  return (
    <Stack spacing={4}>
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
