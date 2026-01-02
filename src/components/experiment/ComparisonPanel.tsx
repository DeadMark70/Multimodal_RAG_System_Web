/**
 * ComparisonPanel 元件
 * 
 * RAG vs Vanilla LLM 對比面板
 */

import {
  Box,
  Flex,
  Text,
  VStack,
  Card,
  CardBody,
  Badge,
  Spinner,
  useColorModeValue,
  Icon,
} from '@chakra-ui/react';
import { FiCheckCircle, FiAlertTriangle, FiHelpCircle } from 'react-icons/fi';
import ReactMarkdown from 'react-markdown';

interface ComparisonResult {
  answer: string;
  faithfulness: 'grounded' | 'hallucinated' | 'uncertain' | null;
  confidence: number | null;
  isLoading?: boolean;
}

interface ComparisonPanelProps {
  ragResult: ComparisonResult | null;
  vanillaResult: ComparisonResult | null;
  question: string;
}

const FaithfulnessTag = ({ status }: { status: 'grounded' | 'hallucinated' | 'uncertain' | null }) => {
  if (!status) return <Badge colorScheme="gray">等待中</Badge>;

  const config = {
    grounded: { color: 'green', icon: FiCheckCircle, label: '有據' },
    hallucinated: { color: 'red', icon: FiAlertTriangle, label: '幻覺' },
    uncertain: { color: 'yellow', icon: FiHelpCircle, label: '不確定' },
  };

  const { color, icon, label } = config[status];

  return (
    <Badge colorScheme={color} px={2} py={1} borderRadius="full" display="flex" alignItems="center" gap={1}>
      <Icon as={icon} boxSize={3} />
      {label}
    </Badge>
  );
};

export default function ComparisonPanel({ ragResult, vanillaResult, question }: ComparisonPanelProps) {
  const cardBg = useColorModeValue('white', '#111C44');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const textColor = useColorModeValue('gray.700', 'white');
  const subTextColor = useColorModeValue('gray.500', 'gray.400');
  const ragBg = useColorModeValue('brand.50', 'whiteAlpha.100');
  const vanillaBg = useColorModeValue('orange.50', 'whiteAlpha.50');

  const renderResult = (result: ComparisonResult | null, label: string, bg: string) => (
    <Card flex={1} bg={cardBg} borderWidth="1px" borderColor={borderColor}>
      <CardBody>
        <Flex justify="space-between" align="center" mb={3}>
          <Text fontWeight="bold" color={textColor}>{label}</Text>
          {result && <FaithfulnessTag status={result.faithfulness} />}
        </Flex>

        {result?.isLoading ? (
          <Flex justify="center" align="center" py={8}>
            <Spinner size="md" color="brand.500" />
            <Text ml={3} color={subTextColor}>生成中...</Text>
          </Flex>
        ) : result ? (
          <VStack align="stretch" spacing={3}>
            <Box 
              bg={bg} 
              p={4} 
              borderRadius="md" 
              maxH="300px" 
              overflowY="auto"
              fontSize="sm"
            >
              <ReactMarkdown>{result.answer}</ReactMarkdown>
            </Box>
            
            {result.confidence !== null && (
              <Box>
                <Flex justify="space-between" mb={1}>
                  <Text fontSize="xs" color={subTextColor}>信心分數</Text>
                  <Text fontSize="xs" fontWeight="bold" color="brand.500">
                    {(result.confidence * 100).toFixed(0)}%
                  </Text>
                </Flex>
                <Box w="100%" h="6px" bg="gray.100" borderRadius="full" overflow="hidden">
                  <Box 
                    h="full" 
                    w={`${result.confidence * 100}%`} 
                    bg={result.confidence > 0.7 ? 'green.400' : result.confidence > 0.4 ? 'yellow.400' : 'red.400'} 
                    transition="width 0.5s ease"
                  />
                </Box>
              </Box>
            )}
          </VStack>
        ) : (
          <Flex justify="center" align="center" py={8}>
            <Text color={subTextColor} fontSize="sm">尚無結果</Text>
          </Flex>
        )}
      </CardBody>
    </Card>
  );

  return (
    <Box>
      {/* 問題區塊 */}
      <Box mb={4} p={4} bg={useColorModeValue('gray.50', 'whiteAlpha.50')} borderRadius="lg">
        <Text fontSize="sm" color={subTextColor} mb={1}>提問</Text>
        <Text fontWeight="medium" color={textColor}>{question || '尚無提問'}</Text>
      </Box>

      {/* 對比面板 */}
      <Flex gap={4} direction={{ base: 'column', md: 'row' }}>
        {renderResult(ragResult, '🔍 RAG 模式', ragBg)}
        {renderResult(vanillaResult, '🤖 Vanilla LLM', vanillaBg)}
      </Flex>
    </Box>
  );
}
