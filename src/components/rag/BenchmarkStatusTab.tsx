import {
  Badge,
  Box,
  Divider,
  Flex,
  HStack,
  Stack,
  Text,
  VStack,
  useColorModeValue,
} from '@chakra-ui/react';
import { FiCheckCircle, FiClock, FiPlayCircle, FiXCircle } from 'react-icons/fi';

import type { UseAgenticBenchmarkResearchReturn } from '../../hooks/useAgenticBenchmarkResearch';

interface BenchmarkStatusTabProps {
  progress: UseAgenticBenchmarkResearchReturn['progress'];
  evaluationUpdates: UseAgenticBenchmarkResearchReturn['evaluationUpdates'];
}

function taskStatusColor(status: 'pending' | 'running' | 'done' | 'error'): string {
  switch (status) {
    case 'running':
      return 'blue';
    case 'done':
      return 'green';
    case 'error':
      return 'red';
    default:
      return 'gray';
  }
}

function taskStatusIcon(status: 'pending' | 'running' | 'done' | 'error') {
  switch (status) {
    case 'done':
      return FiCheckCircle;
    case 'running':
      return FiClock;
    case 'error':
      return FiXCircle;
    default:
      return FiPlayCircle;
  }
}

export default function BenchmarkStatusTab({
  progress,
  evaluationUpdates,
}: BenchmarkStatusTabProps) {
  const timelineLineColor = useColorModeValue('gray.200', 'whiteAlpha.300');
  const subTextColor = useColorModeValue('gray.500', 'gray.400');
  const cardBg = useColorModeValue('gray.50', 'whiteAlpha.50');
  const sectionBg = useColorModeValue('white', 'whiteAlpha.50');
  const emptyTextColor = useColorModeValue('gray.400', 'gray.500');
  const lineHeight = progress.length > 1 ? `${Math.max((progress.length - 1) * 108, 72)}px` : '72px';

  const orderedProgress = [...progress].sort((a, b) =>
    a.iteration === b.iteration ? a.id - b.id : a.iteration - b.iteration
  );

  return (
    <Stack spacing={6}>
      <Box>
        <Text fontSize="sm" textTransform="uppercase" letterSpacing="0.08em" color={subTextColor} mb={1}>
          執行狀態
        </Text>
        <Text fontSize="lg" fontWeight="semibold">
          任務時間軸
        </Text>
      </Box>

      {orderedProgress.length === 0 ? (
        <Flex
          minH="220px"
          borderRadius="xl"
          align="center"
          justify="center"
          bg={cardBg}
          px={6}
          textAlign="center"
        >
          <Text color={emptyTextColor} fontSize="sm">
            等待計畫建立或任務啟動。
          </Text>
        </Flex>
      ) : (
        <Box position="relative" pl={2}>
          <Box
            position="absolute"
            left="14px"
            top="14px"
            w="2px"
            h={lineHeight}
            bg={timelineLineColor}
            borderRadius="full"
          />
          <Stack spacing={5}>
            {orderedProgress.map((task) => {
              const StatusIcon = taskStatusIcon(task.status);
              const isDrilldown = task.iteration > 0;

              return (
                <HStack key={`${task.iteration}-${task.id}`} align="stretch" spacing={4}>
                  <Flex
                    position="relative"
                    zIndex={1}
                    w="32px"
                    align="start"
                    justify="center"
                    pt={1}
                    flexShrink={0}
                  >
                    <Flex
                      w="28px"
                      h="28px"
                      borderRadius="full"
                      bg={cardBg}
                      border="1px solid"
                      borderColor={timelineLineColor}
                      align="center"
                      justify="center"
                      color={`${taskStatusColor(task.status)}.500`}
                    >
                      <StatusIcon size={14} />
                    </Flex>
                  </Flex>

                  <Box
                    flex={1}
                    minW={0}
                    pb={4}
                    borderBottom="1px solid"
                    borderColor={timelineLineColor}
                  >
                    <HStack justify="space-between" align="start" spacing={3} mb={2}>
                      <VStack align="start" spacing={1} minW={0}>
                        <HStack spacing={2} wrap="wrap">
                          <Badge
                            colorScheme={isDrilldown ? 'orange' : 'gray'}
                            variant="subtle"
                            px={2}
                            py={0.5}
                            borderRadius="full"
                          >
                            {isDrilldown ? `Drill-down ${task.iteration}` : 'Main'}
                          </Badge>
                          <Badge
                            colorScheme={taskStatusColor(task.status)}
                            variant="subtle"
                            px={2}
                            py={0.5}
                            borderRadius="full"
                          >
                            {task.status}
                          </Badge>
                        </HStack>
                        <Text fontSize="sm" fontWeight="semibold" color="inherit" noOfLines={2}>
                          {task.question}
                        </Text>
                      </VStack>

                      <Text fontSize="xs" color={subTextColor} flexShrink={0}>
                        #{task.id}
                      </Text>
                    </HStack>

                    <Text fontSize="xs" color={subTextColor}>
                      {task.stageLabel ?? '等待中'}
                    </Text>

                    {task.answer && (
                      <Box mt={3} p={3} borderRadius="lg" bg={sectionBg}>
                        <Text fontSize="sm" whiteSpace="pre-wrap" noOfLines={4}>
                          {task.answer}
                        </Text>
                      </Box>
                    )}
                  </Box>
                </HStack>
              );
            })}
          </Stack>
        </Box>
      )}

      <Divider />

      <Stack spacing={3}>
        <Box>
          <Text fontSize="sm" textTransform="uppercase" letterSpacing="0.08em" color={subTextColor} mb={1}>
            Evaluation 更新
          </Text>
          <Text fontSize="md" fontWeight="semibold">
            覆蓋與質量檢查
          </Text>
        </Box>

        {evaluationUpdates.length === 0 ? (
          <Text fontSize="sm" color={emptyTextColor}>
            尚無評估更新。
          </Text>
        ) : (
          <Stack spacing={3}>
            {evaluationUpdates.map((update, index) => (
              <Box key={`${update.stage}-${update.iteration}-${index}`} pb={3} borderBottom="1px solid" borderColor={timelineLineColor}>
                <HStack justify="space-between" align="start" spacing={3} wrap="wrap" mb={2}>
                  <HStack spacing={2} wrap="wrap">
                    <Badge colorScheme="purple" variant="subtle" px={2} py={0.5} borderRadius="full">
                      {update.stage}
                    </Badge>
                    <Text fontSize="sm" color={subTextColor}>
                      Iteration {update.iteration}
                    </Text>
                  </HStack>

                  {typeof update.gate_pass === 'boolean' && (
                    <Badge
                      colorScheme={update.gate_pass ? 'green' : 'red'}
                      variant="subtle"
                      px={2}
                      py={0.5}
                      borderRadius="full"
                    >
                      {update.gate_pass ? 'pass' : 'retry'}
                    </Badge>
                  )}
                </HStack>

                {Array.isArray(update.coverage_gaps) && update.coverage_gaps.length > 0 && (
                  <Text fontSize="sm" color={subTextColor}>
                    Coverage gaps: {update.coverage_gaps.join(', ')}
                  </Text>
                )}
              </Box>
            ))}
          </Stack>
        )}
      </Stack>
    </Stack>
  );
}
