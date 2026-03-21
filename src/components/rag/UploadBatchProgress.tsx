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

import type { BatchUploadItem, BatchUploadStatus } from '../../hooks/useDocuments';

interface UploadBatchProgressProps {
  uploads: BatchUploadItem[];
}

const STATUS_META: Record<
  BatchUploadStatus,
  { label: string; colorScheme: string; progress: number }
> = {
  queued: { label: '等待中', colorScheme: 'gray', progress: 5 },
  uploading: { label: '上傳中', colorScheme: 'blue', progress: 20 },
  ocr_completed: { label: 'OCR 完成', colorScheme: 'cyan', progress: 45 },
  indexing: { label: '索引中', colorScheme: 'purple', progress: 75 },
  indexed: { label: '已完成', colorScheme: 'green', progress: 100 },
  failed: { label: '上傳失敗', colorScheme: 'red', progress: 100 },
  index_failed: { label: '索引失敗', colorScheme: 'orange', progress: 100 },
};

export default function UploadBatchProgress({ uploads }: UploadBatchProgressProps) {
  const borderColor = useColorModeValue('gray.200', 'whiteAlpha.200');
  const mutedTextColor = useColorModeValue('gray.600', 'gray.300');
  const errorTextColor = useColorModeValue('red.600', 'red.200');

  if (uploads.length === 0) {
    return null;
  }

  const completedCount = uploads.filter(
    (upload) => upload.status === 'indexed' || upload.status === 'failed' || upload.status === 'index_failed'
  ).length;

  return (
    <Box mt={4} borderWidth="1px" borderColor={borderColor} borderRadius="lg" p={4}>
      <Flex justify="space-between" align="center" mb={3} gap={3} wrap="wrap">
        <Text fontWeight="bold">批次上傳進度</Text>
        <Badge colorScheme="brand" borderRadius="full" px={3}>
          {completedCount}/{uploads.length} 完成
        </Badge>
      </Flex>

      <VStack align="stretch" spacing={3} divider={<Divider />}>
        {uploads.map((upload) => {
          const meta = STATUS_META[upload.status];

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
