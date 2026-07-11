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
  Spinner,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Progress,
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
  Heading,
  Input,
  Select,
  SimpleGrid,
  AlertDialog,
  AlertDialogBody,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogOverlay,
} from '@chakra-ui/react';
import { useMemo, useRef, useState } from 'react';
import { FiChevronDown, FiChevronUp, FiCpu, FiRefreshCw, FiRotateCcw, FiTrash2, FiZap } from 'react-icons/fi';
import { KnowledgeGraph } from '../components/graph/KnowledgeGraph';
import { GraphRebuildProgress } from '../components/graph/GraphRebuildProgress';
import { ResearchFlow } from '../components/graph/ResearchFlow';
import Layout from '../components/layout/Layout';
import PageHeader from '../components/common/PageHeader';
import SurfaceCard from '../components/common/SurfaceCard';
import {
  useGraphData,
  useGraphDocuments,
  useFullGraphRebuildStatus,
  useNodeVectorSyncStatus,
  useGraphStatus,
  useOptimizeGraph,
  usePurgeGraphDocument,
  useRebuildFullGraph,
  useResumeFullGraphRebuild,
  useRebuildGraph,
  useRetryGraphDocument,
  useStartNodeVectorSync,
  useDebugGraphSearch,
  useGraphQuality,
  useGraphRuntimeQuality,
} from '../hooks/useGraphData';
import type { GraphDocumentStatusItem, GraphExtractionProfile, GraphSearchMode } from '../types/graph';

const STATUS_META: Record<GraphDocumentStatusItem['status'], { colorScheme: string; label: string }> = {
  indexed: { colorScheme: 'green', label: '成功' },
  partial: { colorScheme: 'orange', label: '部分成功' },
  empty: { colorScheme: 'yellow', label: '0 實體' },
  failed: { colorScheme: 'red', label: '失敗' },
  running: { colorScheme: 'blue', label: '執行中' },
  skipped: { colorScheme: 'gray', label: '未建圖' },
};
const EMPTY_GRAPH_DOCUMENTS: GraphDocumentStatusItem[] = [];

export function GraphDemo() {
  const textColor = useColorModeValue('surface.700', 'white');
  const subTextColor = useColorModeValue('surface.500', 'surface.300');
  const graphWidth = useBreakpointValue({ base: 320, md: 760, xl: 1100 }) ?? 1100;
  const toast = useToast();
  const [showDocumentList, setShowDocumentList] = useState(false);
  const [debugQuery, setDebugQuery] = useState('');
  const [debugSearchMode, setDebugSearchMode] = useState<GraphSearchMode>('generic');
  const [runtimeCampaignId, setRuntimeCampaignId] = useState('');
  const [highPrecisionDoc, setHighPrecisionDoc] = useState<GraphDocumentStatusItem | null>(null);
  const highPrecisionCancelRef = useRef<HTMLButtonElement>(null);

  // Queries
  const { data: graphData, isLoading: isGraphLoading, error: graphError } = useGraphData();
  const { data: graphStatus } = useGraphStatus();
  const {
    data: graphDocumentsResponse,
    isLoading: isGraphDocumentsLoading,
    error: graphDocumentsError,
  } = useGraphDocuments();
  const { data: fullRebuildStatus } = useFullGraphRebuildStatus();
  const { data: nodeVectorSyncStatus } = useNodeVectorSyncStatus();
  const { data: graphQuality } = useGraphQuality();
  const { data: graphRuntimeQuality } = useGraphRuntimeQuality(runtimeCampaignId);

  // Mutations
  const optimizeMutation = useOptimizeGraph();
  const rebuildMutation = useRebuildGraph();
  const rebuildFullMutation = useRebuildFullGraph();
  const resumeFullRebuildMutation = useResumeFullGraphRebuild();
  const retryMutation = useRetryGraphDocument();
  const purgeMutation = usePurgeGraphDocument();
  const startNodeVectorSyncMutation = useStartNodeVectorSync();
  const debugSearchMutation = useDebugGraphSearch();
  const graphDocuments = graphDocumentsResponse?.documents ?? EMPTY_GRAPH_DOCUMENTS;
  const actionableDocuments = graphDocuments.filter((doc) =>
    ['failed', 'partial', 'empty'].includes(doc.status)
  );
  const graphJobActive = Boolean(
    graphStatus?.active_job_state
    || (fullRebuildStatus && !['completed', 'failed'].includes(fullRebuildStatus.state))
  );
  const nodeVectorSyncRunning = nodeVectorSyncStatus?.state === 'running';
  const nodeVectorSyncProgressPercent =
    nodeVectorSyncStatus && nodeVectorSyncStatus.total > 0
      ? Math.min(100, Math.round((nodeVectorSyncStatus.processed / nodeVectorSyncStatus.total) * 100))
      : 0;
  const graphDocumentSummary = useMemo(
    () =>
      graphDocuments.reduce(
        (summary, doc) => {
          summary[doc.status] += 1;
          return summary;
        },
        {
          indexed: 0,
          partial: 0,
          empty: 0,
          failed: 0,
          running: 0,
          skipped: 0,
        } satisfies Record<GraphDocumentStatusItem['status'], number>
      ),
    [graphDocuments]
  );

  const handleDebugSearch = () => {
    const query = debugQuery.trim();
    if (!query) return;
    debugSearchMutation.mutate({ query, search_mode: debugSearchMode });
  };

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

  const handleFullRebuild = () => {
    rebuildFullMutation.mutate(undefined, {
      onSuccess: (data) => {
        toast({
          title: data.state === 'completed_with_failures' ? '完整重構等待失敗文件重試' : '完整重構已啟動',
          description: `重構工作已建立，共 ${data.total} 份文件。`,
          status: data.state === 'completed_with_failures' ? 'warning' : 'info',
          duration: 5000,
        });
      },
      onError: (error) => {
        toast({
          title: '完整重構失敗',
          description: error.message,
          status: 'error',
          duration: 5000,
        });
      },
    });
  };

  const handleResumeFullRebuild = () => {
    resumeFullRebuildMutation.mutate(undefined, {
      onSuccess: (data) => {
        toast({
          title: data.state === 'completed_with_failures' ? '仍有失敗文件待重試' : '完整重構已繼續',
          description: `已恢復重構工作，共 ${data.total} 份文件。`,
          status: data.state === 'completed_with_failures' ? 'warning' : 'info',
          duration: 5000,
        });
      },
      onError: (error) => {
        toast({
          title: '無法繼續完整重構',
          description: error.message,
          status: 'error',
          duration: 5000,
        });
      },
    });
  };

  const handleRetryDocument = (
    doc: GraphDocumentStatusItem,
    extractionProfile: GraphExtractionProfile = 'standard',
  ) => {
    retryMutation.mutate({ docId: doc.doc_id, extractionProfile }, {
      onSuccess: (data) => {
        toast({
          title: data.status === 'skipped'
            ? '未啟動重試'
            : extractionProfile === 'high_precision'
              ? '高精度文件重試已啟動'
              : '文件重試已啟動',
          description: `${doc.file_name ?? doc.doc_id}：${data.message}`,
          status: data.status === 'skipped' ? 'warning' : 'info',
          duration: 5000,
        });
      },
      onError: (error) => {
        toast({
          title: '文件重試失敗',
          description: `${doc.file_name ?? doc.doc_id}：${error.message}`,
          status: 'error',
          duration: 5000,
        });
      },
    });
  };

  const handleConfirmHighPrecisionRetry = () => {
    if (highPrecisionDoc) {
      handleRetryDocument(highPrecisionDoc, 'high_precision');
    }
    setHighPrecisionDoc(null);
  };

  const handlePurgeDocument = (doc: GraphDocumentStatusItem) => {
    purgeMutation.mutate(doc.doc_id, {
      onSuccess: (data) => {
        toast({
          title: data.status === 'skipped' ? '未移除殘留圖譜' : '殘留圖譜移除已啟動',
          description: `${doc.file_name ?? doc.doc_id}：${data.message}`,
          status: data.status === 'skipped' ? 'warning' : 'info',
          duration: 5000,
        });
      },
      onError: (error) => {
        toast({
          title: '移除殘留圖譜失敗',
          description: `${doc.file_name ?? doc.doc_id}：${error.message}`,
          status: 'error',
          duration: 5000,
        });
      },
    });
  };

  const handleStartNodeVectorSync = () => {
    startNodeVectorSyncMutation.mutate(undefined, {
      onSuccess: (data) => {
        toast({
          title: data.status === 'skipped' ? '未啟動嵌入同步' : '嵌入同步已啟動',
          description: data.message,
          status: data.status === 'skipped' ? 'warning' : 'info',
          duration: 5000,
        });
      },
      onError: (error) => {
        toast({
          title: '啟動嵌入同步失敗',
          description: error.message,
          status: 'error',
          duration: 5000,
        });
      },
    });
  };

  return (
    <Layout>
      <Flex direction="column" flex={1} minH={0} overflow="hidden">
        <Box flexShrink={0}>
          <PageHeader title="知識圖譜" subtitle="視覺化元件展示與圖譜控制" />
        </Box>

        <Box
          flex={1}
          minH={0}
          overflowY="auto"
          pr={{ base: 1, md: 2 }}
          pb={2}
          data-testid="graph-demo-scroll-region"
        >
          <VStack spacing={4} align="stretch">
            {fullRebuildStatus && (
              <GraphRebuildProgress
                status={fullRebuildStatus}
                isActionPending={resumeFullRebuildMutation.isPending}
                onResume={handleResumeFullRebuild}
              />
            )}
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
                      <Badge colorScheme="teal">{graphStatus.eligible_document_count} 可重構文件</Badge>
                      <Badge colorScheme="green">{graphStatus.indexed_document_count} 已建圖</Badge>
                      <Badge colorScheme="red">{graphStatus.failed_document_count} 失敗</Badge>
                      <Badge colorScheme="orange">{graphStatus.partial_document_count} 部分成功</Badge>
                      <Badge colorScheme="yellow">{graphStatus.empty_document_count} 0 實體</Badge>
                    </>
                  )}
                  {graphStatus.active_job_state && (
                    <Badge colorScheme="orange">執行中: {graphStatus.active_job_state}</Badge>
                  )}
                </>
              )}
            </HStack>

            <HStack spacing={3}>
              <Tooltip label="從所有 OCR 文件重新抽取，建立一份新的完整圖譜" hasArrow>
                <Button
                  leftIcon={<FiRotateCcw />}
                  colorScheme="orange"
                  variant="solid"
                  size="sm"
                  onClick={handleFullRebuild}
                  isLoading={rebuildFullMutation.isPending}
                  loadingText="完整重構中..."
                  isDisabled={graphJobActive || (graphStatus?.eligible_document_count ?? 0) === 0}
                >
                  完整重構
                </Button>
              </Tooltip>
              <Tooltip label="重置目前圖譜並重算融合/社群（不重新抽取文件）" hasArrow>
                <Button
                  leftIcon={<FiRefreshCw />}
                  colorScheme="blue"
                  variant="outline"
                  size="sm"
                  onClick={handleRebuild}
                  isLoading={rebuildMutation.isPending}
                  loadingText="重算中..."
                  isDisabled={graphJobActive}
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
                  isDisabled={!graphStatus?.has_graph || graphJobActive}
                >
                  優化社群
                </Button>
              </Tooltip>
              <Tooltip label="手動補齊舊圖譜節點的向量嵌入索引（背景執行）" hasArrow>
                <Button
                  leftIcon={<FiCpu />}
                  colorScheme="teal"
                  size="sm"
                  onClick={handleStartNodeVectorSync}
                  isLoading={startNodeVectorSyncMutation.isPending}
                  loadingText="啟動中..."
                  isDisabled={graphJobActive || nodeVectorSyncRunning}
                >
                  補齊節點嵌入
                </Button>
              </Tooltip>
            </HStack>
          </Flex>
          <Text mt={3} color={subTextColor} fontSize="sm">
            圖譜控制與流程視覺化均使用同一份 API 狀態，便於觀察重算效果。
          </Text>
          {nodeVectorSyncStatus && nodeVectorSyncStatus.state !== 'idle' && (
            <Box mt={3}>
              <HStack justify="space-between" mb={2}>
                <Badge
                  colorScheme={
                    nodeVectorSyncStatus.state === 'completed'
                      ? 'green'
                      : nodeVectorSyncStatus.state === 'failed'
                        ? 'red'
                        : 'blue'
                  }
                >
                  節點嵌入同步：{nodeVectorSyncStatus.state}
                </Badge>
                <Text color={subTextColor} fontSize="sm">
                  {nodeVectorSyncStatus.processed}/{nodeVectorSyncStatus.total}
                </Text>
              </HStack>
              <Progress
                value={nodeVectorSyncProgressPercent}
                size="sm"
                borderRadius="md"
                colorScheme={nodeVectorSyncStatus.state === 'failed' ? 'red' : 'teal'}
              />
              <Text mt={2} color={subTextColor} fontSize="sm">
                changed {nodeVectorSyncStatus.changed} / reused {nodeVectorSyncStatus.reused} / removed{' '}
                {nodeVectorSyncStatus.removed}
              </Text>
              {nodeVectorSyncStatus.last_error && (
                <Text mt={1} color="red.500" fontSize="sm">
                  {nodeVectorSyncStatus.last_error}
                </Text>
              )}
            </Box>
          )}
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
                  {actionableDocuments.length > 0
                    ? '目前社群為 0，且有文件建圖失敗/0 實體。可先完整重構，或對下方文件逐一重試。'
                    : '圖譜尚未進行社群偵測。點擊「優化社群」可啟用 Global Search 模式。'}
                </Text>
              </Alert>
            )}

            {graphDocumentsError && (
              <Alert status="warning" borderRadius="md">
                <AlertIcon />
                <Text>無法取得文件級 GraphRAG 狀態：{graphDocumentsError.message}</Text>
              </Alert>
            )}

            <SurfaceCard p={4}>
              <Flex justify="space-between" align="start" gap={4} wrap="wrap">
                <Box>
                  <Heading size="sm" color={textColor}>Graph Quality</Heading>
                  <Text mt={1} color={subTextColor} fontSize="sm">
                    Static graph integrity is separate from campaign runtime violations.
                  </Text>
                </Box>
                <Badge colorScheme={graphQuality && graphQuality.score < 70 ? 'red' : 'green'}>
                  {graphQuality ? `${graphQuality.score}/100` : 'Loading'}
                </Badge>
              </Flex>
              {graphQuality && (
                <>
                  <SimpleGrid mt={4} columns={{ base: 2, md: 4 }} spacing={3} fontSize="sm">
                    <Text>Nodes: {graphQuality.num_nodes}</Text>
                    <Text>Edges: {graphQuality.num_edges}</Text>
                    <Text>Full provenance: {Math.round(graphQuality.edge_with_provenance_ratio * 100)}%</Text>
                    <Text>Orphans: {Math.round(graphQuality.orphan_node_ratio * 100)}%</Text>
                  </SimpleGrid>
                  <VStack mt={4} align="stretch" spacing={2}>
                    {graphQuality.issues.length === 0 ? (
                      <Text color={subTextColor} fontSize="sm">No static graph issues detected.</Text>
                    ) : graphQuality.issues.map((issue) => (
                      <Box key={issue.code} borderLeftWidth="3px" borderColor={issue.severity === 'critical' ? 'red.400' : 'orange.400'} pl={3}>
                        <Text fontSize="sm" fontWeight="semibold">{issue.message}</Text>
                        <Text color={subTextColor} fontSize="sm">{issue.recommended_action}</Text>
                      </Box>
                    ))}
                  </VStack>
                </>
              )}
              <HStack mt={4} spacing={2} align="end" flexWrap="wrap">
                <Input
                  aria-label="Runtime campaign id"
                  value={runtimeCampaignId}
                  onChange={(event) => setRuntimeCampaignId(event.target.value)}
                  placeholder="Campaign ID for runtime quality"
                  maxW="320px"
                  size="sm"
                />
                {graphRuntimeQuality && (
                  <Text color={subTextColor} fontSize="sm">
                    unresolved {graphRuntimeQuality.unresolved_anchor_count} / noise {graphRuntimeQuality.graph_context_noise_ratio ?? 'n/a'}
                  </Text>
                )}
              </HStack>
            </SurfaceCard>

            <SurfaceCard p={4}>
              <Heading size="sm" color={textColor}>Query Debugger</Heading>
              <HStack mt={3} spacing={2} align="end" flexWrap="wrap">
                <Input
                  aria-label="Graph debug query"
                  value={debugQuery}
                  onChange={(event) => setDebugQuery(event.target.value)}
                  placeholder="Inspect graph route and evidence eligibility"
                  minW={{ base: '100%', md: '360px' }}
                  size="sm"
                />
                <Select aria-label="Graph debug search mode" value={debugSearchMode} onChange={(event) => setDebugSearchMode(event.target.value as GraphSearchMode)} size="sm" maxW="150px">
                  <option value="generic">generic</option>
                  <option value="local">local</option>
                  <option value="global">global</option>
                  <option value="hybrid">hybrid</option>
                </Select>
                <Button aria-label="Run graph debug search" size="sm" onClick={handleDebugSearch} isLoading={debugSearchMutation.isPending} isDisabled={!debugQuery.trim()}>
                  Run
                </Button>
              </HStack>
              {debugSearchMutation.data && (
                <Box mt={4} fontSize="sm">
                  <HStack spacing={3} mb={3} flexWrap="wrap">
                    <Badge colorScheme="blue">route: {debugSearchMutation.data.route}</Badge>
                    <Badge>{debugSearchMutation.data.entity_links.length} entity links</Badge>
                    <Badge>{debugSearchMutation.data.evidence_items.length} evidence items</Badge>
                    <Badge colorScheme="green">{debugSearchMutation.data.final_context_items.length} final-context eligible</Badge>
                  </HStack>
                  <VStack align="stretch" spacing={2}>
                    {debugSearchMutation.data.evidence_items.map((item) => (
                      <Box key={item.item_id} borderWidth="1px" borderColor="surface.200" p={3}>
                        <Flex justify="space-between" gap={3} wrap="wrap">
                          <Text fontWeight="semibold">{item.summary}</Text>
                          <Badge colorScheme={item.usable_as_context ? 'green' : 'gray'}>{item.usable_as_context ? 'eligible' : 'not eligible'}</Badge>
                        </Flex>
                        <Text color={subTextColor} mt={1}>{item.provenance_status} / {item.resolution_status} / {item.verification_status}</Text>
                        <Text color={subTextColor}>{item.use_reason}</Text>
                      </Box>
                    ))}
                  </VStack>
                </Box>
              )}
            </SurfaceCard>

            <SurfaceCard p={4}>
          <Flex justify="space-between" align="center" mb={4} gap={4} wrap="wrap">
            <Box>
              <Heading size="sm" color={textColor}>
                文件級 GraphRAG 狀態
              </Heading>
              <Text mt={1} color={subTextColor} fontSize="sm">
                可直接找出 failed / partial / empty 文件重試，或清掉已刪文件殘留的 orphan graph。
              </Text>
            </Box>
            <HStack spacing={2} flexWrap="wrap" justify="flex-end">
              <Badge colorScheme="blue">{graphDocumentsResponse?.total ?? 0} 份文件</Badge>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowDocumentList((value) => !value)}
                leftIcon={showDocumentList ? <FiChevronUp /> : <FiChevronDown />}
              >
                {showDocumentList ? '收合列表' : '展開列表'}
              </Button>
            </HStack>
          </Flex>

          <HStack spacing={2} mb={4} flexWrap="wrap">
            <Badge colorScheme="red">{graphDocumentSummary.failed} 失敗</Badge>
            <Badge colorScheme="orange">{graphDocumentSummary.partial} 部分成功</Badge>
            <Badge colorScheme="yellow">{graphDocumentSummary.empty} 0 實體</Badge>
            <Badge colorScheme="green">{graphDocumentSummary.indexed} 已建圖</Badge>
            {graphDocumentSummary.running > 0 && (
              <Badge colorScheme="blue">{graphDocumentSummary.running} 執行中</Badge>
            )}
            {graphDocumentSummary.skipped > 0 && (
              <Badge colorScheme="gray">{graphDocumentSummary.skipped} 未建圖</Badge>
            )}
          </HStack>

          {isGraphDocumentsLoading ? (
            <HStack spacing={3} color={subTextColor}>
              <Spinner size="sm" />
              <Text fontSize="sm">讀取文件狀態中...</Text>
            </HStack>
          ) : graphDocuments.length === 0 ? (
            <Text color={subTextColor} fontSize="sm">
              尚未找到可用的 GraphRAG 文件狀態。
            </Text>
          ) : !showDocumentList ? (
            <Text color={subTextColor} fontSize="sm">
              文件列表預設收合，展開後可在卡片內捲動，不會再把下方圖譜推離視窗。
            </Text>
          ) : (
            <Box
              maxH={{ base: '320px', md: '400px' }}
              overflowY="auto"
              pr={1}
              data-testid="graph-document-list-scroll-region"
            >
              <VStack spacing={3} align="stretch">
                {graphDocuments.map((doc) => (
                  <Box
                    key={doc.doc_id}
                    borderWidth="1px"
                    borderRadius="lg"
                    borderColor="surface.200"
                    p={3}
                  >
                    <Flex justify="space-between" align="start" gap={4} wrap="wrap">
                      <Box flex="1" minW="260px">
                        <HStack spacing={2} flexWrap="wrap" mb={2}>
                          <Text fontWeight="semibold" color={textColor}>
                            {doc.file_name ?? doc.doc_id}
                          </Text>
                          <Badge colorScheme={STATUS_META[doc.status].colorScheme}>
                            {STATUS_META[doc.status].label}
                          </Badge>
                          {!doc.is_eligible && <Badge colorScheme="gray">無 OCR artifact</Badge>}
                        </HStack>

                        <HStack spacing={3} flexWrap="wrap" color={subTextColor} fontSize="sm">
                          <Text>chunks {doc.chunks_succeeded}/{doc.chunk_count}</Text>
                          <Text>{doc.entities_added} 節點</Text>
                          <Text>{doc.edges_added} 邊</Text>
                        </HStack>

                        <Text mt={2} color={subTextColor} fontSize="xs">
                          {doc.extraction_model
                            ? `抽取：${doc.extraction_model} / ${doc.extraction_thinking_level ?? '未記錄'} / ${doc.extraction_profile ?? '未記錄'}`
                            : '抽取 policy：舊圖譜，未記錄'}
                        </Text>

                        {doc.last_error && (
                          <Text mt={2} color="red.500" fontSize="sm">
                            {doc.last_error}
                          </Text>
                        )}
                      </Box>

                      {doc.is_eligible ? (
                        <HStack spacing={2}>
                          <Button
                            size="sm"
                            colorScheme="orange"
                            variant="outline"
                            onClick={() => handleRetryDocument(doc)}
                            isLoading={retryMutation.isPending && retryMutation.variables?.docId === doc.doc_id}
                            loadingText="重試中..."
                            isDisabled={graphJobActive}
                          >
                            重試此文件
                          </Button>
                          <Button
                            size="sm"
                            colorScheme="teal"
                            variant="outline"
                            onClick={() => setHighPrecisionDoc(doc)}
                            isDisabled={graphJobActive}
                          >
                            高精度重試
                          </Button>
                        </HStack>
                      ) : (
                        <Button
                          size="sm"
                          leftIcon={<FiTrash2 />}
                          colorScheme="red"
                          variant="outline"
                          onClick={() => handlePurgeDocument(doc)}
                          isLoading={purgeMutation.isPending && purgeMutation.variables === doc.doc_id}
                          loadingText="移除中..."
                          isDisabled={graphJobActive}
                        >
                          移除殘留圖譜
                        </Button>
                      )}
                    </Flex>
                  </Box>
                ))}
              </VStack>
            </Box>
          )}
            </SurfaceCard>

            <SurfaceCard p={4}>
              <Tabs colorScheme="brand" variant="enclosed" isLazy lazyBehavior="keepMounted">
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
        </Box>
      </Flex>
      <AlertDialog
        isOpen={Boolean(highPrecisionDoc)}
        leastDestructiveRef={highPrecisionCancelRef}
        onClose={() => setHighPrecisionDoc(null)}
      >
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader>確認高精度重試</AlertDialogHeader>
            <AlertDialogBody>
              僅重新抽取此文件並刷新社群；若工作失敗，現有圖譜會保留不變。
            </AlertDialogBody>
            <AlertDialogFooter>
              <Button ref={highPrecisionCancelRef} onClick={() => setHighPrecisionDoc(null)}>
                取消
              </Button>
              <Button colorScheme="teal" ml={3} onClick={handleConfirmHighPrecisionRetry}>
                確認高精度重試
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </Layout>
  );
}

export default GraphDemo;
