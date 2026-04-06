import { Box, Divider, Stack, Text, useColorModeValue } from '@chakra-ui/react';

import type { UseAgenticBenchmarkResearchReturn } from '../../hooks/useAgenticBenchmarkResearch';

interface BenchmarkResultTabProps {
  result: UseAgenticBenchmarkResearchReturn['result'];
}

export default function BenchmarkResultTab({ result }: BenchmarkResultTabProps) {
  const subTextColor = useColorModeValue('gray.500', 'gray.400');
  const sectionBg = useColorModeValue('gray.50', 'whiteAlpha.50');
  const emptyTextColor = useColorModeValue('gray.400', 'gray.500');

  if (!result) {
    return (
      <Box minH="220px" borderRadius="xl" bg={sectionBg} display="flex" alignItems="center" justifyContent="center">
        <Text color={emptyTextColor} fontSize="sm">
          尚未完成最終報告。
        </Text>
      </Box>
    );
  }

  return (
    <Stack spacing={5}>
      <Box>
        <Text fontSize="sm" textTransform="uppercase" letterSpacing="0.08em" color={subTextColor} mb={1}>
          最終結果
        </Text>
        <Text fontSize="lg" fontWeight="semibold">
          綜合回答與引用
        </Text>
      </Box>

      <Stack spacing={3}>
        <Text fontWeight="semibold">摘要</Text>
        <Text fontSize={{ base: 'md', lg: 'lg' }} whiteSpace="pre-wrap" lineHeight="1.9">
          {result.summary}
        </Text>
      </Stack>

      <Divider />

      <Stack spacing={3}>
        <Text fontWeight="semibold">詳細回答</Text>
        <Text fontSize={{ base: 'md', lg: 'lg' }} whiteSpace="pre-wrap" lineHeight="1.9">
          {result.detailed_answer}
        </Text>
      </Stack>

      {result.sub_tasks.length > 0 && (
        <>
          <Divider />
          <Stack spacing={3}>
            <Text fontWeight="semibold">子任務結果</Text>
            <Stack spacing={3}>
              {result.sub_tasks.map((task) => (
                <Box key={`${task.iteration}-${task.id}`} p={4} borderRadius="xl" bg={sectionBg}>
                  <Text fontSize="xs" color={subTextColor} mb={1}>
                    任務 #{task.id} · Iteration {task.iteration}
                  </Text>
                  <Text fontSize="sm" fontWeight="semibold" mb={2}>
                    {task.question}
                  </Text>
                  <Text fontSize={{ base: 'md', lg: 'lg' }} whiteSpace="pre-wrap" lineHeight="1.9">
                    {task.answer}
                  </Text>
                </Box>
              ))}
            </Stack>
          </Stack>
        </>
      )}

      {result.all_sources.length > 0 && (
        <>
          <Divider />
          <Stack spacing={3}>
            <Text fontWeight="semibold">引用來源</Text>
            <Stack spacing={1}>
              {result.all_sources.map((source, index) => (
                <Text key={`${source}-${index}`} fontSize={{ base: 'md', lg: 'lg' }} color={subTextColor} lineHeight="1.8">
                  {index + 1}. {source}
                </Text>
              ))}
            </Stack>
          </Stack>
        </>
      )}
    </Stack>
  );
}
