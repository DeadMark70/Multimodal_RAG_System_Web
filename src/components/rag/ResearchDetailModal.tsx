import React from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
  ModalFooter,
  Button,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Text,
  Badge,
  HStack,
  VStack,
  Box,
  useColorModeValue,
} from '@chakra-ui/react';
import ReactMarkdown from 'react-markdown';
import { ResearchStepsAccordion } from './ResearchStepsAccordion';
import type { ExecutePlanResponse } from '../../types/rag';

interface ResearchDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: ExecutePlanResponse | null;
  originalQuestion?: string;
  timestamp?: string;
}

export const ResearchDetailModal: React.FC<ResearchDetailModalProps> = ({
  isOpen,
  onClose,
  data,
  originalQuestion,
  timestamp,
}) => {
  const bgColor = useColorModeValue('white', 'gray.800');
  const textColor = useColorModeValue('gray.800', 'white');
  const timestampFormatter = new Intl.DateTimeFormat('zh-TW', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  if (!data) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="4xl" scrollBehavior="inside">
      <ModalOverlay backdropFilter="blur(5px)" />
      <ModalContent bg={bgColor} color={textColor} height="80vh">
        <ModalHeader>
          <VStack align="start" spacing={2}>
            <Text fontSize="lg" fontWeight="bold" noOfLines={2}>
              {originalQuestion || data.question}
            </Text>
            <HStack spacing={4} fontSize="sm" fontWeight="normal">
              {timestamp && (
                <Text color="gray.500">
                  {timestampFormatter.format(new Date(timestamp))}
                </Text>
              )}
              <Badge colorScheme={data.confidence > 0.8 ? 'green' : data.confidence > 0.5 ? 'yellow' : 'red'}>
                可信度 {(data.confidence * 100).toFixed(0)}%
              </Badge>
              <Badge colorScheme="blue">
                迭代 {data.total_iterations}
              </Badge>
            </HStack>
          </VStack>
        </ModalHeader>
        <ModalCloseButton />
        
        <ModalBody>
          <Tabs variant="enclosed" colorScheme="blue" isLazy>
            <TabList>
              <Tab>摘要</Tab>
              <Tab>完整報告</Tab>
              <Tab>研究過程</Tab>
            </TabList>

            <TabPanels>
              <TabPanel>
                <Box p={2}>
                  <Text fontSize="md" lineHeight="tall">
                    {data.summary || '目前沒有摘要內容。'}
                  </Text>
                </Box>
              </TabPanel>
              
              <TabPanel>
                 <Box className="markdown-body" p={2} sx={{ 
                     'h1, h2, h3': { mt: 4, mb: 2, fontWeight: 'bold' }, 
                     'p': { mb: 3 },
                     'ul, ol': { pl: 5, mb: 3 },
                     'code': { bg: 'gray.100', p: 1, borderRadius: 'sm' }
                  }}>
                   <ReactMarkdown>
                     {data.detailed_answer || '目前沒有詳細報告。'}
                   </ReactMarkdown>
                 </Box>
              </TabPanel>

              <TabPanel>
                <ResearchStepsAccordion subTasks={data.sub_tasks} />
              </TabPanel>
            </TabPanels>
          </Tabs>
        </ModalBody>

        <ModalFooter>
          <Button colorScheme="blue" mr={3} onClick={onClose}>
            關閉
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};
