import {
  Badge,
  Box,
  Divider,
  Flex,
  HStack,
  Progress,
  Text,
  VStack,
  useColorModeValue,
} from '@chakra-ui/react';

import {
  getUploadStatusMeta,
  type BatchUploadItem,
} from '../../features/uploads/uploadProgress';

interface UploadBatchProgressProps {
  uploads: BatchUploadItem[];
}

export default function UploadBatchProgress({ uploads }: UploadBatchProgressProps) {
  const borderColor = useColorModeValue('gray.200', 'whiteAlpha.200');
  const mutedTextColor = useColorModeValue('gray.600', 'gray.300');
  const errorTextColor = useColorModeValue('red.600', 'red.200');

  if (uploads.length === 0) {
    return null;
  }

  const completedCount = uploads.filter(
    (upload) =>
      upload.status === 'indexed' ||
      upload.status === 'failed' ||
      upload.status === 'index_failed'
  ).length;
  const activeCount = uploads.length - completedCount;

  return (
    <Box mt={4} borderWidth="1px" borderColor={borderColor} borderRadius="lg" p={4}>
      <Flex justify="space-between" align="center" mb={3} gap={3} wrap="wrap">
        <Box>
          <Text fontWeight="bold">批次上傳進度</Text>
          <Text fontSize="sm" color={mutedTextColor}>
            切換頁面後仍會保留進度，回到這裡可繼續查看目前位置。
          </Text>
        </Box>
        <HStack spacing={2}>
          {activeCount > 0 && (
            <Badge colorScheme="blue" borderRadius="full" px={3}>
              {activeCount} 份進行中
            </Badge>
          )}
          <Badge colorScheme="brand" borderRadius="full" px={3}>
            {completedCount}/{uploads.length} 完成
          </Badge>
        </HStack>
      </Flex>

      <VStack align="stretch" spacing={3} divider={<Divider />}>
        {uploads.map((upload) => {
          const meta = getUploadStatusMeta(upload.status);

          return (
            <Box key={upload.id}>
              <Flex justify="space-between" align="start" gap={3}>
                <Box flex="1" minW={0}>
                  <HStack spacing={2} align="center" mb={1}>
                    <Text fontWeight="medium" noOfLines={1}>
                      {upload.fileName}
                    </Text>
                    {upload.docId && (
                      <Text fontSize="xs" color={mutedTextColor}>
                        {upload.docId}
                      </Text>
                    )}
                  </HStack>
                  <Progress
                    value={meta.progress}
                    size="sm"
                    colorScheme={meta.colorScheme}
                    borderRadius="full"
                    mb={2}
                  />
                  <HStack spacing={2} mb={1.5} wrap="wrap">
                    <Badge variant="subtle" colorScheme={meta.colorScheme} borderRadius="full" px={2.5}>
                      {meta.location}
                    </Badge>
                    <Text fontSize="sm" color={mutedTextColor}>
                      目前位置：{meta.label}
                    </Text>
                  </HStack>
                  <Text fontSize="sm" color={mutedTextColor} mb={upload.errorMessage ? 1.5 : 0}>
                    {meta.description}
                  </Text>
                  {upload.errorMessage && (
                    <Text fontSize="sm" color={errorTextColor}>
                      {upload.errorMessage}
                    </Text>
                  )}
                </Box>
                <Badge colorScheme={meta.colorScheme} borderRadius="full" px={3} mt={0.5}>
                  {meta.label}
                </Badge>
              </Flex>
            </Box>
          );
        })}
      </VStack>
    </Box>
  );
}
