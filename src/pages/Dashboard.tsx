
import Layout from '../components/layout/Layout';
import PageHeader from '../components/common/PageHeader';
import { 
  Badge,
  Box,
  SimpleGrid, 
  CardBody, 
  CardHeader,
  Flex,
  HStack,
  Icon,
  Table,
  Tbody,
  Td,
  Text, 
  Thead,
  Tr,
  Th,
  Spinner,
  useColorModeValue,
} from '@chakra-ui/react';
import { FiActivity, FiAlertTriangle, FiCheckCircle, FiClock, FiFileText } from 'react-icons/fi';
import useDashboardStats from '../hooks/useDashboardStats';
import { useDocumentList } from '../hooks/useDocuments';
import { useGraphDocuments, useGraphStatus } from '../hooks/useGraphData';
import DocumentGraphStatusChart from '../components/charts/DocumentGraphStatusChart';
import QueryTrendChart from '../components/charts/QueryTrendChart';
import SurfaceCard from '../components/common/SurfaceCard';
import MetricCard from '../components/common/MetricCard';

const ACTIVE_DOCUMENT_STEPS = new Set([
  'uploading',
  'ocr',
  'indexing',
  'image_analysis',
  'graph_indexing',
  'translating',
  'generating_pdf',
]);

export default function Dashboard() {
  const { data: stats, isLoading, error } = useDashboardStats();
  const {
    data: documents = [],
    isLoading: isDocumentsLoading,
    error: documentsError,
  } = useDocumentList();
  const { data: graphStatus, isLoading: isGraphStatusLoading, error: graphStatusError } = useGraphStatus();
  const {
    data: graphDocumentsResponse,
    isLoading: isGraphDocumentsLoading,
    error: graphDocumentsError,
  } = useGraphDocuments();
  
  const textColor = useColorModeValue('surface.700', 'white');
  const subTextColor = useColorModeValue('surface.500', 'surface.300');
  const successIconBg = useColorModeValue('green.50', 'green.900');
  const successIconColor = useColorModeValue('green.600', 'green.200');
  const warningIconBg = useColorModeValue('orange.50', 'orange.900');
  const warningIconColor = useColorModeValue('orange.600', 'orange.200');

  const isDashboardLoading =
    isLoading || isDocumentsLoading || isGraphStatusLoading || isGraphDocumentsLoading;

  if (isDashboardLoading) {
    return (
      <Layout>
        <PageHeader title="儀表板" subtitle="RAG 實驗總覽" variant="dashboard" />
        <Flex justify="center" align="center" h="300px">
          <Spinner size="xl" color="brand.500" />
        </Flex>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <PageHeader title="儀表板" subtitle="RAG 實驗總覽" variant="dashboard" />
        <Box textAlign="center" py={10}>
          <Text color="red.500">載入失敗：{error.message}</Text>
          <Text color={subTextColor} mt={2}>請確認後端服務是否正常運作</Text>
        </Box>
      </Layout>
    );
  }

  // 使用真實資料或預設值
  const totalQueries = stats?.total_queries ?? 0;
  const queriesLast7Days = stats?.queries_last_7_days ?? [0, 0, 0, 0, 0, 0, 0];
  const topDocuments = stats?.top_documents ?? [];
  const graphDocuments = graphDocumentsResponse?.documents ?? [];
  const documentCount = documents.length;

  const processingDocumentCount = documents.filter((document) =>
    document.processing_step ? ACTIVE_DOCUMENT_STEPS.has(document.processing_step) : false
  ).length;
  const failedDocumentCount = documents.filter(
    (document) =>
      document.processing_step === 'index_failed' ||
      document.status === 'failed'
  ).length;

  const graphIndexedCount = graphStatus?.indexed_document_count ?? 0;
  const graphEligibleCount = graphStatus?.eligible_document_count ?? 0;
  const graphCoverageRate =
    graphEligibleCount > 0 ? graphIndexedCount / graphEligibleCount : 0;

  const graphSkippedCount = graphDocuments.filter((document) => document.status === 'skipped').length;
  const graphRunningCount = graphDocuments.filter((document) => document.status === 'running').length;
  const graphIssueCount = graphDocuments.filter((document) =>
    ['failed', 'partial', 'empty'].includes(document.status)
  ).length;
  const failedOrPendingCount =
    processingDocumentCount +
    failedDocumentCount +
    graphSkippedCount +
    graphRunningCount +
    graphIssueCount;

  const statusDistribution = [
    { name: '文件處理中', value: processingDocumentCount, color: '#3182CE' },
    { name: '文件失敗', value: failedDocumentCount, color: '#E53E3E' },
    { name: '待建圖', value: graphSkippedCount, color: '#718096' },
    { name: '建圖中', value: graphRunningCount, color: '#805AD5' },
    { name: '已建圖', value: graphIndexedCount, color: '#38A169' },
    { name: '建圖異常', value: graphIssueCount, color: '#DD6B20' },
  ];

  const graphHealthHint = graphStatusError
    ? 'Graph 狀態讀取失敗'
    : graphEligibleCount > 0
      ? `${graphIndexedCount}/${graphEligibleCount} 份可建圖文件`
      : '尚無可建圖文件';
  const issueHintParts = [];
  if (failedDocumentCount + graphIssueCount > 0) {
    issueHintParts.push(`${failedDocumentCount + graphIssueCount} 失敗`);
  }
  if (processingDocumentCount + graphSkippedCount + graphRunningCount > 0) {
    issueHintParts.push(
      `${processingDocumentCount + graphSkippedCount + graphRunningCount} 待處理`
    );
  }
  const issueHint =
    issueHintParts.length > 0 ? issueHintParts.join(' / ') : '目前無待處理項目';
  const summaryBadgeText = documentsError
    ? '文件資料讀取失敗'
    : `文件總數 ${documentCount} 份`;
  const pipelineBadge = graphStatusError
    ? { colorScheme: 'orange', label: 'Graph 狀態讀取失敗' }
    : graphStatus?.active_job_state
      ? { colorScheme: 'orange', label: `Graph 執行中: ${graphStatus.active_job_state}` }
      : graphStatus?.has_graph
        ? { colorScheme: 'green', label: 'Graph Pipeline 待命' }
        : { colorScheme: 'gray', label: 'Graph 尚未建立' };

  return (
    <Layout>
      <PageHeader title="儀表板" subtitle="RAG 實驗總覽" variant="dashboard" />
      
      <HStack spacing={3} mb={4} flexWrap="wrap" data-testid="dashboard-summary">
        <Badge colorScheme={documentsError ? 'orange' : 'blue'} borderRadius="full" px={3} py={1}>
          {summaryBadgeText}
        </Badge>
        <Badge colorScheme={pipelineBadge.colorScheme} borderRadius="full" px={3} py={1}>
          {pipelineBadge.label}
        </Badge>
      </HStack>

      <SimpleGrid columns={{ base: 1, md: 2, xl: 4 }} spacing={4} mb={5} data-testid="dashboard-kpis">
        <MetricCard
          label="總查詢數"
          value={totalQueries.toLocaleString()}
          hint="近 7 天累計"
          icon={FiActivity}
        />
        <MetricCard
          label="文件總數"
          value={documentCount.toLocaleString()}
          hint={documentsError ? '文件清單讀取失敗' : '知識庫中的已上傳文件'}
          icon={FiCheckCircle}
          iconBg={successIconBg}
          iconColor={successIconColor}
        />
        <MetricCard
          label="已索引/建圖覆蓋率"
          value={`${(graphCoverageRate * 100).toFixed(0)}%`}
          hint={graphHealthHint}
          icon={FiAlertTriangle}
          iconBg={warningIconBg}
          iconColor={warningIconColor}
        />
        <MetricCard
          label="失敗或待處理數"
          value={failedOrPendingCount.toLocaleString()}
          hint={issueHint}
          icon={FiClock}
        />
      </SimpleGrid>

      <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={4} mb={5} data-testid="dashboard-charts">
        <SurfaceCard>
          <CardHeader pb={0}>
            <Text fontWeight="800" fontSize="md" color={textColor}>文件 / Graph 狀態分佈</Text>
          </CardHeader>
          <CardBody>
            <DocumentGraphStatusChart data={statusDistribution} />
          </CardBody>
        </SurfaceCard>

        <SurfaceCard>
          <CardHeader pb={0}>
            <Text fontWeight="800" fontSize="md" color={textColor}>查詢趨勢（近 7 天）</Text>
          </CardHeader>
          <CardBody>
            <QueryTrendChart data={queriesLast7Days} />
          </CardBody>
        </SurfaceCard>
      </SimpleGrid>

      <SurfaceCard data-testid="dashboard-top-documents">
        <CardHeader>
          <Text fontWeight="800" fontSize="md" color={textColor}>最常查詢文件</Text>
        </CardHeader>
        <CardBody pt={0}>
          {topDocuments.length > 0 ? (
            <Table variant="simple" size="sm">
              <Thead>
                <Tr>
                  <Th>文件名稱</Th>
                  <Th isNumeric>查詢次數</Th>
                </Tr>
              </Thead>
              <Tbody>
                {topDocuments.slice(0, 5).map((doc, index) => (
                  <Tr key={doc.doc_id}>
                    <Td>
                      <Flex align="center" gap={2}>
                        <Icon as={FiFileText} color="brand.500" />
                        <Text>{doc.filename || '未命名文件'}</Text>
                        {index === 0 && <Badge colorScheme="blue" size="sm">最熱門</Badge>}
                      </Flex>
                    </Td>
                    <Td isNumeric fontWeight="medium">{doc.query_count}</Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          ) : (
            <Text color={subTextColor} textAlign="center" py={4}>
              尚無查詢記錄。請先至「對話」頁面開始提問。
            </Text>
          )}
          {graphDocumentsError && (
            <Text color="orange.500" fontSize="sm" mt={4}>
              Graph 文件狀態讀取失敗：{graphDocumentsError.message}
            </Text>
          )}
        </CardBody>
      </SurfaceCard>
    </Layout>
  );
}
