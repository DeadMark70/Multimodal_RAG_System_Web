import { useState, useRef, useEffect } from 'react';
import Layout from '../components/layout/Layout';
import PageHeader from '../components/common/PageHeader';
import { 
  Box, 
  Flex, 
  Input, 
  Button, 
  VStack, 
  FormControl, 
  Switch, 
  FormLabel, 
  Card, 
  CardBody, 
  useColorModeValue, 
  Text, 
  Divider, 
  Tag, 
  TagLabel, 
  TagLeftIcon,
  IconButton,
  Tabs, 
  TabList, 
  Tab, 
  TabPanels, 
  TabPanel,
} from '@chakra-ui/react';
import { FiSend, FiCpu, FiCheckCircle, FiAlertTriangle, FiHelpCircle, FiTrash2, FiMessageSquare, FiSearch } from 'react-icons/fi';
import MessageBubble from '../components/rag/MessageBubble';
import DocumentSelector from '../components/rag/DocumentSelector';
import DeepResearchPanel from '../components/rag/DeepResearchPanel';
import ConversationSidebar from '../components/rag/ConversationSidebar';
import { useChat } from '../hooks/useChat';
import { useSessionStore } from '../stores/useSessionStore';
import { useConversationMutations } from '../hooks/useConversations';
import type { ConversationType } from '../types/conversation';

export default function Chat() {
  const { currentChatId, actions: { setCurrentChatId } } = useSessionStore();
  const { create } = useConversationMutations();

  // 使用自定義 hook 管理對話
  const { 
    messages, 
    sendMessage, 
    clearMessages,
    isLoading, 
    selectedDocIds, 
    setSelectedDocIds 
  } = useChat({ 
    enableEvaluation: true,
    conversationId: currentChatId
  });

  const [input, setInput] = useState('');
  const [ragMode, setRagMode] = useState(true);
  const [evalMode, setEvalMode] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const panelBg = useColorModeValue('white', '#111C44');
  const inputBg = useColorModeValue('white', 'navy.800');
  const inputBorderColor = useColorModeValue('gray.100', 'whiteAlpha.100');
  const textHeaderColor = useColorModeValue('navy.700', 'white');
  const iconColor = useColorModeValue('#4318FF', '#fff');

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    const message = input;
    setInput('');
    await sendMessage(message);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSelectConversation = (id: string) => {
    setCurrentChatId(id);
  };

  const handleNewConversation = async (type: ConversationType) => {
    try {
      const newConv = await create({ title: '新對話', type });
      setCurrentChatId(newConv.id);
      if (type === 'chat') setActiveTab(0);
      if (type === 'research') setActiveTab(1);
    } catch (error) {
      console.error('Failed to create conversation', error);
    }
  };

  // Get latest metrics for the side panel
  const lastAssistantMessage = [...messages].reverse().find(m => m.role === 'assistant' && m.metrics);
  const currentMetrics = lastAssistantMessage?.metrics;

  return (
    <Layout>
      <PageHeader title="對話" subtitle="RAG 問答與深度研究" />
      
      <Flex gap={6} h="calc(100vh - 140px)">
        {/* Conversation Sidebar - Left Side */}
        <Box w="280px" display={{ base: 'none', xl: 'block' }}>
          <ConversationSidebar 
            currentId={currentChatId}
            onSelect={handleSelectConversation}
            onNew={handleNewConversation}
          />
        </Box>

        {/* Main Content Area */}
        <Flex direction="column" flex={1}>
          {/* Mode Tabs */}
          <Tabs 
            variant="soft-rounded" 
            colorScheme="brand" 
            mb={4}
            index={activeTab}
            onChange={setActiveTab}
          >
            <TabList>
              <Tab>
                <FiMessageSquare style={{ marginRight: 8 }} />
                快速問答
              </Tab>
              <Tab>
                <FiSearch style={{ marginRight: 8 }} />
                深度研究
              </Tab>
            </TabList>
            
            <TabPanels flex={1}>
              {/* Quick Q&A Tab */}
              <TabPanel p={0} pt={4} h="calc(100vh - 220px)">
                <Flex 
                  direction="column" 
                  h="100%" 
                  bg={panelBg} 
                  borderRadius="xl" 
                  boxShadow="sm" 
                  overflow="hidden"
                >
                  <Box flex={1} overflowY="auto" p={6}>
                    {messages.map((msg) => (
                      <MessageBubble 
                        key={msg.id} 
                        role={msg.role} 
                        content={msg.content} 
                        sources={msg.sources}
                        metrics={evalMode ? msg.metrics : undefined}
                      />
                    ))}
                    {isLoading && (
                      <Box p={4}>
                        <Text fontSize="sm" color="gray.500" fontStyle="italic">
                          AI 思考中...
                        </Text>
                      </Box>
                    )}
                    <div ref={messagesEndRef} />
                  </Box>
                  
                  <Box p={6} position="relative" zIndex={2}>
                    <Flex 
                      gap={2}
                      bg={inputBg}
                      p={2}
                      borderRadius="full"
                      boxShadow="0px 10px 30px rgba(0,0,0,0.08)"
                      border="1px solid"
                      borderColor={inputBorderColor}
                      align="center"
                    >
                      <Input 
                        variant="unstyled" 
                        placeholder="輸入您的問題..." 
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyPress}
                        px={6}
                        h="50px"
                        fontSize="md"
                        disabled={isLoading}
                      />
                      <Button 
                        colorScheme="brand" 
                        borderRadius="full" 
                        w="50px" h="50px"
                        p={0}
                        isLoading={isLoading}
                        onClick={handleSend}
                        bgGradient="linear(to-br, brand.400, brand.600)"
                        _hover={{ transform: 'scale(1.05)', boxShadow: 'lg' }}
                      >
                        <FiSend size={20} />
                      </Button>
                    </Flex>
                  </Box>
                </Flex>
              </TabPanel>

              {/* Deep Research Tab */}
              <TabPanel p={0} pt={4} h="calc(100vh - 220px)">
                <DeepResearchPanel selectedDocIds={selectedDocIds} />
              </TabPanel>
            </TabPanels>
          </Tabs>
        </Flex>

        {/* Settings Panel (Right Side) */}
        <Box w="320px" display={{ base: 'none', lg: 'block' }}>
          <VStack spacing={6} align="stretch">
            {/* Document Selector Card */}
            <Card variant="unstyled" bg={panelBg} p={5} borderRadius="20px" boxShadow="sm">
              <CardBody p={0}>
                <DocumentSelector 
                  selectedIds={selectedDocIds}
                  onSelectionChange={setSelectedDocIds}
                />
              </CardBody>
            </Card>

            {/* Configuration Card - Only show for Quick Q&A */}
            {activeTab === 0 && (
              <Card variant="unstyled" bg={panelBg} p={5} borderRadius="20px" boxShadow="sm">
                <CardBody p={0}>
                  <Flex justify="space-between" align="center" mb={4}>
                    <Text fontWeight="bold" fontSize="lg" color={textHeaderColor}>設定</Text>
                    <IconButton
                      aria-label="清除對話"
                      icon={<FiTrash2 />}
                      size="sm"
                      variant="ghost"
                      onClick={clearMessages}
                    />
                  </Flex>
                  
                  <VStack spacing={4} align="stretch">
                    <FormControl display="flex" alignItems="center" justifyContent="space-between">
                      <Box>
                        <FormLabel htmlFor="rag-mode" mb="0" fontWeight="bold">啟用 RAG</FormLabel>
                        <Text fontSize="xs" color="gray.500">從文件檢索相關內容</Text>
                      </Box>
                      <Switch id="rag-mode" isChecked={ragMode} onChange={(e) => setRagMode(e.target.checked)} colorScheme="brand" />
                    </FormControl>
                    
                    <Divider />

                    <FormControl display="flex" alignItems="center" justifyContent="space-between">
                      <Box>
                        <FormLabel htmlFor="eval-mode" mb="0" fontWeight="bold">評估模式</FormLabel>
                        <Text fontSize="xs" color="gray.500">顯示忠實度指標</Text>
                      </Box>
                      <Switch id="eval-mode" isChecked={evalMode} onChange={(e) => setEvalMode(e.target.checked)} colorScheme="brand" />
                    </FormControl>
                  </VStack>
                </CardBody>
              </Card>
            )}

            {/* Live Analysis Card (Only visible when Eval Mode is ON and in Quick Q&A) */}
            {evalMode && activeTab === 0 && (
              <Card variant="unstyled" bg={panelBg} p={5} borderRadius="20px" boxShadow="sm">
                <CardBody p={0}>
                  <Flex align="center" gap={2} mb={4}>
                    <FiCpu size={20} color={iconColor} />
                    <Text fontWeight="bold" fontSize="lg" color={textHeaderColor}>即時分析</Text>
                  </Flex>

                  {currentMetrics ? (
                    <VStack spacing={4} align="stretch">
                      <Box>
                        <Text fontSize="sm" color="gray.500" mb={1}>忠實度狀態</Text>
                        {currentMetrics.faithfulness === 'grounded' ? (
                          <Tag size="lg" colorScheme="green" borderRadius="full" w="full" justifyContent="center">
                            <TagLeftIcon boxSize="12px" as={FiCheckCircle} />
                            <TagLabel>有據</TagLabel>
                          </Tag>
                        ) : (
                          <Tag size="lg" colorScheme="orange" borderRadius="full" w="full" justifyContent="center">
                            <TagLeftIcon boxSize="12px" as={FiAlertTriangle} />
                            <TagLabel>可能幻覺</TagLabel>
                          </Tag>
                        )}
                      </Box>

                      <Box>
                        <Flex justify="space-between" mb={1}>
                          <Text fontSize="sm" color="gray.500">信心分數</Text>
                          <Text fontWeight="bold" color="brand.500">{(currentMetrics.confidence_score * 100).toFixed(0)}%</Text>
                        </Flex>
                        <Box w="100%" h="8px" bg="gray.100" borderRadius="full" overflow="hidden">
                          <Box 
                            h="full" 
                            w={`${currentMetrics.confidence_score * 100}%`} 
                            bg="brand.500" 
                            transition="width 0.5s ease"
                          />
                        </Box>
                      </Box>
                    </VStack>
                  ) : (
                    <Flex direction="column" align="center" py={4}>
                      <FiHelpCircle size={30} color="gray" />
                      <Text fontSize="sm" color="gray.500" mt={2} textAlign="center">
                        提問後即可查看即時評估指標
                      </Text>
                    </Flex>
                  )}
                </CardBody>
              </Card>
            )}
          </VStack>
        </Box>
      </Flex>
    </Layout>
  );
}