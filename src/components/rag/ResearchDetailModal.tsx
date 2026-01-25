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
                  {new Date(timestamp).toLocaleString()}
                </Text>
              )}
              <Badge colorScheme={data.confidence > 0.8 ? 'green' : data.confidence > 0.5 ? 'yellow' : 'red'}>
                Confidence: {(data.confidence * 100).toFixed(0)}%
              </Badge>
              <Badge colorScheme="blue">
                Iterations: {data.total_iterations}
              </Badge>
            </HStack>
          </VStack>
        </ModalHeader>
        <ModalCloseButton />
        
        <ModalBody>
          <Tabs variant="enclosed" colorScheme="blue" isLazy>
            <TabList>
              <Tab>Executive Summary</Tab>
              <Tab>Full Report</Tab>
              <Tab>Research Process</Tab>
            </TabList>

            <TabPanels>
              <TabPanel>
                <Box p={2}>
                  <Text fontSize="md" lineHeight="tall">
                    {data.summary || "No summary available."}
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
                     {data.detailed_answer || "No details available."}
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
            Close
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};
