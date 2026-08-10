import {
  Alert,
  AlertIcon,
  Badge,
  Box,
  Button,
  Center,
  Divider,
  Drawer,
  DrawerBody,
  DrawerCloseButton,
  DrawerContent,
  DrawerHeader,
  DrawerOverlay,
  Heading,
  Spinner,
  Stack,
  Text,
  useBreakpointValue,
} from '@chakra-ui/react';
import type React from 'react';

import type { EvidenceNavigationState } from '../../hooks/useEvidenceNavigation';
import type { SourceEvidence } from '../../types/evidence';

export interface EvidenceDrawerProps {
  state: EvidenceNavigationState;
  onClose: () => void;
  onOpenSource: (evidence: SourceEvidence) => void;
  finalFocusRef?: React.RefObject<HTMLElement | null>;
}

function EvidenceItem({ item, onOpenSource }: Pick<EvidenceDrawerProps, 'onOpenSource'> & { item: SourceEvidence }) {
  const isSourceOnly = item.provenanceStatus === 'source_only';

  return (
    <Box borderWidth="1px" borderRadius="md" p={4}>
      <Stack spacing={3} align="start">
        <Text fontWeight="semibold">{item.filename ?? '未命名文件'}</Text>
        {!isSourceOnly && (
          <>
            {item.page !== null && <Text fontSize="sm">第 {item.page} 頁</Text>}
            {item.quote && (
              <Box>
                <Text fontSize="sm" fontWeight="medium">原文</Text>
                <Text>{item.quote}</Text>
              </Box>
            )}
            <Badge colorScheme={item.provenanceStatus === 'full' ? 'green' : 'yellow'}>
              {item.provenanceStatus === 'full' ? '已驗證' : '部分驗證'}
            </Badge>
          </>
        )}
        {isSourceOnly && <Text fontSize="sm">僅確認文件關聯，沒有可驗證的原文片段</Text>}
        <Button size="sm" onClick={() => onOpenSource(item)}>
          {item.provenanceStatus === 'source_only' ? '開啟文件' : '開啟原文'}
        </Button>
      </Stack>
    </Box>
  );
}

export function EvidenceDrawer({ state, onClose, onOpenSource, finalFocusRef }: EvidenceDrawerProps) {
  const drawerSize = useBreakpointValue({ base: 'full', md: 'md' }) ?? 'md';
  const evidenceItems = state.items.filter((item) => item.provenanceStatus !== 'source_only');
  const sourceOnlyItems = state.items.filter((item) => item.provenanceStatus === 'source_only');

  return (
    <Drawer isOpen={state.isOpen} onClose={onClose} placement="right" size={drawerSize} finalFocusRef={finalFocusRef}>
      <DrawerOverlay />
      <DrawerContent>
        <DrawerCloseButton />
        <DrawerHeader>{state.title}</DrawerHeader>
        <DrawerBody pb={6}>
          {state.isLoading ? (
            <Center minH="160px"><Spinner /></Center>
          ) : state.error ? (
            <Alert status="error"><AlertIcon />{state.error}</Alert>
          ) : state.items.length === 0 ? (
            <Text>這個節點目前沒有可用的來源證據。</Text>
          ) : (
            <Stack spacing={4}>
              {evidenceItems.map((item, index) => (
                <EvidenceItem key={`${item.docId}:${item.page ?? 'none'}:${index}`} item={item} onOpenSource={onOpenSource} />
              ))}
              {sourceOnlyItems.length > 0 && (
                <>
                  {evidenceItems.length > 0 && <Divider />}
                  <Heading size="sm">相關來源文件</Heading>
                  {sourceOnlyItems.map((item, index) => (
                    <EvidenceItem key={`${item.docId}:source:${index}`} item={item} onOpenSource={onOpenSource} />
                  ))}
                </>
              )}
            </Stack>
          )}
        </DrawerBody>
      </DrawerContent>
    </Drawer>
  );
}
