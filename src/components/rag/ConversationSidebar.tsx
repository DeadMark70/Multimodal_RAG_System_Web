/**
 * ConversationSidebar
 * 
 * 對話歷史側邊欄
 * - 顯示對話列表
 * - 新增/切換/刪除對話
 * - 搜尋對話
 */

import { useState } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Input,
  InputGroup,
  InputLeftElement,
  IconButton,
  Button,
  Skeleton,
  useColorModeValue,
  Tooltip,
  Flex,
  useDisclosure,
  useToast,
} from '@chakra-ui/react';
import { 
  FiPlus, 
  FiSearch, 
  FiTrash2, 
  FiMessageSquare, 
  FiLayers,
  FiEye,
} from 'react-icons/fi';
import { useConversations } from '../../hooks/useConversations';
import { getConversation } from '../../services/conversationApi';
import type { Conversation, ConversationType } from '../../types/conversation';
import { ResearchDetailModal } from './ResearchDetailModal';
import type { ExecutePlanResponse } from '../../types/rag';

interface ConversationSidebarProps {
  currentId: string | null;
  onSelect: (conversation: Conversation) => void;
  onNew: (type: ConversationType) => void;
}

export default function ConversationSidebar({ 
  currentId, 
  onSelect, 
  onNew,
}: ConversationSidebarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const { conversations, isLoading, remove, isDeleting } = useConversations();
  
  // Modal state
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [selectedResearch, setSelectedResearch] = useState<ExecutePlanResponse | null>(null);
  const [selectedMeta, setSelectedMeta] = useState<{question?: string, created_at?: string}>({});
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [activeDetailId, setActiveDetailId] = useState<string | null>(null);
  const toast = useToast();

  const bg = useColorModeValue('white', 'navy.800');
  const hoverBg = useColorModeValue('gray.50', 'whiteAlpha.100');
  const activeBg = useColorModeValue('brand.50', 'brand.900');
  const borderColor = useColorModeValue('gray.200', 'whiteAlpha.200');
  const textColor = useColorModeValue('gray.700', 'white');
  const subTextColor = useColorModeValue('gray.500', 'gray.400');

  // 過濾對話
  const filteredConversations = conversations.filter(conv =>
    conv.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // 格式化時間
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return date.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays === 1) {
      return '昨天';
    } else if (diffDays < 7) {
      return `${diffDays} 天前`;
    } else {
      return date.toLocaleDateString('zh-TW', { month: 'short', day: 'numeric' });
    }
  };

  // 取得類型圖標和顏色
  const getTypeInfo = (type: ConversationType) => {
    return type === 'chat' 
      ? { icon: FiMessageSquare, color: 'blue', label: '對話' }
      : { icon: FiLayers, color: 'purple', label: '研究' };
  };

  // 開啟研究詳情
  const handleViewDetails = async (id: string, title: string, created_at: string) => {
    setActiveDetailId(id);
    setIsDetailLoading(true);
    try {
      const detail = await getConversation(id, { includeMessages: false });
      if (detail.metadata) {
        // 優先使用 metadata 中的 result，若無則嘗試直接使用 metadata (視結構而定)
        const researchData = (detail.metadata.result || detail.metadata) as ExecutePlanResponse;
        
        // 簡單驗證是否為有效的研究資料
        if (researchData && (researchData.summary || researchData.detailed_answer)) {
            setSelectedResearch(researchData);
            setSelectedMeta({ 
                question: (detail.metadata.original_question as string) || title, 
                created_at 
            });
            onOpen();
        } else {
            toast({
                title: '無詳細資料',
                description: '此研究尚未完成或資料不完整',
                status: 'info',
            });
        }
      } else {
        toast({
            title: '無詳細資料',
            status: 'info',
        });
      }
    } catch (error) {
      toast({
        title: '載入失敗',
        description: '無法載入研究詳情',
        status: 'error',
      });
    } finally {
      setIsDetailLoading(false);
      setActiveDetailId(null);
    }
  };

  return (
    <>
      <VStack h="100%" spacing={0} align="stretch" bg={bg} borderRadius="xl" overflow="hidden">
        {/* Header */}
        <Box p={4} borderBottom="1px solid" borderColor={borderColor}>
          <Flex justify="space-between" align="center" mb={3}>
            <Text fontWeight="bold" fontSize="lg" color={textColor}>
              對話紀錄
            </Text>
            <HStack>
              <Tooltip label="新增對話" placement="top">
                <IconButton
                  aria-label="新增對話"
                  icon={<FiPlus />}
                  size="sm"
                  colorScheme="brand"
                  variant="ghost"
                  onClick={() => onNew('chat')}
                />
              </Tooltip>
              <Tooltip label="新增研究" placement="top">
                <IconButton
                  aria-label="新增研究"
                  icon={<FiLayers />}
                  size="sm"
                  colorScheme="purple"
                  variant="ghost"
                  onClick={() => onNew('research')}
                />
              </Tooltip>
            </HStack>
          </Flex>

          {/* Search */}
          <InputGroup size="sm">
            <InputLeftElement>
              <FiSearch color="gray" />
            </InputLeftElement>
            <Input
              aria-label="搜尋對話"
              placeholder="搜尋對話..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              borderRadius="md"
            />
          </InputGroup>
        </Box>

        {/* Conversation List */}
        <Box flex={1} overflowY="auto" p={2}>
          {isLoading ? (
            <VStack spacing={2}>
              {[1, 2, 3].map(i => (
                <Skeleton key={i} h="60px" w="100%" borderRadius="md" />
              ))}
            </VStack>
          ) : filteredConversations.length === 0 ? (
            <Flex 
              direction="column" 
              align="center" 
              justify="center" 
              h="200px"
              color={subTextColor}
            >
              <FiMessageSquare size={40} />
              <Text mt={2} fontSize="sm">
                {searchQuery ? '找不到相符的對話' : '尚無對話紀錄'}
              </Text>
              <Button
                size="sm"
                variant="ghost"
                colorScheme="brand"
                mt={3}
                leftIcon={<FiPlus />}
                onClick={() => onNew('chat')}
              >
                開始新對話
              </Button>
            </Flex>
          ) : (
            <VStack spacing={1} align="stretch">
              {filteredConversations.map((conv) => {
                const typeInfo = getTypeInfo(conv.type);
                const isActive = conv.id === currentId;

                return (
                  <HStack
                    key={conv.id}
                    p={3}
                    borderRadius="md"
                    cursor="pointer"
                    bg={isActive ? activeBg : 'transparent'}
                    _hover={{ bg: isActive ? activeBg : hoverBg }}
                    onClick={() => onSelect(conv)}
                    transition="background 0.2s"
                    role="group"
                  >
                    <Box color={`${typeInfo.color}.500`}>
                      <typeInfo.icon size={18} />
                    </Box>
                    <Box flex={1} minW={0}>
                      <Text
                        fontSize="sm"
                        fontWeight={isActive ? 'medium' : 'normal'}
                        color={textColor}
                        noOfLines={1}
                      >
                        {conv.title}
                      </Text>
                      <Text fontSize="xs" color={subTextColor}>
                        {formatTime(conv.updated_at)}
                      </Text>
                    </Box>
                    
                    <HStack spacing={1} opacity={0} _groupHover={{ opacity: 1 }} transition="opacity 0.2s">
                      {conv.type === 'research' && (
                        <Tooltip label="查看研究詳情" placement="top">
                          <IconButton
                            aria-label="查看詳情"
                            icon={<FiEye />}
                            size="xs"
                            variant="ghost"
                            colorScheme="purple"
                            isLoading={isDetailLoading && activeDetailId === conv.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              void handleViewDetails(conv.id, conv.title, conv.created_at);
                            }}
                          />
                        </Tooltip>
                      )}
                      <Tooltip label="刪除" placement="top">
                        <IconButton
                          aria-label="刪除對話"
                          icon={<FiTrash2 />}
                          size="xs"
                          variant="ghost"
                          colorScheme="red"
                          onClick={(e) => {
                            e.stopPropagation();
                            remove(conv.id);
                          }}
                          isLoading={isDeleting}
                        />
                      </Tooltip>
                    </HStack>
                  </HStack>
                );
              })}
            </VStack>
          )}
        </Box>
      </VStack>

      <ResearchDetailModal 
        isOpen={isOpen} 
        onClose={onClose} 
        data={selectedResearch}
        originalQuestion={selectedMeta.question}
        timestamp={selectedMeta.created_at}
      />
    </>
  );
}
