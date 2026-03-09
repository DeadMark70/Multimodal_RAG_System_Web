import { useState, useRef, useEffect } from 'react';
import Layout from '../components/layout/Layout';
import PageHeader from '../components/common/PageHeader';
import { 
  Box, 
  Flex, 
  Input, 
  Button, 
  HStack,
  VStack, 
  FormControl, 
  Switch, 
  FormLabel, 
  CardBody, 
  useColorModeValue, 
  Text, 
  Divider, 
  Tag, 
  TagLabel, 
  TagLeftIcon,
  IconButton,
  Skeleton,
  Stack,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Drawer,
  DrawerOverlay,
  DrawerContent,
  DrawerHeader,
  DrawerBody,
  DrawerCloseButton,
  useDisclosure,
} from '@chakra-ui/react';
import { FiSend, FiCpu, FiCheckCircle, FiAlertTriangle, FiHelpCircle, FiTrash2, FiMessageSquare, FiSearch, FiChevronDown, FiMenu, FiSettings } from 'react-icons/fi';
import MessageBubble from '../components/rag/MessageBubble';
import DocumentSelector from '../components/rag/DocumentSelector';
import DeepResearchPanel from '../components/rag/DeepResearchPanel';
import ConversationSidebar from '../components/rag/ConversationSidebar';
import { useChat } from '../hooks/useChat';
import { useDeepResearch } from '../hooks/useDeepResearch';
import { useSessionStore } from '../stores/useSessionStore';
import { useSettingsActions, useSettingsStore } from '../stores/useSettingsStore';
import { useConversationMutations } from '../hooks/useConversations';
import type { Conversation, ConversationType } from '../types/conversation';
import SurfaceCard from '../components/common/SurfaceCard';

export default function Chat() {
  const { currentChatId, actions: { setCurrentChatId } } = useSessionStore();
  const { ragSettings } = useSettingsStore();
  const settingsActions = useSettingsActions();
  const { create } = useConversationMutations();
  const conversationDrawer = useDisclosure();
  const resourcesDrawer = useDisclosure();

  // Mode state
  const [mode, setMode] = useState<'chat' | 'research'>('chat');

  // Chat Hook
  const { 
    messages, 
    sendMessage, 
    clearMessages,
    isLoading: isChatLoading, 
    isLoadingHistory,
    selectedDocIds, 
    setSelectedDocIds 
  } = useChat({ 
    enableEvaluation: ragSettings.enable_evaluation,
    enableHyde: ragSettings.enable_hyde,
    enableMultiQuery: ragSettings.enable_multi_query,
    enableReranking: ragSettings.enable_reranking,
    enableGraphRag: ragSettings.enable_graph_rag,
    graphSearchMode: ragSettings.graph_search_mode,
    conversationId: currentChatId,
    ensureConversation: async () => {
      try {
        const newConv = await create({ title: '新對話', type: 'chat' });
        setCurrentChatId(newConv.id);
        return newConv.id;
      } catch (error) {
        console.error('Failed to auto-create chat conversation', error);
        return null;
      }
    },
  });

  // Deep Research Hook
  const deepResearch = useDeepResearch({
    docIds: selectedDocIds,
    enableGraphPlanning: ragSettings.enable_graph_planning,
  });
  const { isPlanning, isExecuting } = deepResearch;

  const [input, setInput] = useState('');
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const panelBg = useColorModeValue('white', 'surface.800');
  const inputBg = useColorModeValue('white', 'surface.800');
  const inputBorderColor = useColorModeValue('surface.200', 'surface.700');
  const textHeaderColor = useColorModeValue('surface.700', 'white');
  const iconColor = useColorModeValue('brand.500', 'brand.200');
  const inputShadow = useColorModeValue('0px 10px 24px rgba(17, 24, 39, 0.1)', '0px 8px 30px rgba(2, 6, 23, 0.35)');

  // Auto-scroll to bottom for Chat
  useEffect(() => {
    if (mode === 'chat') {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, mode]);

  const isLoading = isChatLoading || isPlanning || isExecuting;

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    const message = input;
    setInput('');
    
    if (mode === 'chat') {
        await sendMessage(message);
    } else {
        await deepResearch.generatePlan(message);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  const handleSelectConversation = (conversation: Conversation) => {
    setCurrentChatId(conversation.id);
    setMode(conversation.type === 'research' ? 'research' : 'chat');
    conversationDrawer.onClose();
  };

  const handleNewConversation = async (type: ConversationType) => {
    try {
      const newConv = await create({ title: '新對話', type });
      setCurrentChatId(newConv.id);
      if (type === 'chat') setMode('chat');
      if (type === 'research') setMode('research');
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
            onNew={(type) => void handleNewConversation(type)}
          />
        </Box>

        {/* Main Content Area */}
        <Flex direction="column" flex={1}>
          <HStack spacing={2} mb={3} display={{ base: 'flex', xl: 'none' }}>
            <Button
              leftIcon={<FiMenu />}
              size="sm"
              variant="outline"
              onClick={conversationDrawer.onOpen}
            >
              對話
            </Button>
            <Button
              leftIcon={<FiSettings />}
              size="sm"
              variant="outline"
              onClick={resourcesDrawer.onOpen}
            >
              資源與設定
            </Button>
          </HStack>
          
          <Box flex={1} overflowY={mode === 'chat' ? 'hidden' : 'auto'} mb={4} pr={mode === 'research' ? 2 : 0}>
             {mode === 'chat' ? (
                <Flex 
                  direction="column" 
                  h="100%" 
                  bg={panelBg} 
                  borderRadius="xl" 
                  boxShadow="sm" 
                  overflow="hidden"
                >
                  <Box flex={1} overflowY="auto" p={6}>
                    {isLoadingHistory ? (
                      <Stack spacing={4} data-testid="chat-history-skeleton">
                        <Skeleton height="40px" width="40%" alignSelf="flex-start" borderRadius="lg" />
                        <Skeleton height="60px" width="70%" alignSelf="flex-end" borderRadius="lg" />
                        <Skeleton height="40px" width="50%" alignSelf="flex-start" borderRadius="lg" />
                        <Skeleton height="80px" width="80%" alignSelf="flex-end" borderRadius="lg" />
                      </Stack>
                    ) : (
                      <>
                        {messages.map((msg) => (
                          <MessageBubble 
                            key={msg.id} 
                            role={msg.role} 
                            content={msg.content} 
                            sources={msg.sources}
                            metrics={ragSettings.enable_evaluation ? msg.metrics : undefined}
                          />
                        ))}
                        {isChatLoading && (
                          <Box p={4}>
                            <Text fontSize="sm" color="gray.500" fontStyle="italic">
                              AI 思考中...
                            </Text>
                          </Box>
                        )}
                        <div ref={messagesEndRef} />
                      </>
                    )}
                  </Box>
                </Flex>
             ) : (
                <DeepResearchPanel researchState={deepResearch} />
             )}
          </Box>

          {/* Unified Input Bar */}
          <Box p={0} position="relative" zIndex={2}>
            <Flex 
              gap={2}
              bg={inputBg}
              p={2}
              borderRadius="full"
              boxShadow={inputShadow}
              border="1px solid"
              borderColor={inputBorderColor}
              align="center"
            >
              <Menu>
                <MenuButton 
                    as={Button} 
                    leftIcon={mode === 'chat' ? <FiMessageSquare /> : <FiSearch />} 
                    rightIcon={<FiChevronDown />} 
                    variant="ghost" 
                    borderRadius="full"
                    px={4}
                    aria-label="Select Mode"
                >
                    {mode === 'chat' ? '快速問答' : '深度研究'}
                </MenuButton>
                <MenuList>
                    <MenuItem icon={<FiMessageSquare />} onClick={() => setMode('chat')}>快速問答</MenuItem>
                    <MenuItem icon={<FiSearch />} onClick={() => setMode('research')}>深度研究</MenuItem>
                </MenuList>
              </Menu>

              <Input 
                aria-label={mode === 'chat' ? '聊天輸入框' : '研究問題輸入框'}
                variant="unstyled" 
                placeholder={mode === 'chat' ? "輸入您的問題..." : "輸入研究主題..."}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyPress}
                px={4}
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
                onClick={() => void handleSend()}
                bg="brand.500"
                _hover={{ transform: 'scale(1.05)', boxShadow: 'lg', bg: 'brand.600' }}
              >
                <FiSend size={20} />
              </Button>
            </Flex>
          </Box>
        </Flex>

        {/* Settings Panel (Right Side) */}
        <Box w="320px" display={{ base: 'none', lg: 'block' }}>
          <VStack spacing={6} align="stretch">
            {/* Document Selector Card */}
            <SurfaceCard variant="unstyled" bg={panelBg} p={5}>
              <CardBody p={0}>
                <DocumentSelector 
                  selectedIds={selectedDocIds}
                  onSelectionChange={setSelectedDocIds}
                />
              </CardBody>
            </SurfaceCard>

            {/* Configuration Card - Only show for Quick Q&A */}
            {mode === 'chat' && (
              <SurfaceCard variant="unstyled" bg={panelBg} p={5}>
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
                      <Switch
                        id="rag-mode"
                        isChecked={ragSettings.enable_graph_rag}
                        onChange={(e) => settingsActions.setRagSetting('enable_graph_rag', e.target.checked)}
                        colorScheme="brand"
                      />
                    </FormControl>
                    
                    <Divider />

                    <FormControl display="flex" alignItems="center" justifyContent="space-between">
                      <Box>
                        <FormLabel htmlFor="eval-mode" mb="0" fontWeight="bold">評估模式</FormLabel>
                        <Text fontSize="xs" color="gray.500">顯示忠實度指標</Text>
                      </Box>
                      <Switch
                        id="eval-mode"
                        isChecked={ragSettings.enable_evaluation}
                        onChange={(e) => settingsActions.setRagSetting('enable_evaluation', e.target.checked)}
                        colorScheme="brand"
                      />
                    </FormControl>
                  </VStack>
                </CardBody>
              </SurfaceCard>
            )}

            {/* Live Analysis Card (Only visible when Eval Mode is ON and in Quick Q&A) */}
            {ragSettings.enable_evaluation && mode === 'chat' && (
              <SurfaceCard variant="unstyled" bg={panelBg} p={5}>
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
              </SurfaceCard>
            )}
          </VStack>
        </Box>
      </Flex>

      <Drawer isOpen={conversationDrawer.isOpen} placement="left" onClose={conversationDrawer.onClose} size="xs">
        <DrawerOverlay />
        <DrawerContent>
          <DrawerCloseButton />
          <DrawerHeader>對話紀錄</DrawerHeader>
          <DrawerBody p={3}>
            <ConversationSidebar
              currentId={currentChatId}
              onSelect={handleSelectConversation}
              onNew={(type) => void handleNewConversation(type)}
            />
          </DrawerBody>
        </DrawerContent>
      </Drawer>

      <Drawer isOpen={resourcesDrawer.isOpen} placement="right" onClose={resourcesDrawer.onClose} size="sm">
        <DrawerOverlay />
        <DrawerContent>
          <DrawerCloseButton />
          <DrawerHeader>資源與設定</DrawerHeader>
          <DrawerBody>
            <VStack spacing={4} align="stretch">
              <DocumentSelector selectedIds={selectedDocIds} onSelectionChange={setSelectedDocIds} />
              {mode === 'chat' && (
                <SurfaceCard variant="unstyled" bg={panelBg} p={4}>
                  <CardBody p={0}>
                    <VStack spacing={4} align="stretch">
                      <FormControl display="flex" alignItems="center" justifyContent="space-between">
                        <FormLabel htmlFor="drawer-rag-mode" mb="0" fontWeight="bold">啟用 RAG</FormLabel>
                        <Switch
                          id="drawer-rag-mode"
                          isChecked={ragSettings.enable_graph_rag}
                          onChange={(e) => settingsActions.setRagSetting('enable_graph_rag', e.target.checked)}
                          colorScheme="brand"
                        />
                      </FormControl>
                      <FormControl display="flex" alignItems="center" justifyContent="space-between">
                        <FormLabel htmlFor="drawer-eval-mode" mb="0" fontWeight="bold">評估模式</FormLabel>
                        <Switch
                          id="drawer-eval-mode"
                          isChecked={ragSettings.enable_evaluation}
                          onChange={(e) => settingsActions.setRagSetting('enable_evaluation', e.target.checked)}
                          colorScheme="brand"
                        />
                      </FormControl>
                    </VStack>
                  </CardBody>
                </SurfaceCard>
              )}
            </VStack>
          </DrawerBody>
        </DrawerContent>
      </Drawer>
    </Layout>
  );
}
