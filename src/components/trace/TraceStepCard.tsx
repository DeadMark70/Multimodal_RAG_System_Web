import {
  Accordion,
  AccordionButton,
  AccordionIcon,
  AccordionItem,
  AccordionPanel,
  Badge,
  Box,
  HStack,
  Stack,
  Text,
} from '@chakra-ui/react';

import type { AgentTraceStep } from '../../types/evaluation';
import { PHASE_LABELS, phaseColor, statusColor } from './traceUi';

interface TraceStepCardProps {
  step: AgentTraceStep;
  background?: string;
}

export default function TraceStepCard({ step, background = 'white' }: TraceStepCardProps) {
  const totalTokens = step.token_usage.total_tokens ?? 0;

  return (
    <Box borderWidth="1px" borderRadius="lg" p={4} bg={background}>
      <HStack justify="space-between" align="start" mb={3}>
        <Stack spacing={1}>
          <Text fontWeight="semibold">{step.title}</Text>
          <HStack>
            <Badge colorScheme={phaseColor(step.phase)}>{PHASE_LABELS[step.phase]}</Badge>
            <Badge colorScheme={statusColor(step.status)}>{step.status}</Badge>
            {totalTokens > 0 && <Badge colorScheme="gray">{totalTokens} tokens</Badge>}
            {step.tool_calls.length > 0 && <Badge colorScheme="cyan">{step.tool_calls.length} tools</Badge>}
          </HStack>
        </Stack>
      </HStack>

      <Stack spacing={3}>
        {step.input_preview && (
          <Box>
            <Text fontSize="sm" fontWeight="medium" color="gray.600">
              Input
            </Text>
            <Text fontSize="sm">{step.input_preview}</Text>
          </Box>
        )}
        {step.output_preview && (
          <Box>
            <Text fontSize="sm" fontWeight="medium" color="gray.600">
              Output
            </Text>
            <Text fontSize="sm">{step.output_preview}</Text>
          </Box>
        )}
        {step.tool_calls.length > 0 && (
          <Box>
            <Text fontSize="sm" fontWeight="medium" color="gray.600" mb={2}>
              Tool Calls
            </Text>
            <Stack spacing={2}>
              {step.tool_calls.map((toolCall) => (
                <Box key={`${step.step_id}-${toolCall.index}`} borderWidth="1px" borderRadius="md" p={2} bg="gray.50">
                  <HStack justify="space-between" mb={1}>
                    <Text fontSize="sm" fontWeight="medium">
                      {toolCall.action}
                    </Text>
                    <Badge colorScheme={statusColor(toolCall.status)}>{toolCall.status}</Badge>
                  </HStack>
                  {toolCall.result_preview && (
                    <Text fontSize="xs" color="gray.600">
                      {toolCall.result_preview}
                    </Text>
                  )}
                </Box>
              ))}
            </Stack>
          </Box>
        )}
        {step.raw_text && (
          <Accordion allowToggle>
            <AccordionItem borderWidth="1px" borderRadius="md">
              <AccordionButton>
                <Box flex="1" textAlign="left" fontSize="sm" fontWeight="medium">
                  Raw Thought
                </Box>
                <AccordionIcon />
              </AccordionButton>
              <AccordionPanel pt={0}>
                <Text whiteSpace="pre-wrap" fontSize="xs" color="gray.700">
                  {step.raw_text}
                </Text>
              </AccordionPanel>
            </AccordionItem>
          </Accordion>
        )}
      </Stack>
    </Box>
  );
}
