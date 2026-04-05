import {
  Accordion,
  AccordionButton,
  AccordionIcon,
  AccordionItem,
  AccordionPanel,
  Badge,
  Box,
  Button,
  Card,
  CardBody,
  Divider,
  Flex,
  HStack,
  Progress,
  Stack,
  Text,
  VStack,
  useColorModeValue,
} from '@chakra-ui/react';
import { FiCheckCircle, FiClock, FiPlayCircle, FiRefreshCw, FiXCircle } from 'react-icons/fi';
import type { AgentTraceStep } from '../../types/evaluation';
import type { UseAgenticBenchmarkResearchReturn } from '../../hooks/useAgenticBenchmarkResearch';
import TraceStepCard from '../trace/TraceStepCard';

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

function renderTraceList(steps: AgentTraceStep[]) {
  if (steps.length === 0) {
    return <Text color="gray.500">尚無 trace step。</Text>;
  }
  return (
    <Stack spacing={3}>
      {steps.map((step) => (
        <TraceStepCard key={step.step_id} step={step} background="white" />
      ))}
    </Stack>
  );
}

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

  const cardBg = useColorModeValue('white', 'navy.800');
  const borderColor = useColorModeValue('gray.200', 'whiteAlpha.200');
  const subTextColor = useColorModeValue('gray.500', 'gray.400');
  const summaryBg = useColorModeValue('gray.50', 'whiteAlpha.100');

  const completedCount = progress.filter((task) => task.status === 'done').length;
  const runningCount = progress.filter((task) => task.status === 'running').length;
  const taskCount = plan?.task_count ?? progress.filter((task) => task.iteration === 0).length;
  const progressPercent = progress.length > 0 ? Math.round((completedCount / progress.length) * 100) : 0;

  return (
    <Card bg={cardBg} borderRadius="xl" flex={1} minH={0} overflow="hidden">
      <CardBody display="flex" flexDirection="column" minH={0} p={{ base: 4, md: 5 }}>
        <VStack spacing={4} align="stretch" h="100%" minH={0} overflow="hidden">
          <Box p={4} borderRadius="xl" bg={summaryBg} border="1px solid" borderColor={borderColor}>
            <HStack justify="space-between" align="start" wrap="wrap" spacing={3}>
              <VStack align="start" spacing={1}>
                <Text fontWeight="bold" fontSize="lg">
                  Agentic RAG (Benchmark)
                </Text>
                <Text fontSize="sm" color="brand.500">
                  {phaseLabel(currentPhase)}
                </Text>
              </VStack>
              <HStack spacing={2}>
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
            </HStack>

            <Progress value={progressPercent} mt={4} borderRadius="full" hasStripe isAnimated={isRunning} />
            <HStack mt={3} spacing={2} wrap="wrap">
              <Badge colorScheme="purple">計畫任務 {taskCount}</Badge>
              <Badge colorScheme="green">完成 {completedCount}</Badge>
              <Badge colorScheme="blue">執行中 {runningCount}</Badge>
              <Badge colorScheme="orange">評估更新 {evaluationUpdates.length}</Badge>
              <Badge colorScheme="cyan">Trace 步驟 {traceSteps.length}</Badge>
            </HStack>
          </Box>

          <Accordion
            allowMultiple
            defaultIndex={[0]}
            flex={1}
            minH={0}
            overflowY="auto"
            pr={1}
            data-testid="agentic-benchmark-scroll-region"
          >
            <AccordionItem borderWidth="1px" borderColor={borderColor} borderRadius="lg" mb={3}>
              <AccordionButton>
                <HStack flex="1" textAlign="left">
                  <FiPlayCircle />
                  <Text fontWeight="semibold">任務時間軸</Text>
                </HStack>
                <AccordionIcon />
              </AccordionButton>
              <AccordionPanel pb={4}>
                {progress.length === 0 ? (
                  <Text color={subTextColor}>等待計畫建立或任務啟動。</Text>
                ) : (
                  <Stack spacing={3}>
                    {[...progress]
                      .sort((a, b) => (a.iteration === b.iteration ? a.id - b.id : a.iteration - b.iteration))
                      .map((task) => (
                        <Box key={`${task.iteration}-${task.id}`} borderWidth="1px" borderRadius="lg" p={3} bg={summaryBg}>
                          <HStack justify="space-between" align="start">
                            <VStack align="start" spacing={1} maxW="80%">
                              <HStack spacing={2}>
                                <Badge colorScheme={task.iteration > 0 ? 'orange' : 'gray'}>
                                  {task.iteration > 0 ? `Drill-down ${task.iteration}` : 'Main'}
                                </Badge>
                                <Badge colorScheme={taskStatusColor(task.status)}>{task.status}</Badge>
                              </HStack>
                              <Text fontSize="sm" fontWeight="medium">
                                {task.question}
                              </Text>
                              <Text fontSize="xs" color={subTextColor}>
                                {task.stageLabel ?? '等待中'}
                              </Text>
                            </VStack>
                            <HStack spacing={1}>
                              <Text fontSize="xs" color={subTextColor}>
                                #{task.id}
                              </Text>
                              {task.status === 'done' ? <FiCheckCircle /> : task.status === 'running' ? <FiClock /> : <FiXCircle />}
                            </HStack>
                          </HStack>
                          {task.answer && (
                            <>
                              <Divider my={2} />
                              <Text fontSize="sm" noOfLines={3}>
                                {task.answer}
                              </Text>
                            </>
                          )}
                        </Box>
                      ))}
                  </Stack>
                )}
              </AccordionPanel>
            </AccordionItem>

            <AccordionItem borderWidth="1px" borderColor={borderColor} borderRadius="lg" mb={3}>
              <AccordionButton>
                <HStack flex="1" textAlign="left">
                  <FiCheckCircle />
                  <Text fontWeight="semibold">Evaluation 更新</Text>
                </HStack>
                <AccordionIcon />
              </AccordionButton>
              <AccordionPanel pb={4}>
                {evaluationUpdates.length === 0 ? (
                  <Text color={subTextColor}>尚無評估更新。</Text>
                ) : (
                  <Stack spacing={2}>
                    {evaluationUpdates.map((update, index) => (
                      <Flex
                        key={`${update.stage}-${update.iteration}-${index}`}
                        p={3}
                        borderRadius="lg"
                        borderWidth="1px"
                        borderColor={borderColor}
                        bg={summaryBg}
                        justify="space-between"
                        gap={3}
                        wrap="wrap"
                      >
                        <HStack spacing={2}>
                          <Badge colorScheme="purple">{update.stage}</Badge>
                          <Text fontSize="sm">Iteration {update.iteration}</Text>
                        </HStack>
                        {typeof update.gate_pass === 'boolean' && (
                          <Badge colorScheme={update.gate_pass ? 'green' : 'red'}>
                            {update.gate_pass ? 'pass' : 'retry'}
                          </Badge>
                        )}
                      </Flex>
                    ))}
                  </Stack>
                )}
              </AccordionPanel>
            </AccordionItem>

            <AccordionItem borderWidth="1px" borderColor={borderColor} borderRadius="lg" mb={3}>
              <AccordionButton>
                <HStack flex="1" textAlign="left">
                  <FiClock />
                  <Text fontWeight="semibold">Trace Steps</Text>
                </HStack>
                <AccordionIcon />
              </AccordionButton>
              <AccordionPanel pb={4}>{renderTraceList(traceSteps)}</AccordionPanel>
            </AccordionItem>

            <AccordionItem borderWidth="1px" borderColor={borderColor} borderRadius="lg">
              <AccordionButton>
                <HStack flex="1" textAlign="left">
                  <FiCheckCircle />
                  <Text fontWeight="semibold">最終報告</Text>
                </HStack>
                <AccordionIcon />
              </AccordionButton>
              <AccordionPanel pb={4}>
                {result ? (
                  <Stack spacing={3}>
                    <Text fontWeight="semibold">摘要</Text>
                    <Text fontSize="sm" whiteSpace="pre-wrap">
                      {result.summary}
                    </Text>
                    <Divider />
                    <Text fontWeight="semibold">詳細回答</Text>
                    <Text fontSize="sm" whiteSpace="pre-wrap">
                      {result.detailed_answer}
                    </Text>
                    {result.sub_tasks.length > 0 && (
                      <>
                        <Divider />
                        <Text fontWeight="semibold">子任務結果</Text>
                        <Stack spacing={2}>
                          {result.sub_tasks.map((task) => (
                            <Box key={`${task.iteration}-${task.id}`} p={3} borderWidth="1px" borderRadius="lg" bg={summaryBg}>
                              <Text fontSize="xs" color={subTextColor} mb={1}>
                                任務 #{task.id} · Iteration {task.iteration}
                              </Text>
                              <Text fontSize="sm" fontWeight="medium" mb={1}>
                                {task.question}
                              </Text>
                              <Text fontSize="sm" whiteSpace="pre-wrap">
                                {task.answer}
                              </Text>
                            </Box>
                          ))}
                        </Stack>
                      </>
                    )}
                    {result.all_sources.length > 0 && (
                      <>
                        <Divider />
                        <Text fontWeight="semibold">引用來源</Text>
                        <Stack spacing={1}>
                          {result.all_sources.map((source, index) => (
                            <Text key={`${source}-${index}`} fontSize="sm" color={subTextColor}>
                              {index + 1}. {source}
                            </Text>
                          ))}
                        </Stack>
                      </>
                    )}
                  </Stack>
                ) : (
                  <Text color={subTextColor}>尚未完成最終報告。</Text>
                )}
              </AccordionPanel>
            </AccordionItem>
          </Accordion>

          {error && (
            <Box p={3} borderRadius="lg" bg="red.50" border="1px solid" borderColor="red.200">
              <Text color="red.600">{error}</Text>
            </Box>
          )}
        </VStack>
      </CardBody>
    </Card>
  );
}
