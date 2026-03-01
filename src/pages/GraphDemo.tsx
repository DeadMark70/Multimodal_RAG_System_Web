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
  Flex,
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
  useBreakpointValue,
} from '@chakra-ui/react';
import { FiRefreshCw, FiZap } from 'react-icons/fi';
import { KnowledgeGraph } from '../components/graph/KnowledgeGraph';
import { ResearchFlow } from '../components/graph/ResearchFlow';
import Layout from '../components/layout/Layout';
import PageHeader from '../components/common/PageHeader';
import SurfaceCard from '../components/common/SurfaceCard';
import {
  useGraphData,
  useGraphStatus,
  useOptimizeGraph,
  useRebuildGraph,
} from '../hooks/useGraphData';

export function GraphDemo() {
  const textColor = useColorModeValue('surface.700', 'white');
  const subTextColor = useColorModeValue('surface.500', 'surface.300');
  const graphWidth = useBreakpointValue({ base: 320, md: 760, xl: 1100 }) ?? 1100;
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
    <Layout>
      <PageHeader title="知識圖譜" subtitle="視覺化元件展示與圖譜控制" />

      <VStack spacing={4} align="stretch">
        <SurfaceCard p={4}>
          <Flex justify="space-between" align="center" wrap="wrap" gap={4}>
            <HStack spacing={2} flexWrap="wrap">
              {graphStatus && (
                <>
                  <Badge colorScheme={graphStatus.has_graph ? 'green' : 'gray'}>
                    {graphStatus.has_graph ? '圖譜已建立' : '尚未建立'}
                  </Badge>
                  {graphStatus.has_graph && (
                    <>
                      <Badge colorScheme="blue">{graphStatus.node_count} 節點</Badge>
                      <Badge colorScheme="blue">{graphStatus.edge_count} 邊</Badge>
                      <Badge colorScheme="purple">{graphStatus.community_count} 社群</Badge>
                    </>
                  )}
                </>
              )}
            </HStack>

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
                  colorScheme="blue"
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
          </Flex>
          <Text mt={3} color={subTextColor} fontSize="sm">
            圖譜控制與流程視覺化均使用同一份 API 狀態，便於觀察重算效果。
          </Text>
        </SurfaceCard>

        {graphError && (
          <Alert status="warning" borderRadius="md">
            <AlertIcon />
            <Text>無法連接後端 API，顯示 Mock Data</Text>
          </Alert>
        )}

        {graphStatus?.has_graph && graphStatus.community_count === 0 && (
          <Alert status="info" borderRadius="md">
            <AlertIcon />
            <Text color={textColor}>
              圖譜尚未進行社群偵測。點擊「優化社群」可啟用 Global Search 模式。
            </Text>
          </Alert>
        )}

        <SurfaceCard p={4}>
          <Tabs colorScheme="brand" variant="enclosed">
            <TabList>
              <Tab>知識圖譜</Tab>
              <Tab>研究流程</Tab>
            </TabList>

            <TabPanels>
              <TabPanel p={0} pt={4}>
                <Box borderRadius="12px" overflow="hidden">
                  <KnowledgeGraph
                    data={graphData}
                    width={graphWidth}
                    height={600}
                    isLoading={isGraphLoading}
                    onNodeClick={(node) => {
                      console.log('Node clicked:', node);
                    }}
                  />
                </Box>
              </TabPanel>

              <TabPanel p={0} pt={4}>
                <Box borderRadius="12px" overflow="hidden">
                  <ResearchFlow width={graphWidth} height={500} />
                </Box>
              </TabPanel>
            </TabPanels>
          </Tabs>
        </SurfaceCard>
      </VStack>
    </Layout>
  );
}

export default GraphDemo;
