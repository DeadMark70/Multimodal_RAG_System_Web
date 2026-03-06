import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Badge,
  Box,
  Button,
  FormControl,
  FormLabel,
  Grid,
  GridItem,
  HStack,
  Input,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Select,
  Spinner,
  Table,
  Tbody,
  Td,
  Text,
  Textarea,
  Th,
  Thead,
  Tr,
  VStack,
  useDisclosure,
  useToast,
} from '@chakra-ui/react';
import {
  createTestCase,
  deleteTestCase,
  importTestCases,
  listTestCases,
  updateTestCase,
} from '../../services/evaluationApi';
import type { TestCase } from '../../types/evaluation';

interface TestCaseFormState {
  id: string;
  question: string;
  ground_truth: string;
  category: string;
  difficulty: string;
  source_docs_text: string;
  requires_multi_doc_reasoning: boolean;
  test_objective: string;
}

const emptyFormState = (): TestCaseFormState => ({
  id: '',
  question: '',
  ground_truth: '',
  category: '',
  difficulty: '',
  source_docs_text: '',
  requires_multi_doc_reasoning: false,
  test_objective: '',
});

export default function TestCaseManager() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [cases, setCases] = useState<TestCase[]>([]);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [difficultyFilter, setDifficultyFilter] = useState('all');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<TestCaseFormState>(emptyFormState);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const toast = useToast();

  const reload = async () => {
    setLoading(true);
    try {
      const data = await listTestCases();
      setCases(data);
    } catch (error) {
      toast({
        title: '載入題庫失敗',
        description: error instanceof Error ? error.message : '未知錯誤',
        status: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void reload();
  }, []);

  const categories = useMemo(() => {
    return Array.from(new Set(cases.map((item) => item.category).filter(Boolean)));
  }, [cases]);

  const difficulties = useMemo(() => {
    return Array.from(new Set(cases.map((item) => item.difficulty).filter(Boolean)));
  }, [cases]);

  const filteredCases = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return cases.filter((item) => {
      if (
        keyword &&
        !item.question.toLowerCase().includes(keyword) &&
        !item.id.toLowerCase().includes(keyword)
      ) {
        return false;
      }
      if (categoryFilter !== 'all' && (item.category ?? '') !== categoryFilter) {
        return false;
      }
      if (difficultyFilter !== 'all' && (item.difficulty ?? '') !== difficultyFilter) {
        return false;
      }
      return true;
    });
  }, [cases, search, categoryFilter, difficultyFilter]);

  const openCreateModal = () => {
    setEditingId(null);
    setForm(emptyFormState());
    onOpen();
  };

  const openEditModal = (item: TestCase) => {
    setEditingId(item.id);
    setForm({
      id: item.id,
      question: item.question,
      ground_truth: item.ground_truth,
      category: item.category ?? '',
      difficulty: item.difficulty ?? '',
      source_docs_text: item.source_docs.join(', '),
      requires_multi_doc_reasoning: item.requires_multi_doc_reasoning,
      test_objective: item.test_objective ?? '',
    });
    onOpen();
  };

  const closeModal = () => {
    setEditingId(null);
    setForm(emptyFormState());
    onClose();
  };

  const handleSave = async () => {
    if (!form.question.trim() || !form.ground_truth.trim()) {
      toast({
        title: '請填寫問題與標準答案',
        status: 'warning',
      });
      return;
    }

    setSaving(true);
    const payload = {
      id: form.id.trim() || undefined,
      question: form.question.trim(),
      ground_truth: form.ground_truth.trim(),
      category: form.category.trim() || undefined,
      difficulty: form.difficulty.trim() || undefined,
      source_docs: form.source_docs_text
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean),
      requires_multi_doc_reasoning: form.requires_multi_doc_reasoning,
      test_objective: form.test_objective.trim() || undefined,
    };

    try {
      if (editingId) {
        await updateTestCase(editingId, payload);
      } else {
        await createTestCase(payload);
      }
      toast({
        title: editingId ? '題目已更新' : '題目已建立',
        status: 'success',
      });
      closeModal();
      await reload();
    } catch (error) {
      toast({
        title: '儲存失敗',
        description: error instanceof Error ? error.message : '未知錯誤',
        status: 'error',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (testCaseId: string) => {
    try {
      await deleteTestCase(testCaseId);
      toast({ title: '題目已刪除', status: 'success' });
      await reload();
    } catch (error) {
      toast({
        title: '刪除失敗',
        description: error instanceof Error ? error.message : '未知錯誤',
        status: 'error',
      });
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const payload = JSON.parse(text) as { metadata?: Record<string, unknown>; questions?: TestCase[] };
      if (!Array.isArray(payload.questions)) {
        throw new Error('檔案格式錯誤，缺少 questions 陣列');
      }
      const result = await importTestCases({
        metadata: payload.metadata ?? {},
        questions: payload.questions,
      });
      toast({
        title: '匯入成功',
        description: `已匯入 ${result.imported} 題，目前總數 ${result.total}`,
        status: 'success',
      });
      await reload();
    } catch (error) {
      toast({
        title: '匯入失敗',
        description: error instanceof Error ? error.message : '未知錯誤',
        status: 'error',
      });
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleExport = () => {
    const payload = {
      metadata: {
        exported_at: new Date().toISOString(),
        total_questions: cases.length,
      },
      questions: cases,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `evaluation_test_cases_${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <VStack align="stretch" spacing={4}>
      <HStack justify="space-between" flexWrap="wrap">
        <HStack>
          <Badge colorScheme="blue">總題數 {cases.length}</Badge>
          <Badge colorScheme="teal">篩選後 {filteredCases.length}</Badge>
        </HStack>
        <HStack>
          <Button size="sm" onClick={handleImportClick}>
            匯入 JSON
          </Button>
          <Button size="sm" onClick={handleExport} isDisabled={cases.length === 0}>
            匯出 JSON
          </Button>
          <Button size="sm" colorScheme="brand" onClick={openCreateModal}>
            新增題目
          </Button>
        </HStack>
      </HStack>

      <input
        ref={fileInputRef}
        type="file"
        accept="application/json"
        style={{ display: 'none' }}
        onChange={(event) => void handleFileImport(event)}
      />

      <Grid templateColumns={{ base: '1fr', md: '2fr 1fr 1fr' }} gap={3}>
        <GridItem>
          <FormControl>
            <FormLabel mb={1}>搜尋</FormLabel>
            <Input
              value={search}
              placeholder="依題目內容或 ID 搜尋"
              onChange={(event) => setSearch(event.target.value)}
            />
          </FormControl>
        </GridItem>
        <GridItem>
          <FormControl>
            <FormLabel mb={1}>分類</FormLabel>
            <Select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
              <option value="all">全部</option>
              {categories.map((category) => (
                <option key={category} value={category ?? ''}>
                  {category}
                </option>
              ))}
            </Select>
          </FormControl>
        </GridItem>
        <GridItem>
          <FormControl>
            <FormLabel mb={1}>難度</FormLabel>
            <Select value={difficultyFilter} onChange={(event) => setDifficultyFilter(event.target.value)}>
              <option value="all">全部</option>
              {difficulties.map((difficulty) => (
                <option key={difficulty} value={difficulty ?? ''}>
                  {difficulty}
                </option>
              ))}
            </Select>
          </FormControl>
        </GridItem>
      </Grid>

      <Box borderWidth="1px" borderRadius="md" overflowX="auto">
        {loading ? (
          <HStack justify="center" py={8}>
            <Spinner />
            <Text>載入中...</Text>
          </HStack>
        ) : (
          <Table size="sm">
            <Thead>
              <Tr>
                <Th>ID</Th>
                <Th>問題</Th>
                <Th>分類</Th>
                <Th>難度</Th>
                <Th>來源文件數</Th>
                <Th>操作</Th>
              </Tr>
            </Thead>
            <Tbody>
              {filteredCases.map((item) => (
                <Tr key={item.id}>
                  <Td>{item.id}</Td>
                  <Td maxW="560px">
                    <Text noOfLines={2}>{item.question}</Text>
                  </Td>
                  <Td>{item.category ?? '-'}</Td>
                  <Td>{item.difficulty ?? '-'}</Td>
                  <Td>{item.source_docs.length}</Td>
                  <Td>
                    <HStack>
                      <Button size="xs" onClick={() => openEditModal(item)}>
                        編輯
                      </Button>
                      <Button size="xs" colorScheme="red" variant="outline" onClick={() => void handleDelete(item.id)}>
                        刪除
                      </Button>
                    </HStack>
                  </Td>
                </Tr>
              ))}
              {filteredCases.length === 0 && (
                <Tr>
                  <Td colSpan={6}>
                    <Text textAlign="center" py={4}>
                      目前沒有符合條件的題目
                    </Text>
                  </Td>
                </Tr>
              )}
            </Tbody>
          </Table>
        )}
      </Box>

      <Modal isOpen={isOpen} onClose={closeModal} size="2xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>{editingId ? '編輯題目' : '新增題目'}</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={3} align="stretch">
              <FormControl>
                <FormLabel>ID（可選）</FormLabel>
                <Input
                  value={form.id}
                  onChange={(event) => setForm((prev) => ({ ...prev, id: event.target.value }))}
                  placeholder="留空則由後端自動產生"
                />
              </FormControl>
              <FormControl isRequired>
                <FormLabel>問題</FormLabel>
                <Textarea
                  value={form.question}
                  onChange={(event) => setForm((prev) => ({ ...prev, question: event.target.value }))}
                  rows={3}
                />
              </FormControl>
              <FormControl isRequired>
                <FormLabel>標準答案</FormLabel>
                <Textarea
                  value={form.ground_truth}
                  onChange={(event) => setForm((prev) => ({ ...prev, ground_truth: event.target.value }))}
                  rows={4}
                />
              </FormControl>
              <Grid templateColumns="1fr 1fr" gap={3}>
                <GridItem>
                  <FormControl>
                    <FormLabel>分類</FormLabel>
                    <Input
                      value={form.category}
                      onChange={(event) => setForm((prev) => ({ ...prev, category: event.target.value }))}
                    />
                  </FormControl>
                </GridItem>
                <GridItem>
                  <FormControl>
                    <FormLabel>難度</FormLabel>
                    <Input
                      value={form.difficulty}
                      onChange={(event) => setForm((prev) => ({ ...prev, difficulty: event.target.value }))}
                    />
                  </FormControl>
                </GridItem>
              </Grid>
              <FormControl>
                <FormLabel>來源文件（逗號分隔）</FormLabel>
                <Input
                  value={form.source_docs_text}
                  onChange={(event) => setForm((prev) => ({ ...prev, source_docs_text: event.target.value }))}
                  placeholder="docA.pdf, docB.pdf"
                />
              </FormControl>
              <FormControl>
                <FormLabel>測試目標</FormLabel>
                <Input
                  value={form.test_objective}
                  onChange={(event) => setForm((prev) => ({ ...prev, test_objective: event.target.value }))}
                />
              </FormControl>
              <FormControl display="flex" alignItems="center">
                <FormLabel mb={0}>需要跨文件推理</FormLabel>
                <Select
                  w="140px"
                  value={form.requires_multi_doc_reasoning ? 'yes' : 'no'}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      requires_multi_doc_reasoning: event.target.value === 'yes',
                    }))
                  }
                >
                  <option value="no">否</option>
                  <option value="yes">是</option>
                </Select>
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <HStack>
              <Button variant="ghost" onClick={closeModal}>
                取消
              </Button>
              <Button colorScheme="brand" isLoading={saving} onClick={() => void handleSave()}>
                儲存
              </Button>
            </HStack>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </VStack>
  );
}

