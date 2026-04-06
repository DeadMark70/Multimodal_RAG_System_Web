import { Box, Stack, Text, useColorModeValue } from '@chakra-ui/react';

import type { UseAgenticBenchmarkResearchReturn } from '../../hooks/useAgenticBenchmarkResearch';
import TraceStepCard from '../trace/TraceStepCard';

interface BenchmarkTraceTabProps {
  traceSteps: UseAgenticBenchmarkResearchReturn['traceSteps'];
}

export default function BenchmarkTraceTab({ traceSteps }: BenchmarkTraceTabProps) {
  const subTextColor = useColorModeValue('gray.500', 'gray.400');
  const emptyBg = useColorModeValue('gray.50', 'whiteAlpha.50');
  const emptyTextColor = useColorModeValue('gray.400', 'gray.500');

  return (
    <Stack spacing={5}>
      <Box>
        <Text fontSize="sm" textTransform="uppercase" letterSpacing="0.08em" color={subTextColor} mb={1}>
          Trace 追蹤
        </Text>
        <Text fontSize="lg" fontWeight="semibold">
          推理與工具調用
        </Text>
      </Box>

      {traceSteps.length === 0 ? (
        <Box minH="220px" borderRadius="xl" bg={emptyBg} display="flex" alignItems="center" justifyContent="center">
          <Text color={emptyTextColor} fontSize="sm">
            尚無 trace step。
          </Text>
        </Box>
      ) : (
        <Stack spacing={3}>
          {traceSteps.map((step) => (
            <TraceStepCard key={step.step_id} step={step} background="transparent" />
          ))}
        </Stack>
      )}
    </Stack>
  );
}
