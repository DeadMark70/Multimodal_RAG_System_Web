/**
 * ResearchFlow - 深度研究流程圖元件
 *
 * 使用 @xyflow/react 展示 Plan-and-Solve 的任務拆解與執行狀態
 *
 * @remarks
 * - DAG 結構：原始問題 → 子任務 → 總結
 * - 節點狀態：Pending → Loading → Success / Error
 * - 整合 useSessionStore.subTasks
 */

import { useCallback, useMemo } from 'react';
import {
  ReactFlow,
  type Node,
  type Edge,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  Handle,
  Position,
  type NodeProps,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import {
  Box,
  Text,
  HStack,
  Badge,
  Spinner,
  Icon,
  useColorModeValue,
} from '@chakra-ui/react';
import { FiCheckCircle, FiAlertCircle, FiCircle, FiLoader } from 'react-icons/fi';
import type { SubTaskState } from '../../stores';

// ========== 節點狀態圖示 ==========

const STATUS_CONFIG = {
  pending: { icon: FiCircle, color: 'blue.400', label: '等待中' },
  loading: { icon: FiLoader, color: 'yellow.400', label: '執行中' },
  success: { icon: FiCheckCircle, color: 'green.400', label: '完成' },
  error: { icon: FiAlertCircle, color: 'red.400', label: '失敗' },
};

// ========== 自訂節點：問題節點 ==========

function QuestionNode({ data }: NodeProps) {
  const bgColor = useColorModeValue('brand.500', 'brand.400');

  return (
    <Box
      bg={bgColor}
      color="white"
      px={4}
      py={3}
      borderRadius="lg"
      boxShadow="lg"
      minW="200px"
      maxW="300px"
    >
      <Text fontSize="xs" fontWeight="600" opacity={0.8} mb={1}>
        研究問題
      </Text>
      <Text fontSize="sm" fontWeight="500">
        {String(data.label ?? '')}
      </Text>
      <Handle type="source" position={Position.Bottom} />
    </Box>
  );
}

// ========== 自訂節點：子任務節點 ==========

function SubTaskNode({ data }: NodeProps) {
  const status = (data.status as SubTaskState['status']) ?? 'pending';
  const config = STATUS_CONFIG[status];
  const bgColor = useColorModeValue('white', 'gray.700');
  const borderColor = useColorModeValue('gray.200', 'gray.600');

  return (
    <Box
      bg={bgColor}
      border="2px solid"
      borderColor={status === 'loading' ? 'yellow.400' : borderColor}
      px={4}
      py={3}
      borderRadius="lg"
      boxShadow="md"
      minW="180px"
      maxW="250px"
      transition="all 0.2s"
      _hover={{ boxShadow: 'lg' }}
    >
      <Handle type="target" position={Position.Top} />

      <HStack justify="space-between" mb={2}>
        <Badge colorScheme={status === 'success' ? 'green' : status === 'error' ? 'red' : 'gray'}>
          子任務 {String(data.taskId ?? '')}
        </Badge>
        {status === 'loading' ? (
          <Spinner size="xs" color="yellow.400" />
        ) : (
          <Icon as={config.icon} color={config.color} />
        )}
      </HStack>

      <Text fontSize="sm" fontWeight="500" noOfLines={2}>
        {String(data.label ?? '')}
      </Text>

      {!!data.answer && status === 'success' && (
        <Text fontSize="xs" color="gray.500" mt={2} noOfLines={2}>
          {String(data.answer)}
        </Text>
      )}

      <Handle type="source" position={Position.Bottom} />
    </Box>
  );
}

// ========== 自訂節點：總結節點 ==========

function SummaryNode({ data }: NodeProps) {
  const successBg = useColorModeValue('green.500', 'green.400');
  const pendingBg = useColorModeValue('gray.300', 'gray.600');
  const status = data.status as SubTaskState['status'] | undefined;

  return (
    <Box
      bg={status === 'success' ? successBg : pendingBg}
      color={status === 'success' ? 'white' : 'gray.500'}
      px={4}
      py={3}
      borderRadius="lg"
      boxShadow="lg"
      minW="200px"
      maxW="300px"
    >
      <Handle type="target" position={Position.Top} />
      
      <HStack justify="space-between" mb={1}>
        <Text fontSize="xs" fontWeight="600" opacity={0.8}>
          研究總結
        </Text>
        {status === 'success' && <Icon as={FiCheckCircle} />}
      </HStack>
      <Text fontSize="sm" fontWeight="500">
        {String(data.label ?? '')}
      </Text>
    </Box>
  );
}

// ========== 節點類型註冊 ==========

const nodeTypes = {
  question: QuestionNode,
  subtask: SubTaskNode,
  summary: SummaryNode,
};

// ========== Mock Data ==========

const MOCK_SUBTASKS: SubTaskState[] = [
  { id: 1, question: '深度學習的主要優點有哪些？', status: 'success', answer: '自動特徵提取、高準確度...' },
  { id: 2, question: '傳統機器學習的優點有哪些？', status: 'success', answer: '可解釋性強、資料需求少...' },
  { id: 3, question: '深度學習的主要缺點有哪些？', status: 'loading' },
  { id: 4, question: '傳統機器學習的缺點有哪些？', status: 'pending' },
];

// ========== 工具函數：生成節點和邊 ==========

function generateFlowData(
  question: string,
  subTasks: SubTaskState[]
): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  // 問題節點
  nodes.push({
    id: 'question',
    type: 'question',
    position: { x: 250, y: 0 },
    data: { label: question },
  });

  // 子任務節點
  const taskWidth = 220;
  const totalWidth = subTasks.length * taskWidth;
  const startX = (500 - totalWidth) / 2 + taskWidth / 2;

  subTasks.forEach((task, index) => {
    const nodeId = `subtask-${task.id}`;
    nodes.push({
      id: nodeId,
      type: 'subtask',
      position: { x: startX + index * taskWidth, y: 120 },
      data: {
        label: task.question,
        taskId: task.id,
        status: task.status,
        answer: task.answer,
      },
    });

    // 從問題到子任務的邊
    edges.push({
      id: `e-question-${nodeId}`,
      source: 'question',
      target: nodeId,
      animated: task.status === 'loading',
    });
  });

  // 總結節點
  const allCompleted = subTasks.every((t) => t.status === 'success');
  nodes.push({
    id: 'summary',
    type: 'summary',
    position: { x: 250, y: 280 },
    data: {
      label: allCompleted ? '綜合分析完成' : '等待子任務完成...',
      status: allCompleted ? 'success' : 'pending',
    },
  });

  // 從子任務到總結的邊
  subTasks.forEach((task) => {
    edges.push({
      id: `e-subtask-${task.id}-summary`,
      source: `subtask-${task.id}`,
      target: 'summary',
      animated: task.status === 'loading',
    });
  });

  return { nodes, edges };
}

// ========== 介面定義 ==========

export interface ResearchFlowProps {
  /** 研究問題 */
  question?: string;
  /** 子任務列表 (不提供則使用 Mock Data) */
  subTasks?: SubTaskState[];
  /** 元件寬度 */
  width?: number;
  /** 元件高度 */
  height?: number;
}

// ========== 主元件 ==========

export function ResearchFlow({
  question = '比較深度學習和傳統機器學習的優缺點',
  subTasks,
  width = 800,
  height = 450,
}: ResearchFlowProps) {
  const bgColor = useColorModeValue('#f8fafc', '#1a202c');
  
  // 使用 Mock Data 如果沒有提供
  const tasks = useMemo(() => subTasks ?? MOCK_SUBTASKS, [subTasks]);
  
  // 生成節點和邊
  const { nodes: initialNodes, edges: initialEdges } = useMemo(
    () => generateFlowData(question, tasks),
    [question, tasks]
  );

  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, , onEdgesChange] = useEdgesState(initialEdges);

  // 當 tasks 變化時更新節點
  const onNodeClick = useCallback((_event: React.MouseEvent, node: Node) => {
    if (node.type === 'subtask' && node.data.status === 'success') {
      // 可以在這裡觸發顯示子報告的 modal
    }
  }, []);

  return (
    <Box
      w={width}
      h={height}
      bg={bgColor}
      borderRadius="xl"
      overflow="hidden"
      border="1px solid"
      borderColor={useColorModeValue('gray.200', 'gray.700')}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        proOptions={{ hideAttribution: true }}
      >
        <Background color={useColorModeValue('#e2e8f0', '#2d3748')} gap={16} />
        <Controls />
        <MiniMap
          nodeColor={(n) => {
            if (n.type === 'question') return '#7c3aed';
            if (n.type === 'summary') return '#10b981';
            const status = n.data?.status as SubTaskState['status'];
            if (status === 'success') return '#10b981';
            if (status === 'error') return '#ef4444';
            if (status === 'loading') return '#f59e0b';
            return '#9ca3af';
          }}
          maskColor={useColorModeValue('rgb(255, 255, 255, 0.8)', 'rgb(0, 0, 0, 0.8)')}
        />
      </ReactFlow>
    </Box>
  );
}

export default ResearchFlow;
