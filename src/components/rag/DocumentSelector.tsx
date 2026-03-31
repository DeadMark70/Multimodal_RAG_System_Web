/**
 * DocumentSelector 元件
 * 
 * 多文件選擇器，用於選擇 RAG 查詢的目標文件
 */

import { 
  Box, 
  Checkbox, 
  VStack, 
  Text, 
  Spinner, 
  Badge,
  Flex,
  useColorModeValue,
  IconButton,
  Tooltip,
  Button,
} from '@chakra-ui/react';
import { FiRefreshCw, FiFile } from 'react-icons/fi';
import { useDocumentList } from '../../hooks/useDocuments';

interface DocumentSelectorProps {
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
  maxSelection?: number;
  compact?: boolean;
  listMaxH?: string | number;
}

export default function DocumentSelector({ 
  selectedIds, 
  onSelectionChange, 
  maxSelection = 10,
  compact = false,
  listMaxH = compact ? '240px' : '200px',
}: DocumentSelectorProps) {
  const { data: documents, isLoading, error, refetch } = useDocumentList();
  
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const hoverBg = useColorModeValue('gray.50', 'whiteAlpha.100');
  const textColor = useColorModeValue('gray.700', 'white');
  const headerBg = useColorModeValue('white', 'gray.800');
  const mutedColor = useColorModeValue('gray.500', 'gray.400');
  const rowPadding = compact ? 1.5 : 2;
  const rowRadius = compact ? 'lg' : 'md';
  const iconSize = compact ? 12 : 14;
  const fontSize = compact ? 'xs' : 'sm';

  const handleToggle = (docId: string) => {
    if (selectedIds.includes(docId)) {
      onSelectionChange(selectedIds.filter(id => id !== docId));
    } else if (selectedIds.length < maxSelection) {
      onSelectionChange([...selectedIds, docId]);
    }
  };

  const handleSelectAll = () => {
    if (!documents) return;
    const readyDocs = documents
      .filter(d => d.processing_step === 'indexed' || d.processing_step === 'completed')
      .slice(0, maxSelection);
    onSelectionChange(readyDocs.map(d => d.id));
  };

  const handleClearAll = () => {
    onSelectionChange([]);
  };

  if (isLoading) {
    return (
      <Flex justify="center" align="center" py={4}>
        <Spinner size="sm" color="brand.500" mr={2} />
        <Text fontSize="sm" color="gray.500">載入文件清單...</Text>
      </Flex>
    );
  }

  if (error) {
    return (
      <Box textAlign="center" py={4}>
        <Text color="red.500" fontSize="sm">載入失敗</Text>
        <IconButton
          aria-label="重試"
          icon={<FiRefreshCw />}
          size="sm"
          variant="ghost"
          onClick={() => void refetch()}
          mt={2}
        />
      </Box>
    );
  }

  const readyDocs = documents?.filter(
    d => d.processing_step === 'indexed' || d.processing_step === 'completed'
  ) || [];

  if (readyDocs.length === 0) {
    return (
      <Box textAlign="center" py={4}>
        <Text color="gray.500" fontSize="sm">尚無可用文件</Text>
        <Text color="gray.400" fontSize="xs" mt={1}>請先至知識庫上傳文件</Text>
      </Box>
    );
  }

  return (
    <Box>
      <Box
        borderWidth="1px"
        borderColor={borderColor}
        borderRadius="xl"
        overflow="hidden"
        bg={headerBg}
      >
        <Box maxH={listMaxH} overflowY="auto">
          <Flex
            position="sticky"
            top={0}
            zIndex={1}
            justify="space-between"
            align="center"
            px={compact ? 3 : 4}
            py={compact ? 3 : 3}
            bg={headerBg}
            borderBottom="1px solid"
            borderColor={borderColor}
          >
            <Box minW={0}>
              <Text fontWeight="bold" fontSize={compact ? 'xs' : 'sm'} color={textColor}>
                選擇文件 ({selectedIds.length}/{maxSelection})
              </Text>
              <Text fontSize="xs" color={mutedColor}>
                未選擇時將搜尋整個知識庫
              </Text>
            </Box>
            <Flex gap={2} flexShrink={0}>
              <Button
                size="xs"
                variant="ghost"
                colorScheme="purple"
                onClick={handleSelectAll}
              >
                全選
              </Button>
              <Button
                size="xs"
                variant="ghost"
                colorScheme="gray"
                onClick={handleClearAll}
              >
                清除
              </Button>
            </Flex>
          </Flex>

          <VStack align="stretch" spacing={1} p={compact ? 2 : 2}>
            {readyDocs.map((doc) => (
              <Flex
                key={doc.id}
                align="center"
                gap={2}
                px={compact ? 2 : 2}
                py={rowPadding}
                borderRadius={rowRadius}
                _hover={{ bg: hoverBg }}
              >
                <Checkbox
                  aria-label={`選擇文件 ${doc.file_name}`}
                  isChecked={selectedIds.includes(doc.id)}
                  onChange={() => handleToggle(doc.id)}
                  colorScheme="brand"
                  size="sm"
                />
                <FiFile size={iconSize} color="gray" />
                <Tooltip label={doc.file_name} placement="top">
                  <Text
                    fontSize={fontSize}
                    noOfLines={1}
                    flex={1}
                    color={textColor}
                    minW={0}
                  >
                    {doc.file_name}
                  </Text>
                </Tooltip>
                {selectedIds.includes(doc.id) && (
                  <Badge colorScheme="brand" size="sm">
                    已選
                  </Badge>
                )}
              </Flex>
            ))}
          </VStack>
        </Box>
      </Box>

      {selectedIds.length === 0 && (
        <Text fontSize="xs" color="gray.400" mt={2} textAlign="center">
          未選擇文件時將搜尋整個知識庫
        </Text>
      )}
    </Box>
  );
}
