import { useEffect, useRef, useState } from 'react';
import Layout from '../components/layout/Layout';
import PageHeader from '../components/common/PageHeader';
import {
  Badge,
  Box,
  Button,
  CardBody,
  Divider,
  Drawer,
  DrawerBody,
  DrawerCloseButton,
  DrawerContent,
  DrawerHeader,
  DrawerOverlay,
  Flex,
  HStack,
  IconButton,
  Input,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  Skeleton,
  Stack,
  Text,
  useColorModeValue,
  useDisclosure,
  VStack,
} from '@chakra-ui/react';
import {
  FiChevronDown,
  FiCpu,
  FiLayers,
  FiMenu,
  FiMessageSquare,
  FiPlus,
  FiSave,
  FiSearch,
  FiSend,
  FiSettings,
  FiTrash2,
} from 'react-icons/fi';

import SurfaceCard from '../components/common/SurfaceCard';
import MessageBubble from '../components/rag/MessageBubble';
import DocumentSelector from '../components/rag/DocumentSelector';
import DeepResearchPanel from '../components/rag/DeepResearchPanel';
import ConversationSidebar from '../components/rag/ConversationSidebar';
import SettingsPanel from '../components/settings/SettingsPanel';
import { useChat } from '../hooks/useChat';
import { useDeepResearch } from '../hooks/useDeepResearch';
import { useConversationMutations } from '../hooks/useConversations';
import { useSessionStore } from '../stores/useSessionStore';
import {
  getConversationTypeForMode,
  useActiveChatPreset,
  useChatPresetList,
  useSettingsActions,
  useSettingsStore,
} from '../stores';
import type { Conversation, ConversationType } from '../types/conversation';

function areSettingsEqual(left: Record<string, unknown>, right: Record<string, unknown>): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function getChatStageLabel(stage: ReturnType<typeof useChat>['currentStage']): string | null {
  switch (stage) {
    case 'query_expansion':
      return '正在擴展查詢';
    case 'retrieval':
      return '正在檢索文件';
    case 'reranking':
      return '正在重排序結果';
    case 'graph_context':
      return '正在分析圖譜關聯';
    case 'answer_generation':
      return '正在生成回答';
    default:
      return null;
  }
}

function getResearchPhaseLabel(
  phase: ReturnType<typeof useDeepResearch>['currentPhase'],
  isPlanning: boolean,
  isExecuting: boolean
): string | null {
  if (isPlanning) {
    return '正在規劃 agentic 任務';
  }

  if (!isExecuting) {
    return null;
  }

  switch (phase) {
    case 'planning':
      return '正在生成任務計畫';
    case 'executing':
      return '正在執行子任務';
    case 'drilldown':
      return '正在進行 drill-down 驗證';
    case 'synthesis':
      return '正在生成綜合回答';
    case 'complete':
      return 'Agentic 研究完成';
    default:
      return '正在處理';
  }
}

export default function Chat() {
  const { currentChatId, actions: { setCurrentChatId } } = useSessionStore();
  const { ragSettings, selectedChatModeId } = useSettingsStore();
  const settingsActions = useSettingsActions();
  const activePreset = useActiveChatPreset();
  const presetList = useChatPresetList();
  const { create } = useConversationMutations();
  const conversationDrawer = useDisclosure();
  const resourcesDrawer = useDisclosure();

  const isAgenticMode = activePreset.baseMode === 'agentic';
  const activeConversationType = getConversationTypeForMode(activePreset.baseMode);
  const presetIsDirty = !areSettingsEqual(activePreset.config, ragSettings);

  const {
    messages,
    sendMessage,
    clearMessages,
    isLoading: isChatLoading,
    isLoadingHistory,
    selectedDocIds,
    setSelectedDocIds,
    currentStage,
  } = useChat({
    enableEvaluation: ragSettings.enable_evaluation,
    enableHyde: ragSettings.enable_hyde,
    enableMultiQuery: ragSettings.enable_multi_query,
    enableReranking: ragSettings.enable_reranking,
    enableGraphRag: ragSettings.enable_graph_rag,
    graphSearchMode: ragSettings.graph_search_mode,
    conversationId: isAgenticMode ? null : currentChatId,
    ensureConversation: async () => {
      try {
        const newConversation = await create({
          title: '新對話',
          type: 'chat',
          metadata: {
            mode_preset: selectedChatModeId,
            mode_config_snapshot: ragSettings,
          },
        });
        setCurrentChatId(newConversation.id);
        return newConversation.id;
      } catch (error) {
        console.error('Failed to auto-create chat conversation', error);
        return null;
      }
    },
  });

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
  const inputShadow = useColorModeValue(
    '0px 10px 24px rgba(17, 24, 39, 0.1)',
    '0px 8px 30px rgba(2, 6, 23, 0.35)'
  );

  useEffect(() => {
    if (!isAgenticMode) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [isAgenticMode, messages]);

  const isLoading = isChatLoading || isPlanning || isExecuting;
  const ordinaryChatStatus = getChatStageLabel(currentStage);
  const agenticStatus = getResearchPhaseLabel(
    deepResearch.currentPhase,
    isPlanning,
    isExecuting
  );
  const activeStatusLabel = isAgenticMode ? agenticStatus : ordinaryChatStatus;

  const handleSend = async () => {
    if (!input.trim() || isLoading) {
      return;
    }

    const message = input.trim();
    setInput('');

    if (isAgenticMode) {
      await deepResearch.generatePlan(message);
      return;
    }

    await sendMessage(message);
  };

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void handleSend();
    }
  };

  const handleSelectConversation = (conversation: Conversation) => {
    settingsActions.restoreConversationMode(conversation.metadata, conversation.type);
    setCurrentChatId(conversation.id);
    conversationDrawer.onClose();
  };

  const handleNewConversation = async (type: ConversationType) => {
    try {
      const newConversation = await create({
        title: type === 'research' ? '新 Agentic 對話' : '新對話',
        type,
        metadata: {
          mode_preset: selectedChatModeId,
          mode_config_snapshot: ragSettings,
        },
      });
      setCurrentChatId(newConversation.id);
    } catch (error) {
      console.error('Failed to create conversation', error);
    }
  };

  const handlePresetChange = (presetId: string) => {
    const nextPreset = presetList.find((preset) => preset.id === presetId);
    if (nextPreset && getConversationTypeForMode(nextPreset.baseMode) !== activeConversationType) {
      setCurrentChatId(null);
    }
    settingsActions.setChatMode(presetId);
  };

  const handleSaveCustomPreset = () => {
    const name = window.prompt('輸入自訂模式名稱');
    if (!name) {
      return;
    }

    settingsActions.saveCurrentAsCustomPreset(name, activePreset.baseMode);
  };

  const handleDeleteCustomPreset = () => {
    if (activePreset.isOfficial) {
      return;
    }

    settingsActions.deleteCustomPreset(activePreset.id);
  };

  const lastAssistantMessage = [...messages]
    .reverse()
    .find((message) => message.role === 'assistant' && message.metrics);

  return (
    <Layout>
      <PageHeader title="對話" subtitle="Preset-driven RAG 問答與 Agentic 研究" />

      <Flex gap={6} h="calc(100vh - 140px)">
        <Box w="280px" display={{ base: 'none', xl: 'block' }}>
          <ConversationSidebar
            currentId={currentChatId}
            onSelect={handleSelectConversation}
            onNew={(type) => void handleNewConversation(type)}
            defaultNewType={activeConversationType}
          />
        </Box>

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

          <Box flex={1} overflowY={isAgenticMode ? 'auto' : 'hidden'} mb={4} pr={isAgenticMode ? 2 : 0}>
            {isAgenticMode ? (
              <DeepResearchPanel researchState={deepResearch} />
            ) : (
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
                      {messages.map((message) => (
                        <MessageBubble
                          key={message.id}
                          role={message.role}
                          content={message.content}
                          sources={message.sources}
                          metrics={ragSettings.enable_evaluation ? message.metrics : undefined}
                        />
                      ))}
                      {isChatLoading && !activeStatusLabel && (
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
            )}
          </Box>

          <Box p={0} position="relative" zIndex={2}>
            <VStack spacing={2} align="stretch">
              {activeStatusLabel && (
                <HStack
                  spacing={2}
                  px={4}
                  py={2}
                  bg={panelBg}
                  borderRadius="full"
                  boxShadow="sm"
                  border="1px solid"
                  borderColor={inputBorderColor}
                  w="fit-content"
                >
                  <FiCpu />
                  <Text fontSize="sm" fontWeight="medium">
                    {activeStatusLabel}
                  </Text>
                </HStack>
              )}

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
                    leftIcon={isAgenticMode ? <FiLayers /> : <FiMessageSquare />}
                    rightIcon={<FiChevronDown />}
                    variant="ghost"
                    borderRadius="full"
                    px={4}
                    aria-label="Select Mode"
                  >
                    {activePreset.name}
                  </MenuButton>
                  <MenuList>
                    {presetList.map((preset) => (
                      <MenuItem
                        key={preset.id}
                        icon={preset.baseMode === 'agentic' ? <FiLayers /> : <FiMessageSquare />}
                        onClick={() => handlePresetChange(preset.id)}
                      >
                        <HStack justify="space-between" w="full">
                          <Text>{preset.name}</Text>
                          {!preset.isOfficial && <Badge colorScheme="orange">Custom</Badge>}
                        </HStack>
                      </MenuItem>
                    ))}
                  </MenuList>
                </Menu>

                <Input
                  aria-label={isAgenticMode ? '研究問題輸入框' : '聊天輸入框'}
                  variant="unstyled"
                  placeholder={isAgenticMode ? '輸入研究問題，先生成可編輯計畫...' : '輸入您的問題...'}
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  onKeyDown={handleKeyPress}
                  px={4}
                  h="50px"
                  fontSize="md"
                  disabled={isLoading}
                />

                <Button
                  colorScheme="brand"
                  borderRadius="full"
                  w="50px"
                  h="50px"
                  p={0}
                  isLoading={isLoading}
                  onClick={() => void handleSend()}
                  bg="brand.500"
                  _hover={{ transform: 'scale(1.05)', boxShadow: 'lg', bg: 'brand.600' }}
                >
                  <FiSend size={20} />
                </Button>
              </Flex>
            </VStack>
          </Box>
        </Flex>

        <Box w="320px" display={{ base: 'none', lg: 'block' }}>
          <VStack spacing={6} align="stretch">
            <SurfaceCard variant="unstyled" bg={panelBg} p={5}>
              <CardBody p={0}>
                <DocumentSelector
                  selectedIds={selectedDocIds}
                  onSelectionChange={setSelectedDocIds}
                />
              </CardBody>
            </SurfaceCard>

            <SurfaceCard variant="unstyled" bg={panelBg} p={5}>
              <CardBody p={0}>
                <VStack spacing={4} align="stretch">
                  <HStack justify="space-between" align="start">
                    <Box>
                      <Text fontWeight="bold" fontSize="lg" color={textHeaderColor}>
                        問答模式
                      </Text>
                      <Text fontSize="sm" color="gray.500">
                        {activePreset.description}
                      </Text>
                    </Box>
                    <Badge colorScheme={activePreset.isOfficial ? 'blue' : 'orange'}>
                      {activePreset.isOfficial ? '官方' : '自訂'}
                    </Badge>
                  </HStack>

                  <HStack wrap="wrap" spacing={2}>
                    <Button size="sm" leftIcon={<FiSave />} onClick={handleSaveCustomPreset}>
                      另存 Custom
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => settingsActions.resetCurrentModeToPreset()}
                      isDisabled={!presetIsDirty}
                    >
                      還原此模式
                    </Button>
                    {!activePreset.isOfficial && (
                      <Button
                        size="sm"
                        variant="ghost"
                        colorScheme="red"
                        leftIcon={<FiTrash2 />}
                        onClick={handleDeleteCustomPreset}
                      >
                        刪除 Custom
                      </Button>
                    )}
                  </HStack>

                  {presetIsDirty && (
                    <Text fontSize="xs" color="orange.500">
                      目前設定已偏離所選 preset，可直接使用，也可另存成 custom。
                    </Text>
                  )}
                </VStack>
              </CardBody>
            </SurfaceCard>

            <SettingsPanel />

            {ragSettings.enable_evaluation && !isAgenticMode && (
              <SurfaceCard variant="unstyled" bg={panelBg} p={5}>
                <CardBody p={0}>
                  <HStack mb={4}>
                    <FiCpu />
                    <Text fontWeight="bold" fontSize="lg" color={textHeaderColor}>
                      即時分析
                    </Text>
                  </HStack>

                  {lastAssistantMessage?.metrics ? (
                    <VStack spacing={3} align="stretch">
                      <Text fontSize="sm">
                        忠實度：{lastAssistantMessage.metrics.faithfulness}
                      </Text>
                      <Text fontSize="sm">
                        信心分數：{(lastAssistantMessage.metrics.confidence_score * 100).toFixed(0)}%
                      </Text>
                    </VStack>
                  ) : (
                    <Text fontSize="sm" color="gray.500">
                      發送問題後即可查看評估結果。
                    </Text>
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
              defaultNewType={activeConversationType}
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
              <SurfaceCard variant="unstyled" bg={panelBg} p={4}>
                <CardBody p={0}>
                  <VStack spacing={4} align="stretch">
                    <HStack justify="space-between">
                      <Text fontWeight="bold">{activePreset.name}</Text>
                      {!activePreset.isOfficial && <Badge colorScheme="orange">Custom</Badge>}
                    </HStack>
                    <Text fontSize="sm" color="gray.500">
                      {activePreset.description}
                    </Text>
                    <HStack wrap="wrap" spacing={2}>
                      <Button size="sm" leftIcon={<FiSave />} onClick={handleSaveCustomPreset}>
                        另存 Custom
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => settingsActions.resetCurrentModeToPreset()}
                        isDisabled={!presetIsDirty}
                      >
                        還原此模式
                      </Button>
                    </HStack>
                  </VStack>
                </CardBody>
              </SurfaceCard>
              <SettingsPanel isDrawerMode />
            </VStack>
          </DrawerBody>
        </DrawerContent>
      </Drawer>
    </Layout>
  );
}
