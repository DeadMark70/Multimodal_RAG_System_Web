
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
import { FiActivity, FiCheckCircle, FiAlertTriangle, FiHelpCircle, FiFileText } from 'react-icons/fi';
import useDashboardStats from '../hooks/useDashboardStats';
import AccuracyPieChart from '../components/charts/AccuracyPieChart';
import QueryTrendChart from '../components/charts/QueryTrendChart';
import SurfaceCard from '../components/common/SurfaceCard';
import MetricCard from '../components/common/MetricCard';

export default function Dashboard() {
  const { data: stats, isLoading, error } = useDashboardStats();
  
  const textColor = useColorModeValue('surface.700', 'white');
  const subTextColor = useColorModeValue('surface.500', 'surface.300');
  const successIconBg = useColorModeValue('green.50', 'green.900');
  const successIconColor = useColorModeValue('green.600', 'green.200');
  const warningIconBg = useColorModeValue('orange.50', 'orange.900');
  const warningIconColor = useColorModeValue('orange.600', 'orange.200');

  if (isLoading) {
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
  const accuracyRate = stats?.accuracy_rate ?? 0;
  const groundedCount = stats?.grounded_count ?? 0;
  const hallucinatedCount = stats?.hallucinated_count ?? 0;
  const uncertainCount = stats?.uncertain_count ?? 0;
  const avgConfidence = stats?.avg_confidence ?? 0;
  const queriesLast7Days = stats?.queries_last_7_days ?? [0, 0, 0, 0, 0, 0, 0];
  const topDocuments = stats?.top_documents ?? [];

  return (
    <Layout>
      <PageHeader title="儀表板" subtitle="RAG 實驗總覽" variant="dashboard" />
      
      <HStack spacing={3} mb={4} flexWrap="wrap" data-testid="dashboard-summary">
        <Badge colorScheme="blue" borderRadius="full" px={3} py={1}>資料版本: 即時</Badge>
        <Badge colorScheme="green" borderRadius="full" px={3} py={1}>RAG Pipeline 正常</Badge>
      </HStack>

      <SimpleGrid columns={{ base: 1, md: 2, xl: 4 }} spacing={4} mb={5} data-testid="dashboard-kpis">
        <MetricCard
          label="總查詢數"
          value={totalQueries.toLocaleString()}
          hint="近 7 天累計"
          icon={FiActivity}
        />
        <MetricCard
          label="準確率"
          value={`${(accuracyRate * 100).toFixed(1)}%`}
          hint={`${groundedCount} 則有據回答`}
          icon={FiCheckCircle}
          iconBg={successIconBg}
          iconColor={successIconColor}
        />
        <MetricCard
          label="幻覺回答"
          value={hallucinatedCount}
          hint="需人工複核"
          icon={FiAlertTriangle}
          iconBg={warningIconBg}
          iconColor={warningIconColor}
        />
        <MetricCard
          label="平均信心"
          value={`${(avgConfidence * 100).toFixed(0)}%`}
          hint="模型回覆信心值"
          icon={FiHelpCircle}
        />
      </SimpleGrid>

      <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={4} mb={5} data-testid="dashboard-charts">
        <SurfaceCard>
          <CardHeader pb={0}>
            <Text fontWeight="800" fontSize="md" color={textColor}>忠實度分佈</Text>
          </CardHeader>
          <CardBody>
            <AccuracyPieChart 
              grounded={groundedCount}
              hallucinated={hallucinatedCount}
              uncertain={uncertainCount}
            />
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
        </CardBody>
      </SurfaceCard>
    </Layout>
  );
}
