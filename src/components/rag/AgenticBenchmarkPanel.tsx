import {
  Badge,
  Box,
  Button,
  HStack,
  Progress,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Text,
  VStack,
  useColorModeValue,
} from '@chakra-ui/react';
import { FiRefreshCw } from 'react-icons/fi';

import type { UseAgenticBenchmarkResearchReturn } from '../../hooks/useAgenticBenchmarkResearch';
import BenchmarkResultTab from './BenchmarkResultTab';
import BenchmarkStatusTab from './BenchmarkStatusTab';
import BenchmarkTraceTab from './BenchmarkTraceTab';

interface AgenticBenchmarkPanelProps {
  researchState: UseAgenticBenchmarkResearchReturn;
}

function phaseLabel(phase: UseAgenticBenchmarkResearchReturn['currentPhase']): string {
  switch (phase) {
    case 'planning':
      return '建立 benchmark 計畫中';
    case 'executing':
      return '執行主任務中';
    case 'drilldown':
      return 'Drill-down 任務中';
    case 'evaluation':
      return '評估與覆蓋檢查中';
    case 'synthesis':
      return '綜合報告生成中';
    case 'complete':
      return '執行完成';
    default:
      return '待命';
  }
}

const subtleScrollbarSx = {
  '&::-webkit-scrollbar': {
    width: '8px',
  },
  '&::-webkit-scrollbar-track': {
    background: 'transparent',
  },
  '&::-webkit-scrollbar-thumb': {
    background: 'transparent',
    borderRadius: '999px',
  },
  '&:hover::-webkit-scrollbar-thumb': {
    background: 'rgba(148, 163, 184, 0.55)',
  },
};

export default function AgenticBenchmarkPanel({ researchState }: AgenticBenchmarkPanelProps) {
  const {
    plan,
    isRunning,
    progress,
    evaluationUpdates,
    traceSteps,
    result,
    error,
    currentPhase,
    cancelExecution,
    reset,
  } = researchState;

  const borderColor = useColorModeValue('gray.200', 'whiteAlpha.200');
  const subTextColor = useColorModeValue('gray.500', 'gray.400');
  const summaryBg = useColorModeValue('gray.50', 'whiteAlpha.100');
  const errorBg = useColorModeValue('red.50', 'rgba(254, 226, 226, 0.16)');
  const errorBorderColor = useColorModeValue('red.200', 'rgba(254, 202, 202, 0.32)');

  const completedCount = progress.filter((task) => task.status === 'done').length;
  const runningCount = progress.filter((task) => task.status === 'running').length;
  const taskCount = plan?.task_count ?? progress.filter((task) => task.iteration === 0).length;
  const progressPercent = progress.length > 0 ? Math.round((completedCount / progress.length) * 100) : 0;

  return (
    <Box
      h="100%"
      flex={1}
      minH={0}
      overflowY="auto"
      sx={subtleScrollbarSx}
      data-testid="agentic-benchmark-scroll-region"
    >
      <VStack spacing={5} align="stretch" h="100%" minH={0} px={{ base: 1, md: 2 }} pb={2}>
          <Box p={{ base: 4, md: 5 }} borderRadius="xl" bg={summaryBg} border="1px solid" borderColor={borderColor}>
            <HStack justify="space-between" align="start" wrap="wrap" spacing={3}>
              <VStack align="start" spacing={1}>
                <Text fontWeight="bold" fontSize={{ base: 'lg', md: 'xl' }}>
                  Agentic RAG (Benchmark)
                </Text>
                <Text fontSize="sm" color="brand.500">
                  {phaseLabel(currentPhase)}
                </Text>
              </VStack>
              {isRunning ? (
                <Button size="sm" variant="outline" colorScheme="red" onClick={cancelExecution}>
                  停止
                </Button>
              ) : (
                <Button size="sm" variant="ghost" leftIcon={<FiRefreshCw />} onClick={reset}>
                  重置
                </Button>
              )}
            </HStack>

            <Progress value={progressPercent} mt={4} borderRadius="full" hasStripe isAnimated={isRunning} />
            <HStack mt={4} spacing={3} wrap="wrap">
              <Badge colorScheme="purple" variant="subtle" px={2.5} py={1} borderRadius="full">
                計畫任務 {taskCount}
              </Badge>
              <Badge colorScheme="green" variant="subtle" px={2.5} py={1} borderRadius="full">
                完成 {completedCount}
              </Badge>
              <Badge colorScheme="blue" variant="subtle" px={2.5} py={1} borderRadius="full">
                執行中 {runningCount}
              </Badge>
              <Badge colorScheme="orange" variant="subtle" px={2.5} py={1} borderRadius="full">
                評估更新 {evaluationUpdates.length}
              </Badge>
              <Badge colorScheme="cyan" variant="subtle" px={2.5} py={1} borderRadius="full">
                Trace 步驟 {traceSteps.length}
              </Badge>
            </HStack>
          </Box>

          <Tabs
            key={currentPhase === 'complete' ? 'complete' : 'active'}
            defaultIndex={currentPhase === 'complete' ? 2 : 0}
            variant="line"
            colorScheme="brand"
            isLazy
            display="flex"
            flexDirection="column"
            flex={1}
            minH={0}
          >
            <TabList borderColor={borderColor} gap={3}>
              <Tab px={1} fontWeight="semibold">
                執行狀態
              </Tab>
              <Tab px={1} fontWeight="semibold">
                Trace 追蹤
              </Tab>
              <Tab px={1} fontWeight="semibold">
                最終結果
              </Tab>
            </TabList>

            <TabPanels flex={1} minH={0}>
              <TabPanel px={0} pt={5}>
                <BenchmarkStatusTab progress={progress} evaluationUpdates={evaluationUpdates} />
              </TabPanel>
              <TabPanel px={0} pt={5}>
                <BenchmarkTraceTab traceSteps={traceSteps} />
              </TabPanel>
              <TabPanel px={0} pt={5}>
                <BenchmarkResultTab result={result} />
              </TabPanel>
            </TabPanels>
          </Tabs>

          {error && (
            <Box p={3} borderRadius="lg" bg={errorBg} border="1px solid" borderColor={errorBorderColor}>
              <Text color={subTextColor}>{error}</Text>
            </Box>
          )}
      </VStack>
    </Box>
  );
}
