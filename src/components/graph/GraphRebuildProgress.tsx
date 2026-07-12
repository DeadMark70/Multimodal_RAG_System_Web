import {
  Alert,
  AlertIcon,
  Badge,
  Box,
  Button,
  Collapse,
  HStack,
  Progress,
  Stack,
  Text,
} from '@chakra-ui/react';
import { useState } from 'react';

import type { GraphRebuildPhase, GraphRebuildStatus } from '../../types/graph';

interface GraphRebuildProgressProps {
  status: GraphRebuildStatus;
  isActionPending: boolean;
  onResume: () => void;
}

const PHASE_LABELS: Record<GraphRebuildPhase, string> = {
  preparing: '準備重構',
  extracting: '抽取文件圖譜',
  retry_wait: '等待重試',
  optimizing: '最佳化圖譜',
  building_communities: '建立社群',
  syncing_sidecars: '同步索引',
  validating: '驗證 staging 圖譜',
  publishing: '切換正式圖譜',
  done: '工作完成',
};

/** Displays persisted full-rebuild progress and the only valid recovery action. */
export function GraphRebuildProgress({
  status,
  isActionPending,
  onResume,
}: GraphRebuildProgressProps) {
  const [showDocuments, setShowDocuments] = useState(false);
  const actionLabel = status.can_retry_failed
    ? '重試失敗文件'
    : status.can_resume
      ? '繼續重建'
      : null;

  return (
    <Box borderWidth="1px" borderRadius="lg" p={4} data-testid="graph-rebuild-progress">
      <HStack justify="space-between" align="start" spacing={4} flexWrap="wrap">
        <Stack spacing={1}>
          <Text fontWeight="semibold">完整重建進度</Text>
          <Text color="gray.500">{PHASE_LABELS[status.phase]}</Text>
        </Stack>
        <Badge colorScheme={status.state === 'completed' ? 'green' : 'orange'}>{status.state}</Badge>
      </HStack>

      <HStack justify="space-between" mt={3}>
        <Text fontWeight="medium">{status.processed} / {status.total}（{status.progress_percent}%）</Text>
        <Text color="gray.500">成功 {status.succeeded}・失敗 {status.failed}・部分成功 {status.partial}</Text>
      </HStack>
      <Progress mt={2} value={status.progress_percent} colorScheme="orange" borderRadius="full" />

      {status.current_document && (
        <Text mt={3}>
          目前文件：{status.current_document.file_name ?? status.current_document.doc_id}：第 {status.current_document.attempt} 次，共 {status.max_attempts ?? 3} 次
        </Text>
      )}
      {status.live_graph_unchanged && (
        <Alert status="info" mt={3} borderRadius="md">
          <AlertIcon />目前查詢仍使用舊圖譜；新圖譜只會在所有文件成功後切換。
        </Alert>
      )}
      {status.state === 'completed' && !status.live_graph_unchanged && (
        <Alert status="success" mt={3} borderRadius="md">
          <AlertIcon />新圖譜已切換，查詢目前使用新圖譜。
        </Alert>
      )}
      {status.last_error && <Text mt={3} color="red.500">最近錯誤：{status.last_error}</Text>}

      <HStack mt={3} spacing={3} flexWrap="wrap">
        {actionLabel && (
          <Button colorScheme="orange" onClick={onResume} isLoading={isActionPending}>
            {actionLabel}
          </Button>
        )}
        {status.documents.length > 0 && (
          <Button variant="ghost" onClick={() => setShowDocuments((value) => !value)}>
            {showDocuments ? '收合文件狀態' : '查看文件狀態'}
          </Button>
        )}
      </HStack>

      <Collapse in={showDocuments} animateOpacity>
        <Stack mt={3} spacing={2}>
          {status.documents.map((document) => (
            <Box key={document.doc_id} borderWidth="1px" borderRadius="md" p={2}>
              <HStack justify="space-between">
                <Text noOfLines={1}>{document.file_name ?? document.doc_id}</Text>
                <Badge>{document.state}</Badge>
              </HStack>
              {document.last_error && <Text color="red.500" fontSize="sm">{document.last_error}</Text>}
            </Box>
          ))}
        </Stack>
      </Collapse>
    </Box>
  );
}
