import { Box, Stat, StatHelpText, StatLabel, StatNumber } from '@chakra-ui/react';

interface MetricCardProps {
  label: string;
  value: string;
  helper?: string;
}

export default function MetricCard({ label, value, helper }: MetricCardProps) {
  return (
    <Box borderWidth="1px" borderColor="border.subtle" borderRadius="md" px={3} py={2} minH="96px">
      <Stat>
        <StatLabel color="text.secondary" fontSize="xs" textTransform="uppercase">
          {label}
        </StatLabel>
        <StatNumber fontSize="lg">{value}</StatNumber>
        {helper ? <StatHelpText mb={0}>{helper}</StatHelpText> : null}
      </Stat>
    </Box>
  );
}
