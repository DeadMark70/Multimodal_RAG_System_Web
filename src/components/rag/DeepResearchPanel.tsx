/**
 * DeepResearchPanel
 *
 * 深度研究專屬 UI 面板
 * - 計畫預覽與編輯
 * - 執行進度追蹤
 * - 結果摘要與完整報告抽屜
 */

import { useState } from 'react';
import {
  Box,
  VStack,
  HStack,
  Input,
  Button,
  Text,
  Card,
  CardBody,
  CardHeader,
  Checkbox,
  Badge,
  Progress,
  Spinner,
  IconButton,
  Flex,
  Divider,
  SimpleGrid,
  useColorModeValue,
  Collapse,
  Tooltip,
  Drawer,
  DrawerBody,
  DrawerCloseButton,
  DrawerContent,
  DrawerHeader,
  DrawerOverlay,
  useDisclosure,
} from '@chakra-ui/react';
import {
  FiPlay,
  FiTrash2,
  FiEdit2,
  FiCheck,
  FiX,
  FiRefreshCw,
  FiChevronDown,
  FiChevronUp,
  FiFileText,
} from 'react-icons/fi';
import { type UseDeepResearchReturn } from '../../hooks/useDeepResearch';
import MarkdownContent from '../common/MarkdownContent';
import MetricsBadge from './MetricsBadge';
import EvaluationRadarChart from '../charts/EvaluationRadarChart';

interface DeepResearchPanelProps {
  researchState: UseDeepResearchReturn;
}

type DeepResearchView = 'plan' | 'run' | 'report';

function taskKey(task: { id: number; iteration: number }): string {
  return `${task.iteration}-${task.id}`;
}

export default function DeepResearchPanel({ researchState }: DeepResearchPanelProps) {
  const [editingTaskId, setEditingTaskId] = useState<number | null>(null);
  const [editingQuestion, setEditingQuestion] = useState('');
  const [selectedView, setSelectedView] = useState<DeepResearchView | null>(null);
  const [expandedTaskKeys, setExpandedTaskKeys] = useState<string[]>([]);
  const reportDrawer = useDisclosure();

  const {
    plan,
    isPlanning,
    isExecuting,
    progress,
    result,
    error,
    currentPhase,
    generatePlan,
    updateTask,
    toggleTask,
    deleteTask,
    executePlan,
    cancelExecution,
    reset,
  } = researchState;

  const cardBg = useColorModeValue('white', 'navy.800');
  const borderColor = useColorModeValue('gray.200', 'whiteAlpha.200');
  const textColor = useColorModeValue('gray.700', 'white');
  const subTextColor = useColorModeValue('gray.500', 'gray.400');
  const detailPanelBg = useColorModeValue('gray.50', 'whiteAlpha.50');
  const accentPanelBg = useColorModeValue('brand.50', 'whiteAlpha.100');
  const pillBg = useColorModeValue('gray.100', 'whiteAlpha.100');

  const startEditTask = (taskId: number, currentQuestion: string) => {
    setEditingTaskId(taskId);
    setEditingQuestion(currentQuestion);
  };

  const saveEditTask = (taskId: number) => {
    if (editingQuestion.trim()) {
      updateTask(taskId, { question: editingQuestion });
    }
    setEditingTaskId(null);
    setEditingQuestion('');
  };

  const getProgressPercentage = (): number => {
    if (progress.length === 0) return 0;
    const completed = progress.filter((item) => item.status === 'done').length;
    return Math.round((completed / progress.length) * 100);
  };

  const getComplexityColor = (complexity: string) => {
    switch (complexity) {
      case 'simple':
        return 'green';
      case 'medium':
        return 'orange';
      case 'complex':
        return 'red';
      default:
        return 'gray';
    }
  };

  const getPhaseMessage = (): { icon: string; text: string } => {
    switch (currentPhase) {
      case 'executing':
        return { icon: '🔍', text: '正在執行研究任務…' };
      case 'drilldown':
        return { icon: '🔬', text: '正在進行深度挖掘與反覆驗證…' };
      case 'synthesis':
        return { icon: '📝', text: '正在生成綜合研究報告…' };
      case 'complete':
        return { icon: '✅', text: '研究完成' };
      default:
        return { icon: '⏳', text: '準備中…' };
    }
  };

  const getStatusColor = (status: 'pending' | 'running' | 'done' | 'error') => {
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
  };

  const getTaskTypeColor = (taskType: 'rag' | 'graph_analysis') =>
    taskType === 'graph_analysis' ? 'purple' : 'blue';

  const getTaskTypeLabel = (taskType: 'rag' | 'graph_analysis') =>
    taskType === 'graph_analysis' ? 'GRAPH' : 'RAG';

  const getStatusLabel = (status: 'pending' | 'running' | 'done' | 'error') => {
    switch (status) {
      case 'running':
        return '執行中';
      case 'done':
        return '完成';
      case 'error':
        return '錯誤';
      default:
        return '等待中';
    }
  };

  const completedCount = progress.filter((task) => task.status === 'done').length;
  const runningCount = progress.filter((task) => task.status === 'running').length;
  const pendingCount = progress.filter((task) => task.status === 'pending').length;
  const orderedProgress = [...progress].sort((left, right) => {
    if (left.iteration !== right.iteration) {
      return left.iteration - right.iteration;
    }
    return left.id - right.id;
  });

  const availableViews = [
    { id: 'plan' as const, label: 'Plan', enabled: Boolean(plan || isPlanning) },
    { id: 'run' as const, label: 'Run', enabled: Boolean(isExecuting || progress.length > 0) },
    { id: 'report' as const, label: 'Report', enabled: Boolean(result) },
  ];
  const autoView: DeepResearchView = result
    ? 'report'
    : isExecuting || progress.length > 0
      ? 'run'
      : 'plan';
  const activeViewEnabled = availableViews.some((view) => view.id === selectedView && view.enabled);
  const deepResearchView = activeViewEnabled && selectedView ? selectedView : autoView;

  const toggleExpandedTask = (key: string) => {
    setExpandedTaskKeys((previous) =>
      previous.includes(key) ? previous.filter((item) => item !== key) : [...previous, key]
    );
  };

  const renderPlanView = () => {
    if (!plan) {
      return (
        <Card bg={cardBg} borderRadius="xl" border="1px dashed" borderColor={borderColor} flex={1}>
          <CardBody py={10}>
            <VStack spacing={4} align="center" justify="center" h="100%">
              <Text fontSize="xl" fontWeight="bold" color={textColor}>
                Deep Research
              </Text>
              <Text color={subTextColor}>請在下方輸入問題以開始深度研究</Text>
            </VStack>
          </CardBody>
        </Card>
      );
    }

    return (
      <Card bg={cardBg} borderRadius="xl" flex={1} minH={0} overflow="hidden">
        <CardHeader pb={2}>
          <Flex justify="space-between" align="center" gap={3} wrap="wrap">
            <HStack>
              <Text fontWeight="bold" fontSize="lg" color={textColor}>
                研究計畫
              </Text>
              <Badge colorScheme={getComplexityColor(plan.estimated_complexity)}>
                {plan.estimated_complexity === 'simple' && '簡單'}
                {plan.estimated_complexity === 'medium' && '中等'}
                {plan.estimated_complexity === 'complex' && '複雜'}
              </Badge>
            </HStack>
            <HStack>
              <Button
                size="sm"
                variant="ghost"
                leftIcon={<FiRefreshCw />}
                onClick={() => void generatePlan(plan.original_question)}
                disabled={isPlanning || isExecuting}
              >
                重新生成
              </Button>
              <Button
                size="sm"
                colorScheme="brand"
                leftIcon={<FiPlay />}
                onClick={() => void executePlan()}
                isLoading={isExecuting}
                loadingText="執行中"
                disabled={plan.sub_tasks.filter((task) => task.enabled).length === 0}
              >
                開始研究
              </Button>
            </HStack>
          </Flex>
        </CardHeader>
        <CardBody pt={0} display="flex" flexDirection="column" minH={0}>
          <Text fontSize="sm" color={subTextColor} mb={4}>
            原始問題：{plan.original_question}
          </Text>
          <VStack spacing={2} align="stretch" flex={1} minH={0} overflowY="auto" pr={1}>
            {plan.sub_tasks.map((task) => (
              <HStack
                key={task.id}
                p={3}
                bg={detailPanelBg}
                borderRadius="lg"
                border="1px solid"
                borderColor={borderColor}
                align="start"
              >
                <Checkbox
                  isChecked={task.enabled}
                  onChange={() => toggleTask(task.id)}
                  colorScheme="brand"
                  mt={1}
                />
                <Badge size="sm" colorScheme={task.task_type === 'rag' ? 'blue' : 'purple'} mt={1}>
                  {task.task_type === 'rag' ? 'RAG' : 'GRAPH'}
                </Badge>
                {editingTaskId === task.id ? (
                  <Input
                    flex={1}
                    size="sm"
                    value={editingQuestion}
                    onChange={(event) => setEditingQuestion(event.target.value)}
                    autoFocus
                  />
                ) : (
                  <Text flex={1} fontSize="sm" color={task.enabled ? textColor : subTextColor}>
                    {task.question}
                  </Text>
                )}
                <HStack spacing={1}>
                  {editingTaskId === task.id ? (
                    <>
                      <IconButton
                        aria-label="儲存"
                        icon={<FiCheck />}
                        size="xs"
                        colorScheme="green"
                        onClick={() => saveEditTask(task.id)}
                      />
                      <IconButton
                        aria-label="取消"
                        icon={<FiX />}
                        size="xs"
                        onClick={() => setEditingTaskId(null)}
                      />
                    </>
                  ) : (
                    <>
                      <Tooltip label="編輯">
                        <IconButton
                          aria-label="編輯"
                          icon={<FiEdit2 />}
                          size="xs"
                          variant="ghost"
                          onClick={() => startEditTask(task.id, task.question)}
                        />
                      </Tooltip>
                      <Tooltip label="刪除">
                        <IconButton
                          aria-label="刪除"
                          icon={<FiTrash2 />}
                          size="xs"
                          variant="ghost"
                          colorScheme="red"
                          onClick={() => deleteTask(task.id)}
                        />
                      </Tooltip>
                    </>
                  )}
                </HStack>
              </HStack>
            ))}
          </VStack>
        </CardBody>
      </Card>
    );
  };

  const renderRunView = () => (
    <Card bg={cardBg} borderRadius="xl" flex={1} minH={0} overflow="hidden">
      <CardHeader pb={2}>
        <Flex justify="space-between" align="center" gap={3} wrap="wrap">
          <VStack align="start" spacing={1}>
            <Text fontWeight="bold" fontSize="lg" color={textColor}>
              執行進度
            </Text>
            <Text fontSize="sm" color="brand.500">
              {getPhaseMessage().icon} {getPhaseMessage().text}
            </Text>
          </VStack>
          <Button
            size="sm"
            variant="ghost"
            colorScheme="red"
            leftIcon={<FiX />}
            onClick={cancelExecution}
            isDisabled={!isExecuting}
          >
            取消
          </Button>
        </Flex>
      </CardHeader>
      <CardBody pt={0} display="flex" flexDirection="column" minH={0}>
        <Progress
          value={getProgressPercentage()}
          colorScheme="brand"
          borderRadius="full"
          mb={4}
          hasStripe
          isAnimated={isExecuting}
        />
        <HStack mb={4} spacing={2} wrap="wrap">
          <Badge colorScheme="green">完成 {completedCount}</Badge>
          <Badge colorScheme="blue">執行中 {runningCount}</Badge>
          <Badge colorScheme="gray">等待 {pendingCount}</Badge>
        </HStack>

        {orderedProgress.length === 0 ? (
          <Flex flex={1} align="center" justify="center" color={subTextColor}>
            <VStack spacing={3}>
              <Spinner color="brand.500" />
              <Text fontSize="sm">等待研究任務啟動…</Text>
            </VStack>
          </Flex>
        ) : (
          <VStack spacing={3} align="stretch" flex={1} minH={0} overflowY="auto" pr={1}>
            {orderedProgress.map((task) => {
              const key = taskKey(task);
              const isExpanded = task.status === 'running' || expandedTaskKeys.includes(key);

              return (
                <Box
                  key={key}
                  borderRadius="xl"
                  border="1px solid"
                  borderColor={borderColor}
                  bg={detailPanelBg}
                  overflow="hidden"
                >
                  <Flex justify="space-between" align="start" gap={3} p={4}>
                    <VStack align="start" spacing={2} flex={1} minW={0}>
                      <HStack spacing={2} wrap="wrap">
                        <Badge colorScheme={task.iteration > 0 ? 'orange' : 'gray'}>
                          {task.iteration > 0 ? `Drill-down ${task.iteration}` : '主任務'}
                        </Badge>
                        <Badge colorScheme={getTaskTypeColor(task.taskType)}>
                          {getTaskTypeLabel(task.taskType)}
                        </Badge>
                        <Badge colorScheme={getStatusColor(task.status)}>
                          {getStatusLabel(task.status)}
                        </Badge>
                      </HStack>
                      <Text fontWeight="semibold" color={textColor} noOfLines={isExpanded ? undefined : 2}>
                        {task.question}
                      </Text>
                      <Text fontSize="xs" color={subTextColor}>
                        {task.stageLabel ?? (task.status === 'done' ? '回答完成' : getStatusLabel(task.status))}
                      </Text>
                    </VStack>
                    <HStack spacing={2} flexShrink={0}>
                      <Text fontSize="xs" color={subTextColor}>
                        #{task.id}
                      </Text>
                      {task.status !== 'running' && (
                        <IconButton
                          aria-label={isExpanded ? '收合任務' : '展開任務'}
                          icon={isExpanded ? <FiChevronUp /> : <FiChevronDown />}
                          size="sm"
                          variant="ghost"
                          onClick={() => toggleExpandedTask(key)}
                        />
                      )}
                    </HStack>
                  </Flex>

                  <Collapse in={isExpanded} animateOpacity>
                    <Box px={4} pb={4}>
                      <Box
                        p={3}
                        borderRadius="lg"
                        bg={accentPanelBg}
                        border="1px solid"
                        borderColor={borderColor}
                      >
                        <Text fontSize="xs" textTransform="uppercase" color={subTextColor} mb={1}>
                          目前子階段
                        </Text>
                        <Text fontSize="sm" fontWeight="medium" color={textColor}>
                          {task.stageLabel ?? (task.status === 'done' ? '回答完成' : getStatusLabel(task.status))}
                        </Text>
                      </Box>

                      {task.answer && (
                        <Box mt={3} p={3} borderRadius="lg" bg={cardBg} border="1px solid" borderColor={borderColor}>
                          <Text fontSize="xs" textTransform="uppercase" color={subTextColor} mb={1}>
                            任務回答摘要
                          </Text>
                          <Text
                            fontSize="sm"
                            color={textColor}
                            noOfLines={4}
                            sx={{ overflowWrap: 'anywhere', wordBreak: 'break-word' }}
                          >
                            {task.answer}
                          </Text>
                        </Box>
                      )}

                      {task.contexts && task.contexts.length > 0 && (
                        <Text mt={3} fontSize="xs" color={subTextColor}>
                          已擷取 {task.contexts.length} 段原始內容供最終彙整使用
                        </Text>
                      )}
                    </Box>
                  </Collapse>
                </Box>
              );
            })}
          </VStack>
        )}
      </CardBody>
    </Card>
  );

  const renderReportView = () => {
    if (!result) {
      return null;
    }

    return (
      <Card bg={cardBg} borderRadius="xl" flex={1} minH={0}>
        <CardHeader pb={2}>
          <Flex justify="space-between" align="center" gap={3} wrap="wrap">
            <HStack>
              <Text fontWeight="bold" fontSize="lg" color={textColor}>
                研究結果
              </Text>
              {result.metrics ? (
                <MetricsBadge metrics={result.metrics} />
              ) : (
                <Badge colorScheme="green">信心度 {Math.round(result.confidence * 100)}%</Badge>
              )}
            </HStack>
            <HStack>
              <Button size="sm" leftIcon={<FiFileText />} onClick={reportDrawer.onOpen}>
                開啟完整報告
              </Button>
              <Button size="sm" variant="ghost" leftIcon={<FiRefreshCw />} onClick={reset}>
                新研究
              </Button>
            </HStack>
          </Flex>
        </CardHeader>
        <CardBody pt={0}>
          <VStack spacing={4} align="stretch">
            <Text fontSize="sm" color={subTextColor}>
              {result.summary}
            </Text>

            <SimpleGrid columns={{ base: 1, md: 3 }} spacing={3}>
              <Box p={4} borderRadius="xl" bg={detailPanelBg} border="1px solid" borderColor={borderColor}>
                <Text fontSize="xs" textTransform="uppercase" color={subTextColor} mb={1}>
                  來源文件
                </Text>
                <Text fontSize="lg" fontWeight="bold" color={textColor}>
                  {result.all_sources.length}
                </Text>
              </Box>
              <Box p={4} borderRadius="xl" bg={detailPanelBg} border="1px solid" borderColor={borderColor}>
                <Text fontSize="xs" textTransform="uppercase" color={subTextColor} mb={1}>
                  執行迭代
                </Text>
                <Text fontSize="lg" fontWeight="bold" color={textColor}>
                  {result.total_iterations}
                </Text>
              </Box>
              <Box p={4} borderRadius="xl" bg={detailPanelBg} border="1px solid" borderColor={borderColor}>
                <Text fontSize="xs" textTransform="uppercase" color={subTextColor} mb={1}>
                  任務數量
                </Text>
                <Text fontSize="lg" fontWeight="bold" color={textColor}>
                  {result.sub_tasks.length}
                </Text>
              </Box>
            </SimpleGrid>

            {result.metrics && (
              <Box p={4} borderRadius="xl" bg={detailPanelBg} border="1px solid" borderColor={borderColor}>
                <Text fontWeight="medium" color={textColor} mb={3}>
                  評估分析
                </Text>
                <Flex justify="center">
                  <EvaluationRadarChart metrics={result.metrics} size="md" />
                </Flex>
              </Box>
            )}
          </VStack>
        </CardBody>
      </Card>
    );
  };

  return (
    <>
      <VStack spacing={4} align="stretch" h="100%" minH={0} overflow="hidden">
        {availableViews.some((view) => view.enabled) && (
          <HStack spacing={2} wrap="wrap">
            {availableViews.map((view) => (
              <Button
                key={view.id}
                size="sm"
                variant={deepResearchView === view.id ? 'solid' : 'ghost'}
                colorScheme={deepResearchView === view.id ? 'brand' : undefined}
                bg={deepResearchView === view.id ? undefined : pillBg}
                onClick={() => setSelectedView(view.id)}
                isDisabled={!view.enabled}
              >
                {view.label}
              </Button>
            ))}
          </HStack>
        )}

        {isPlanning && !plan && (
          <Card bg={cardBg} borderRadius="xl" flex={1}>
            <CardBody>
              <HStack justify="center" py={4}>
                <Spinner color="brand.500" />
                <Text color={textColor}>正在分析問題並生成計畫…</Text>
              </HStack>
            </CardBody>
          </Card>
        )}

        {!isPlanning && deepResearchView === 'plan' && renderPlanView()}
        {!isPlanning && deepResearchView === 'run' && renderRunView()}
        {!isPlanning && deepResearchView === 'report' && renderReportView()}

        {error && (
          <Card bg="red.50" borderRadius="xl" borderColor="red.200" borderWidth={1}>
            <CardBody>
              <Text color="red.600">❌ {error}</Text>
            </CardBody>
          </Card>
        )}
      </VStack>

      <Drawer isOpen={reportDrawer.isOpen} placement="right" onClose={reportDrawer.onClose} size="xl">
        <DrawerOverlay />
        <DrawerContent>
          <DrawerCloseButton />
          <DrawerHeader>完整研究報告</DrawerHeader>
          <DrawerBody pb={6}>
            {result && (
              <VStack spacing={5} align="stretch">
                <Box>
                  <Text fontWeight="bold" fontSize="lg" color={textColor} mb={2}>
                    摘要
                  </Text>
                  <Text fontSize="sm" color={subTextColor}>
                    {result.summary}
                  </Text>
                </Box>

                {result.metrics && (
                  <Box p={4} borderRadius="xl" bg={detailPanelBg} border="1px solid" borderColor={borderColor}>
                    <HStack justify="space-between" mb={3} wrap="wrap">
                      <Text fontWeight="medium" color={textColor}>
                        評估分析
                      </Text>
                      <MetricsBadge metrics={result.metrics} />
                    </HStack>
                    <Flex justify="center">
                      <EvaluationRadarChart metrics={result.metrics} size="md" />
                    </Flex>
                  </Box>
                )}

                <Divider />

                <MarkdownContent
                  className="markdown-content"
                  content={result.detailed_answer}
                  variant="report"
                />

                {result.all_sources.length > 0 && (
                  <Box>
                    <Text fontWeight="medium" color={textColor} mb={2}>
                      參考文件 ({result.all_sources.length})
                    </Text>
                    <HStack wrap="wrap" spacing={2}>
                      {result.all_sources.map((source, index) => (
                        <Badge key={`${source}-${index}`} colorScheme="gray" fontSize="xs">
                          {source.slice(0, 18)}
                          {source.length > 18 ? '…' : ''}
                        </Badge>
                      ))}
                    </HStack>
                  </Box>
                )}
              </VStack>
            )}
          </DrawerBody>
        </DrawerContent>
      </Drawer>
    </>
  );
}
