/**
 * Experiment 頁面
 * 
 * RAG vs Vanilla LLM A/B 測試實驗頁面
 */

import { useState } from 'react';
import Layout from '../components/layout/Layout';
import PageHeader from '../components/common/PageHeader';
import {
  Box,
  Flex,
  VStack,
  HStack,
  CardBody,
  CardHeader,
  Input,
  Button,
  Text,
  useColorModeValue,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Badge,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  IconButton,
  useToast,
  Divider,
} from '@chakra-ui/react';
import { FiPlay, FiDownload, FiTrash2, FiFileText } from 'react-icons/fi';
import ComparisonPanel from '../components/experiment/ComparisonPanel';
import DocumentSelector from '../components/rag/DocumentSelector';
import { askQuestion } from '../services/ragApi';
import { exportToCsv, exportToJson, generateSummaryReport } from '../utils/exportData';
import type { ExperimentResult } from '../types/rag';
import SurfaceCard from '../components/common/SurfaceCard';

interface ComparisonResult {
  answer: string;
  faithfulness: 'grounded' | 'hallucinated' | 'uncertain' | null;
  confidence: number | null;
  isLoading?: boolean;
}

export default function Experiment() {
  const [question, setQuestion] = useState('');
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);
  const [ragResult, setRagResult] = useState<ComparisonResult | null>(null);
  const [vanillaResult, setVanillaResult] = useState<ComparisonResult | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [experimentHistory, setExperimentHistory] = useState<ExperimentResult[]>([]);
  
  const toast = useToast();
  const cardBg = useColorModeValue('white', 'surface.800');
  const textColor = useColorModeValue('surface.700', 'white');

  const runExperiment = async () => {
    if (!question.trim()) {
      toast({
        title: '請輸入問題',
        status: 'warning',
        duration: 2000,
      });
      return;
    }

    setIsRunning(true);
    setRagResult({ answer: '', faithfulness: null, confidence: null, isLoading: true });
    setVanillaResult({ answer: '', faithfulness: null, confidence: null, isLoading: true });

    try {
      // 並行執行 RAG 和 Vanilla 請求
      const [ragResponse, vanillaResponse] = await Promise.allSettled([
        // RAG 模式：使用選擇的文件
        askQuestion({
          question,
          doc_ids: selectedDocIds.length > 0 ? selectedDocIds : null,
          enable_evaluation: true,
        }),
        // Vanilla baseline：使用同一路徑但關閉進階檢索選項
        askQuestion({
          question,
          doc_ids: null,
          enable_evaluation: true,
          enable_hyde: false,
          enable_multi_query: false,
          enable_reranking: false,
          enable_graph_rag: false,
        }),
      ]);

      // 處理 RAG 結果
      if (ragResponse.status === 'fulfilled') {
        setRagResult({
          answer: ragResponse.value.answer,
          faithfulness: ragResponse.value.metrics?.faithfulness || null,
          confidence: ragResponse.value.metrics?.confidence_score || null,
        });
      } else {
        const ragErrorMessage = ragResponse.reason instanceof Error ? ragResponse.reason.message : '請求失敗';
        setRagResult({
          answer: `錯誤：${ragErrorMessage}`,
          faithfulness: null,
          confidence: null,
        });
      }

      // 處理 Vanilla 結果
      if (vanillaResponse.status === 'fulfilled') {
        setVanillaResult({
          answer: vanillaResponse.value.answer,
          faithfulness: vanillaResponse.value.metrics?.faithfulness || null,
          confidence: vanillaResponse.value.metrics?.confidence_score || null,
        });
      } else {
        const vanillaErrorMessage = vanillaResponse.reason instanceof Error ? vanillaResponse.reason.message : '請求失敗';
        setVanillaResult({
          answer: `錯誤：${vanillaErrorMessage}`,
          faithfulness: null,
          confidence: null,
        });
      }

      // 儲存到歷史記錄
      const newResult: ExperimentResult = {
        id: Date.now().toString(),
        question,
        rag_answer: ragResponse.status === 'fulfilled' ? ragResponse.value.answer : '',
        rag_faithfulness: ragResponse.status === 'fulfilled' ? ragResponse.value.metrics?.faithfulness || null : null,
        rag_confidence: ragResponse.status === 'fulfilled' ? ragResponse.value.metrics?.confidence_score || null : null,
        vanilla_answer: vanillaResponse.status === 'fulfilled' ? vanillaResponse.value.answer : '',
        vanilla_faithfulness: vanillaResponse.status === 'fulfilled' ? vanillaResponse.value.metrics?.faithfulness || null : null,
        vanilla_confidence: vanillaResponse.status === 'fulfilled' ? vanillaResponse.value.metrics?.confidence_score || null : null,
        selected_docs: selectedDocIds,
        timestamp: Date.now(),
      };

      setExperimentHistory(prev => [newResult, ...prev]);

    } catch (error) {
      toast({
        title: '實驗執行失敗',
        description: error instanceof Error ? error.message : '未知錯誤',
        status: 'error',
        duration: 3000,
      });
    } finally {
      setIsRunning(false);
    }
  };

  const clearHistory = () => {
    setExperimentHistory([]);
    toast({
      title: '歷史記錄已清除',
      status: 'success',
      duration: 2000,
    });
  };

  const handleExportCsv = () => {
    if (experimentHistory.length === 0) {
      toast({ title: '沒有資料可匯出', status: 'warning', duration: 2000 });
      return;
    }
    exportToCsv(experimentHistory, `rag_experiment_${Date.now()}`);
    toast({ title: '已匯出 CSV', status: 'success', duration: 2000 });
  };

  const handleExportJson = () => {
    if (experimentHistory.length === 0) {
      toast({ title: '沒有資料可匯出', status: 'warning', duration: 2000 });
      return;
    }
    exportToJson(experimentHistory, `rag_experiment_${Date.now()}`);
    toast({ title: '已匯出 JSON', status: 'success', duration: 2000 });
  };

  const handleExportReport = () => {
    if (experimentHistory.length === 0) {
      toast({ title: '沒有資料可匯出', status: 'warning', duration: 2000 });
      return;
    }
    const report = generateSummaryReport(experimentHistory);
    const blob = new Blob([report], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `rag_experiment_report_${Date.now()}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast({ title: '已匯出報告', status: 'success', duration: 2000 });
  };

  return (
    <Layout>
      <PageHeader title="實驗室" subtitle="RAG vs Vanilla LLM A/B 測試" />
      
      <Flex gap={6} direction={{ base: 'column', lg: 'row' }}>
        {/* 左側：實驗控制區 */}
        <Box flex={1}>
          <VStack spacing={6} align="stretch">
            {/* 輸入區 */}
            <SurfaceCard bg={cardBg}>
              <CardBody>
                <VStack spacing={4} align="stretch">
                  <Box>
                    <Text fontWeight="bold" mb={2} color={textColor}>輸入問題</Text>
                    <Input
                      placeholder="輸入您要測試的問題..."
                      value={question}
                      onChange={(e) => setQuestion(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && !isRunning && void runExperiment()}
                    />
                  </Box>
                  
                  <Button
                    colorScheme="brand"
                    leftIcon={<FiPlay />}
                    onClick={() => void runExperiment()}
                    isLoading={isRunning}
                    loadingText="執行中..."
                    size="lg"
                    w="full"
                  >
                    執行實驗
                  </Button>
                </VStack>
              </CardBody>
            </SurfaceCard>

            {/* 對比結果 */}
            <ComparisonPanel
              ragResult={ragResult}
              vanillaResult={vanillaResult}
              question={question}
            />
          </VStack>
        </Box>

        {/* 右側：設定與歷史 */}
        <Box w={{ base: 'full', lg: '350px' }}>
          <VStack spacing={6} align="stretch">
            {/* 文件選擇 */}
            <SurfaceCard bg={cardBg}>
              <CardBody>
                <DocumentSelector
                  selectedIds={selectedDocIds}
                  onSelectionChange={setSelectedDocIds}
                />
              </CardBody>
            </SurfaceCard>

            {/* 匯出選項 */}
            <SurfaceCard bg={cardBg}>
              <CardHeader pb={2}>
                <Flex justify="space-between" align="center">
                  <Text fontWeight="bold" color={textColor}>
                    實驗歷史 ({experimentHistory.length})
                  </Text>
                  <HStack>
                    <Menu>
                      <MenuButton
                        as={IconButton}
                        icon={<FiDownload />}
                        size="sm"
                        variant="ghost"
                        aria-label="匯出"
                      />
                      <MenuList>
                        <MenuItem icon={<FiFileText />} onClick={handleExportCsv}>
                          匯出 CSV
                        </MenuItem>
                        <MenuItem icon={<FiFileText />} onClick={handleExportJson}>
                          匯出 JSON
                        </MenuItem>
                        <MenuItem icon={<FiFileText />} onClick={handleExportReport}>
                          匯出摘要報告
                        </MenuItem>
                      </MenuList>
                    </Menu>
                    <IconButton
                      icon={<FiTrash2 />}
                      size="sm"
                      variant="ghost"
                      aria-label="清除"
                      onClick={clearHistory}
                    />
                  </HStack>
                </Flex>
              </CardHeader>
              <Divider />
              <CardBody pt={2} maxH="300px" overflowY="auto">
                {experimentHistory.length === 0 ? (
                  <Text color="gray.500" textAlign="center" py={4} fontSize="sm">
                    尚無實驗記錄
                  </Text>
                ) : (
                  <Table size="sm" variant="simple">
                    <Thead>
                      <Tr>
                        <Th px={2}>問題</Th>
                        <Th px={2}>RAG</Th>
                        <Th px={2}>Vanilla</Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {experimentHistory.slice(0, 10).map((exp) => (
                        <Tr key={exp.id}>
                          <Td px={2} maxW="120px" isTruncated>
                            {exp.question}
                          </Td>
                          <Td px={2}>
                            <Badge 
                              colorScheme={
                                exp.rag_faithfulness === 'grounded' ? 'green' :
                                exp.rag_faithfulness === 'hallucinated' ? 'red' : 'gray'
                              }
                              size="sm"
                            >
                              {exp.rag_faithfulness === 'grounded' ? '有據' :
                               exp.rag_faithfulness === 'hallucinated' ? '幻覺' : '-'}
                            </Badge>
                          </Td>
                          <Td px={2}>
                            <Badge 
                              colorScheme={
                                exp.vanilla_faithfulness === 'grounded' ? 'green' :
                                exp.vanilla_faithfulness === 'hallucinated' ? 'red' : 'gray'
                              }
                              size="sm"
                            >
                              {exp.vanilla_faithfulness === 'grounded' ? '有據' :
                               exp.vanilla_faithfulness === 'hallucinated' ? '幻覺' : '-'}
                            </Badge>
                          </Td>
                        </Tr>
                      ))}
                    </Tbody>
                  </Table>
                )}
              </CardBody>
            </SurfaceCard>
          </VStack>
        </Box>
      </Flex>
    </Layout>
  );
}
