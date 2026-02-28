/**
 * GraphDemo Page - 視覺化元件展示頁面
 *
 * 功能：
 * - 使用真實 API (/graph/data) 取得知識圖譜資料
 * - 控制面板：重置/重算圖譜、優化社群
 * - 若 API 失敗則回退到 Mock Data
 */

import {
  Box,
  Container,
  Heading,
  VStack,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Text,
  useColorModeValue,
  Alert,
  AlertIcon,
  HStack,
  Badge,
  Button,
  useToast,
  Tooltip,
} from '@chakra-ui/react';
import { FiRefreshCw, FiZap } from 'react-icons/fi';
import { KnowledgeGraph } from '../components/graph/KnowledgeGraph';
import { ResearchFlow } from '../components/graph/ResearchFlow';
import {
  useGraphData,
  useGraphStatus,
  useOptimizeGraph,
  useRebuildGraph,
} from '../hooks/useGraphData';

export function GraphDemo() {
  const bgColor = useColorModeValue('gray.50', 'gray.900');
  const cardBg = useColorModeValue('white', 'gray.800');
  const toast = useToast();

  // Queries
  const { data: graphData, isLoading: isGraphLoading, error: graphError } = useGraphData();
  const { data: graphStatus } = useGraphStatus();

  // Mutations
  const optimizeMutation = useOptimizeGraph();
  const rebuildMutation = useRebuildGraph();

  // 優化圖譜處理
  const handleOptimize = () => {
    optimizeMutation.mutate(true, {
      onSuccess: (data) => {
        toast({
          title: '優化完成',
          description: data.message || '社群偵測與實體融合已完成',
          status: 'success',
          duration: 4000,
        });
      },
      onError: (error) => {
        toast({
          title: '優化失敗',
          description: error.message,
          status: 'error',
          duration: 5000,
        });
      },
    });
  };

  // 重建圖譜處理
  const handleRebuild = () => {
    rebuildMutation.mutate(true, {
      onSuccess: (data) => {
        toast({
          title: '重置與重算已啟動',
          description: data.message || '知識圖譜正在重置並重算中',
          status: 'info',
          duration: 4000,
        });
      },
      onError: (error) => {
        toast({
          title: '重建失敗',
          description: error.message,
          status: 'error',
          duration: 5000,
        });
      },
    });
  };

  return (
    <Box bg={bgColor} minH="100vh" py={8}>
      <Container maxW="container.xl">
        <VStack spacing={6} align="stretch">
          {/* 標題與狀態徽章 */}
          <HStack justify="space-between" align="center" flexWrap="wrap" gap={4}>
            <Heading size="lg" color="brand.500">
              📊 視覺化元件展示
            </Heading>
            {graphStatus && (
              <HStack spacing={2} flexWrap="wrap">
                <Badge colorScheme={graphStatus.has_graph ? 'green' : 'gray'}>
                  {graphStatus.has_graph ? '圖譜已建立' : '尚未建立'}
                </Badge>
                {graphStatus.has_graph && (
                  <>
                    <Badge colorScheme="blue">{graphStatus.node_count} 節點</Badge>
                    <Badge colorScheme="purple">{graphStatus.edge_count} 邊</Badge>
                    <Badge colorScheme="orange">{graphStatus.community_count} 社群</Badge>
                  </>
                )}
              </HStack>
            )}
          </HStack>

          {/* 控制面板 */}
          <Box bg={cardBg} p={4} borderRadius="lg" boxShadow="sm">
            <HStack justify="space-between" flexWrap="wrap" gap={4}>
              <Text fontWeight="600" color="gray.600">
                圖譜控制
              </Text>
              <HStack spacing={3}>
                <Tooltip label="重置目前圖譜並重算融合/社群（不重新抽取文件）" hasArrow>
                  <Button
                    leftIcon={<FiRefreshCw />}
                    colorScheme="blue"
                    variant="outline"
                    size="sm"
                    onClick={handleRebuild}
                    isLoading={rebuildMutation.isPending}
                    loadingText="重算中..."
                  >
                    重置並重算
                  </Button>
                </Tooltip>
                <Tooltip label="執行社群偵測和實體融合" hasArrow>
                  <Button
                    leftIcon={<FiZap />}
                    colorScheme="purple"
                    size="sm"
                    onClick={handleOptimize}
                    isLoading={optimizeMutation.isPending}
                    loadingText="優化中..."
                    isDisabled={!graphStatus?.has_graph}
                  >
                    優化社群
                  </Button>
                </Tooltip>
              </HStack>
            </HStack>
          </Box>

          {/* API 錯誤警告 */}
          {graphError && (
            <Alert status="warning" borderRadius="md">
              <AlertIcon />
              <Text>無法連接後端 API，顯示 Mock Data</Text>
            </Alert>
          )}

          {/* 社群為 0 提示 */}
          {graphStatus?.has_graph && graphStatus.community_count === 0 && (
            <Alert status="info" borderRadius="md">
              <AlertIcon />
              <Text>
                圖譜尚未進行社群偵測。點擊「優化社群」可啟用 Global Search 模式。
              </Text>
            </Alert>
          )}

          <Tabs colorScheme="brand" variant="enclosed">
            <TabList>
              <Tab>🔗 知識圖譜</Tab>
              <Tab>🔀 研究流程</Tab>
            </TabList>

            <TabPanels>
              {/* 知識圖譜 Tab */}
              <TabPanel p={0} pt={4}>
                <Box borderRadius="xl" overflow="hidden" boxShadow="lg">
                  <KnowledgeGraph
                    data={graphData}
                    width={1100}
                    height={600}
                    isLoading={isGraphLoading}
                    onNodeClick={(node) => {
                      console.log('Node clicked:', node);
                    }}
                  />
                </Box>
              </TabPanel>

              {/* 研究流程 Tab */}
              <TabPanel p={0} pt={4}>
                <Box borderRadius="xl" overflow="hidden" boxShadow="lg">
                  <ResearchFlow width={1100} height={500} />
                </Box>
              </TabPanel>
            </TabPanels>
          </Tabs>
        </VStack>
      </Container>
    </Box>
  );
}

export default GraphDemo;
