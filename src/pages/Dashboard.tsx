
import Layout from '../components/layout/Layout';
import PageHeader from '../components/common/PageHeader';
import { 
  Box, 
  SimpleGrid, 
  Card, 
  CardBody, 
  CardHeader,
  Text, 
  Stat, 
  StatLabel, 
  StatNumber, 
  StatHelpText,
  StatArrow,
  Flex,
  Spinner,
  useColorModeValue,
  Icon,
  Badge,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
} from '@chakra-ui/react';
import { FiActivity, FiCheckCircle, FiAlertTriangle, FiHelpCircle, FiFileText } from 'react-icons/fi';
import useDashboardStats from '../hooks/useDashboardStats';
import AccuracyPieChart from '../components/charts/AccuracyPieChart';
import QueryTrendChart from '../components/charts/QueryTrendChart';

export default function Dashboard() {
  const { data: stats, isLoading, error } = useDashboardStats();
  
  const cardBg = useColorModeValue('white', '#111C44');
  const textColor = useColorModeValue('gray.700', 'white');
  const subTextColor = useColorModeValue('gray.500', 'gray.400');

  if (isLoading) {
    return (
      <Layout>
        <PageHeader title="儀表板" subtitle="RAG 實驗總覽" />
        <Flex justify="center" align="center" h="300px">
          <Spinner size="xl" color="brand.500" />
        </Flex>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <PageHeader title="儀表板" subtitle="RAG 實驗總覽" />
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
      <PageHeader title="儀表板" subtitle="RAG 實驗總覽" />
      
      {/* 統計卡片 */}
      <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={6} mb={6} pt={2}>
        <Card bg={cardBg} borderRadius="xl" boxShadow="sm">
          <CardBody>
            <Flex align="center" gap={4}>
              <Box p={3} bg="brand.50" borderRadius="lg" _dark={{ bg: 'whiteAlpha.100' }}>
                <Icon as={FiActivity} boxSize={6} color="brand.500" />
              </Box>
              <Stat>
                <StatLabel color={subTextColor}>總查詢數</StatLabel>
                <StatNumber color={textColor}>{totalQueries}</StatNumber>
                <StatHelpText mb={0}>
                  <StatArrow type={totalQueries > 0 ? 'increase' : 'decrease'} />
                  近 7 天
                </StatHelpText>
              </Stat>
            </Flex>
          </CardBody>
        </Card>

        <Card bg={cardBg} borderRadius="xl" boxShadow="sm">
          <CardBody>
            <Flex align="center" gap={4}>
              <Box p={3} bg="green.50" borderRadius="lg" _dark={{ bg: 'whiteAlpha.100' }}>
                <Icon as={FiCheckCircle} boxSize={6} color="green.500" />
              </Box>
              <Stat>
                <StatLabel color={subTextColor}>準確率</StatLabel>
                <StatNumber color={textColor}>{(accuracyRate * 100).toFixed(1)}%</StatNumber>
                <StatHelpText mb={0}>
                  {groundedCount} 有據回答
                </StatHelpText>
              </Stat>
            </Flex>
          </CardBody>
        </Card>

        <Card bg={cardBg} borderRadius="xl" boxShadow="sm">
          <CardBody>
            <Flex align="center" gap={4}>
              <Box p={3} bg="orange.50" borderRadius="lg" _dark={{ bg: 'whiteAlpha.100' }}>
                <Icon as={FiAlertTriangle} boxSize={6} color="orange.500" />
              </Box>
              <Stat>
                <StatLabel color={subTextColor}>幻覺回答</StatLabel>
                <StatNumber color={textColor}>{hallucinatedCount}</StatNumber>
                <StatHelpText mb={0}>
                  需要注意
                </StatHelpText>
              </Stat>
            </Flex>
          </CardBody>
        </Card>

        <Card bg={cardBg} borderRadius="xl" boxShadow="sm">
          <CardBody>
            <Flex align="center" gap={4}>
              <Box p={3} bg="purple.50" borderRadius="lg" _dark={{ bg: 'whiteAlpha.100' }}>
                <Icon as={FiHelpCircle} boxSize={6} color="purple.500" />
              </Box>
              <Stat>
                <StatLabel color={subTextColor}>平均信心</StatLabel>
                <StatNumber color={textColor}>{(avgConfidence * 100).toFixed(0)}%</StatNumber>
                <StatHelpText mb={0}>
                  信心分數
                </StatHelpText>
              </Stat>
            </Flex>
          </CardBody>
        </Card>
      </SimpleGrid>

      {/* 圖表區域 */}
      <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={6} mb={6}>
        <Card bg={cardBg} borderRadius="xl" boxShadow="sm">
          <CardHeader pb={0}>
            <Text fontWeight="bold" fontSize="lg" color={textColor}>忠實度分佈</Text>
          </CardHeader>
          <CardBody>
            <AccuracyPieChart 
              grounded={groundedCount}
              hallucinated={hallucinatedCount}
              uncertain={uncertainCount}
            />
          </CardBody>
        </Card>

        <Card bg={cardBg} borderRadius="xl" boxShadow="sm">
          <CardHeader pb={0}>
            <Text fontWeight="bold" fontSize="lg" color={textColor}>查詢趨勢 (近 7 天)</Text>
          </CardHeader>
          <CardBody>
            <QueryTrendChart data={queriesLast7Days} />
          </CardBody>
        </Card>
      </SimpleGrid>

      {/* 熱門文件 */}
      <Card bg={cardBg} borderRadius="xl" boxShadow="sm">
        <CardHeader>
          <Text fontWeight="bold" fontSize="lg" color={textColor}>最常查詢文件</Text>
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
                        {index === 0 && <Badge colorScheme="brand" size="sm">最熱門</Badge>}
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
      </Card>
    </Layout>
  );
}
