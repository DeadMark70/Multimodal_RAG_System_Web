/**
 * DeepResearchPanel
 * 
 * 深度研究專屬 UI 面板
 * - 輸入研究問題
 * - 計畫預覽與編輯
 * - 執行進度追蹤
 * - 結果展示
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
  useColorModeValue,
  Collapse,
  Tooltip,
} from '@chakra-ui/react';
import { 
  FiSearch, 
  FiPlay, 
  FiTrash2, 
  FiEdit2, 
  FiCheck, 
  FiX,
  FiRefreshCw,
  FiChevronDown,
  FiChevronUp,
} from 'react-icons/fi';
import ReactMarkdown from 'react-markdown';
import rehypeSanitize from 'rehype-sanitize';
import { useDeepResearch } from '../../hooks/useDeepResearch';
import MetricsBadge from './MetricsBadge';
import EvaluationRadarChart from '../charts/EvaluationRadarChart';
import type { TaskProgress } from '../../types/rag';

interface DeepResearchPanelProps {
  selectedDocIds?: string[];
}

/**
 * 參考文脈預覽元件
 */
function ContextPreview({ contexts }: { contexts: string[] }) {
  const [isOpen, setIsOpen] = useState(false);
  const textColor = useColorModeValue('gray.600', 'gray.400');
  const bg = useColorModeValue('gray.50', 'whiteAlpha.100');

  if (!contexts || contexts.length === 0) return null;

  return (
    <Box mt={1} ml={8}>
      <Button 
        size="xs" 
        variant="link" 
        onClick={() => setIsOpen(!isOpen)}
        colorScheme="brand"
        fontWeight="normal"
      >
        {isOpen ? '收合參考文脈' : `查看參考文脈 (${contexts.length})`}
      </Button>
      <Collapse in={isOpen}>
        <VStack align="start" spacing={2} mt={2}>
          {contexts.map((ctx, idx) => (
            <Box key={idx} p={2} bg={bg} borderRadius="md" w="100%" fontSize="xs" borderLeft="2px solid" borderColor="brand.500">
              <Text noOfLines={5} color={textColor}>{ctx}</Text>
            </Box>
          ))}
        </VStack>
      </Collapse>
    </Box>
  );
}

export default function DeepResearchPanel({ selectedDocIds }: DeepResearchPanelProps) {
  const [question, setQuestion] = useState('');
  const [editingTaskId, setEditingTaskId] = useState<number | null>(null);
  const [editingQuestion, setEditingQuestion] = useState('');
  const [showResult, setShowResult] = useState(true);

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
  } = useDeepResearch({ docIds: selectedDocIds });

  const cardBg = useColorModeValue('white', 'navy.800');
  const borderColor = useColorModeValue('gray.200', 'whiteAlpha.200');
  const textColor = useColorModeValue('gray.700', 'white');
  const subTextColor = useColorModeValue('gray.500', 'gray.400');

  /**
   * 處理生成計畫
   */
  const handleGeneratePlan = () => {
    if (question.trim()) {
      generatePlan(question);
    }
  };

  /**
   * 開始編輯任務
   */
  const startEditTask = (taskId: number, currentQuestion: string) => {
    setEditingTaskId(taskId);
    setEditingQuestion(currentQuestion);
  };

  /**
   * 儲存編輯
   */
  const saveEditTask = (taskId: number) => {
    if (editingQuestion.trim()) {
      updateTask(taskId, { question: editingQuestion });
    }
    setEditingTaskId(null);
    setEditingQuestion('');
  };

  /**
   * 取得任務進度百分比
   */
  const getProgressPercentage = (): number => {
    if (progress.length === 0) return 0;
    const completed = progress.filter(p => p.status === 'done').length;
    return Math.round((completed / progress.length) * 100);
  };

  /**
   * 取得任務狀態圖標
   */
  const getStatusIcon = (status: TaskProgress['status']) => {
    switch (status) {
      case 'pending':
        return <Box w={3} h={3} borderRadius="full" bg="gray.300" />;
      case 'running':
        return <Spinner size="xs" color="brand.500" />;
      case 'done':
        return <Box w={3} h={3} borderRadius="full" bg="green.500" />;
      case 'error':
        return <Box w={3} h={3} borderRadius="full" bg="red.500" />;
    }
  };

  /**
   * 取得複雜度標籤顏色
   */
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

  /**
   * Phase 6: 取得當前階段的顯示文案
   */
  const getPhaseMessage = (): { icon: string; text: string } => {
    switch (currentPhase) {
      case 'executing':
        return { icon: '🔍', text: '正在執行研究任務...' };
      case 'drilldown':
        return { icon: '🔬', text: '正在進行深度挖掘與反覆驗證...' };
      case 'synthesis':
        return { icon: '📝', text: '正在生成綜合研究報告...' };
      case 'complete':
        return { icon: '✅', text: '研究完成！' };
      default:
        return { icon: '⏳', text: '準備中...' };
    }
  };

  return (
    <VStack spacing={4} align="stretch" h="100%">
      {/* 輸入區 */}
      <Card bg={cardBg} borderRadius="xl">
        <CardBody>
          <VStack spacing={4}>
            <Text fontWeight="bold" fontSize="lg" color={textColor} alignSelf="flex-start">
              🔬 深度研究
            </Text>
            <HStack w="100%">
              <Input
                placeholder="輸入您想深入研究的問題..."
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleGeneratePlan()}
                disabled={isPlanning || isExecuting}
              />
              <Button
                colorScheme="brand"
                leftIcon={<FiSearch />}
                onClick={handleGeneratePlan}
                isLoading={isPlanning}
                loadingText="分析中"
                disabled={!question.trim() || isExecuting}
              >
                生成計畫
              </Button>
            </HStack>
          </VStack>
        </CardBody>
      </Card>

      {/* 計畫預覽區 */}
      {plan && !result && (
        <Card bg={cardBg} borderRadius="xl">
          <CardHeader pb={2}>
            <Flex justify="space-between" align="center">
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
                  onClick={() => generatePlan(question)}
                  disabled={isPlanning || isExecuting}
                >
                  重新生成
                </Button>
                <Button
                  size="sm"
                  colorScheme="brand"
                  leftIcon={<FiPlay />}
                  onClick={executePlan}
                  isLoading={isExecuting}
                  loadingText="執行中"
                  disabled={plan.sub_tasks.filter(t => t.enabled).length === 0}
                >
                  開始研究
                </Button>
              </HStack>
            </Flex>
          </CardHeader>
          <CardBody pt={0}>
            <Text fontSize="sm" color={subTextColor} mb={4}>
              原始問題：{plan.original_question}
            </Text>
            <VStack spacing={2} align="stretch">
              {plan.sub_tasks.map((task) => (
                <HStack
                  key={task.id}
                  p={3}
                  bg={useColorModeValue('gray.50', 'whiteAlpha.50')}
                  borderRadius="md"
                  border="1px solid"
                  borderColor={borderColor}
                >
                  <Checkbox
                    isChecked={task.enabled}
                    onChange={() => toggleTask(task.id)}
                    colorScheme="brand"
                  />
                  <Badge size="sm" colorScheme={task.task_type === 'rag' ? 'blue' : 'purple'}>
                    {task.task_type === 'rag' ? 'RAG' : 'GRAPH'}
                  </Badge>
                  {editingTaskId === task.id ? (
                    <Input
                      flex={1}
                      size="sm"
                      value={editingQuestion}
                      onChange={(e) => setEditingQuestion(e.target.value)}
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
      )}

      {/* 執行進度區 */}
      {isExecuting && progress.length > 0 && (
        <Card bg={cardBg} borderRadius="xl">
          <CardHeader pb={2}>
            <Flex justify="space-between" align="center">
              <VStack align="start" spacing={1}>
                <Text fontWeight="bold" fontSize="lg" color={textColor}>
                  執行進度
                </Text>
                {/* Phase 6: 顯示當前階段文案 */}
                <HStack spacing={2}>
                  <Text fontSize="sm" color="brand.500">
                    {getPhaseMessage().icon} {getPhaseMessage().text}
                  </Text>
                </HStack>
              </VStack>
              <Button
                size="sm"
                variant="ghost"
                colorScheme="red"
                leftIcon={<FiX />}
                onClick={cancelExecution}
              >
                取消
              </Button>
            </Flex>
          </CardHeader>
          <CardBody pt={0}>
            <Progress
              value={getProgressPercentage()}
              colorScheme="brand"
              borderRadius="full"
              mb={4}
              hasStripe
              isAnimated
            />
            <VStack spacing={2} align="stretch">
              {progress.map((task, index) => (
                <Box key={`${task.id}-${task.iteration}-${index}`}>
                  <HStack spacing={3}>
                    {getStatusIcon(task.status)}
                    <Text fontSize="sm" color={textColor} flex={1}>
                      {task.question}
                    </Text>
                    {task.iteration > 0 && (
                      <Badge size="sm" colorScheme="purple">深入 #{task.iteration}</Badge>
                    )}
                  </HStack>
                  {/* Phase 13: Context Bubble-up */}
                  {task.contexts && (
                    <ContextPreview contexts={task.contexts} />
                  )}
                </Box>
              ))}
            </VStack>
          </CardBody>
        </Card>
      )}

      {/* 錯誤訊息 */}
      {error && (
        <Card bg="red.50" borderRadius="xl" borderColor="red.200" borderWidth={1}>
          <CardBody>
            <Text color="red.600">❌ {error}</Text>
          </CardBody>
        </Card>
      )}

      {/* 結果展示區 */}
      {result && (
        <Card bg={cardBg} borderRadius="xl" flex={1} overflow="hidden">
          <CardHeader pb={2}>
            <Flex justify="space-between" align="center">
              <HStack>
                <Text fontWeight="bold" fontSize="lg" color={textColor}>
                  📊 研究結果
                </Text>
                {/* Phase 6: 完整評估指標 */}
                {result.metrics ? (
                  <MetricsBadge metrics={result.metrics} />
                ) : (
                  <Badge colorScheme="green">
                    信心度 {Math.round(result.confidence * 100)}%
                  </Badge>
                )}
              </HStack>
              <HStack>
                <Button
                  size="sm"
                  variant="ghost"
                  rightIcon={showResult ? <FiChevronUp /> : <FiChevronDown />}
                  onClick={() => setShowResult(!showResult)}
                >
                  {showResult ? '收合' : '展開'}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  leftIcon={<FiRefreshCw />}
                  onClick={reset}
                >
                  新研究
                </Button>
              </HStack>
            </Flex>
          </CardHeader>
          <Collapse in={showResult}>
            <CardBody pt={0} maxH="calc(100vh - 400px)" overflowY="auto">
              {/* 摘要 */}
              <Box mb={4}>
                <Text fontWeight="medium" color={textColor} mb={2}>
                  摘要
                </Text>
                <Text fontSize="sm" color={subTextColor}>
                  {result.summary}
                </Text>
              </Box>

              {/* Phase 6: 評估分析雷達圖 */}
              {result.metrics && (
                <Box mb={4} p={4} bg={useColorModeValue('gray.50', 'whiteAlpha.50')} borderRadius="lg">
                  <Text fontWeight="medium" color={textColor} mb={3}>
                    📈 評估分析
                  </Text>
                  <Flex justify="center">
                    <EvaluationRadarChart metrics={result.metrics} size="md" />
                  </Flex>
                </Box>
              )}
              
              <Divider mb={4} />

              {/* 詳細報告 */}
              <Box className="markdown-content" sx={{
                '& > *': { wordBreak: 'break-word', overflowWrap: 'break-word' },
                '& pre': { whiteSpace: 'pre-wrap', wordBreak: 'break-word' },
                '& p': { wordBreak: 'break-word' },
              }}>
                <ReactMarkdown rehypePlugins={[rehypeSanitize]}>
                  {result.detailed_answer}
                </ReactMarkdown>
              </Box>

              {/* 來源文件 */}
              {result.all_sources.length > 0 && (
                <Box mt={4}>
                  <Text fontWeight="medium" color={textColor} mb={2}>
                    參考文件 ({result.all_sources.length})
                  </Text>
                  <HStack wrap="wrap" spacing={2}>
                    {result.all_sources.slice(0, 5).map((source, i) => (
                      <Badge key={i} colorScheme="gray" fontSize="xs">
                        {source.slice(0, 8)}...
                      </Badge>
                    ))}
                    {result.all_sources.length > 5 && (
                      <Badge colorScheme="gray" fontSize="xs">
                        +{result.all_sources.length - 5} 更多
                      </Badge>
                    )}
                  </HStack>
                </Box>
              )}
            </CardBody>
          </Collapse>
        </Card>
      )}
    </VStack>
  );
}
