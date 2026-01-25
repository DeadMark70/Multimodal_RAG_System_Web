import React from 'react';
import {
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionPanel,
  AccordionIcon,
  Box,
  Text,
  Badge,
  VStack,
  HStack,
  Icon,
} from '@chakra-ui/react';
import { FaExternalLinkAlt, FaBrain } from 'react-icons/fa';
import type { SubTaskResult } from '../../types/rag';
import ReactMarkdown from 'react-markdown';

interface ResearchStepsAccordionProps {
  subTasks: SubTaskResult[];
}

export const ResearchStepsAccordion: React.FC<ResearchStepsAccordionProps> = ({ subTasks }) => {
  if (!subTasks || subTasks.length === 0) {
    return <Text color="gray.500">尚無詳細執行步驟</Text>;
  }

  return (
    <Accordion allowMultiple>
      {subTasks.map((task) => (
        <AccordionItem key={`${task.id}-${task.iteration}`} border="1px solid" borderColor="gray.200" borderRadius="md" mb={2}>
          <h2>
            <AccordionButton _expanded={{ bg: 'blue.50', color: 'blue.600' }}>
              <Box flex="1" textAlign="left" fontWeight="medium">
                <HStack>
                   <Badge colorScheme="purple">Step {task.id}</Badge>
                   <Text noOfLines={1}>{task.question}</Text>
                </HStack>
              </Box>
              <AccordionIcon />
            </AccordionButton>
          </h2>
          <AccordionPanel pb={4} bg="white">
            <VStack align="start" spacing={3}>
              <Box w="full">
                 <Text fontWeight="bold" mb={1} color="gray.700">Answer:</Text>
                 <Box bg="gray.50" p={3} borderRadius="md" fontSize="sm">
                   <ReactMarkdown>{task.answer}</ReactMarkdown>
                 </Box>
              </Box>

              {task.thought_process && (
                <Box w="full">
                  <HStack mb={1}>
                    <Icon as={FaBrain} color="orange.400" />
                    <Text fontWeight="bold" color="gray.700" fontSize="sm">Thinking Process:</Text>
                  </HStack>
                  <Text fontSize="xs" color="gray.600" fontStyle="italic" bg="orange.50" p={2} borderRadius="md">
                    {task.thought_process}
                  </Text>
                </Box>
              )}

              {task.sources && task.sources.length > 0 && (
                <Box w="full">
                  <Text fontWeight="bold" mb={1} fontSize="sm" color="gray.700">Sources:</Text>
                  <VStack align="start" pl={2}>
                    {task.sources.map((source, idx) => (
                      <HStack key={idx} fontSize="xs">
                        <Icon as={FaExternalLinkAlt} size="xs" color="blue.400" />
                        <Text color="blue.500" isTruncated maxW="300px">
                           {source}
                        </Text>
                      </HStack>
                    ))}
                  </VStack>
                </Box>
              )}
            </VStack>
          </AccordionPanel>
        </AccordionItem>
      ))}
    </Accordion>
  );
};
