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
} from '@chakra-ui/react';
import { FiRefreshCw, FiFile } from 'react-icons/fi';
import { useDocumentList } from '../../hooks/useDocuments';

interface DocumentSelectorProps {
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
  maxSelection?: number;
}

export default function DocumentSelector({ 
  selectedIds, 
  onSelectionChange, 
  maxSelection = 10 
}: DocumentSelectorProps) {
  const { data: documents, isLoading, error, refetch } = useDocumentList();
  
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const hoverBg = useColorModeValue('gray.50', 'whiteAlpha.100');
  const textColor = useColorModeValue('gray.700', 'white');

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
      <Flex justify="space-between" align="center" mb={3}>
        <Text fontWeight="bold" fontSize="sm" color={textColor}>
          選擇文件 ({selectedIds.length}/{maxSelection})
        </Text>
        <Flex gap={2}>
          <Text 
            fontSize="xs" 
            color="brand.500" 
            cursor="pointer" 
            onClick={handleSelectAll}
            _hover={{ textDecor: 'underline' }}
          >
            全選
          </Text>
          <Text 
            fontSize="xs" 
            color="gray.500" 
            cursor="pointer" 
            onClick={handleClearAll}
            _hover={{ textDecor: 'underline' }}
          >
            清除
          </Text>
        </Flex>
      </Flex>

      <VStack 
        align="stretch" 
        spacing={1} 
        maxH="200px" 
        overflowY="auto"
        borderWidth="1px"
        borderColor={borderColor}
        borderRadius="md"
        p={2}
      >
        {readyDocs.map((doc) => (
          <Flex
            key={doc.id}
            align="center"
            gap={2}
            p={2}
            borderRadius="md"
            cursor="pointer"
            _hover={{ bg: hoverBg }}
            onClick={() => handleToggle(doc.id)}
          >
            <Checkbox
              isChecked={selectedIds.includes(doc.id)}
              onChange={() => handleToggle(doc.id)}
              colorScheme="brand"
              size="sm"
            />
            <FiFile size={14} color="gray" />
            <Tooltip label={doc.file_name} placement="top">
              <Text 
                fontSize="sm" 
                noOfLines={1} 
                flex={1}
                color={textColor}
              >
                {doc.file_name}
              </Text>
            </Tooltip>
            {selectedIds.includes(doc.id) && (
              <Badge colorScheme="brand" size="sm">已選</Badge>
            )}
          </Flex>
        ))}
      </VStack>

      {selectedIds.length === 0 && (
        <Text fontSize="xs" color="gray.400" mt={2} textAlign="center">
          未選擇文件時將搜尋整個知識庫
        </Text>
      )}
    </Box>
  );
}
