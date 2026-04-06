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
  useColorModeValue,
} from '@chakra-ui/react';

import type { AgentTraceStep } from '../../types/evaluation';
import { PHASE_LABELS, phaseColor, statusColor } from './traceUi';

interface TraceStepCardProps {
  step: AgentTraceStep;
  background?: string;
}

export default function TraceStepCard({ step, background = 'white' }: TraceStepCardProps) {
  const totalTokens = step.token_usage.total_tokens ?? 0;
  const borderColor = useColorModeValue('gray.200', 'whiteAlpha.200');
  const subTextColor = useColorModeValue('gray.600', 'gray.400');
  const mutedBg = useColorModeValue('gray.50', 'whiteAlpha.50');

  return (
    <Box
      borderBottom="1px solid"
      borderColor={borderColor}
      borderRadius="0"
      p={4}
      bg={background}
    >
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
            <Text fontSize="sm" fontWeight="medium" color={subTextColor}>
              Input
            </Text>
            <Text fontSize="sm">{step.input_preview}</Text>
          </Box>
        )}
        {step.output_preview && (
          <Box>
            <Text fontSize="sm" fontWeight="medium" color={subTextColor}>
              Output
            </Text>
            <Text fontSize="sm">{step.output_preview}</Text>
          </Box>
        )}
        {step.tool_calls.length > 0 && (
          <Box>
            <Text fontSize="sm" fontWeight="medium" color={subTextColor} mb={2}>
              Tool Calls
            </Text>
            <Stack spacing={2}>
              {step.tool_calls.map((toolCall) => (
                <Box key={`${step.step_id}-${toolCall.index}`} borderRadius="lg" p={3} bg={mutedBg}>
                  <HStack justify="space-between" mb={1}>
                    <Text fontSize="sm" fontWeight="medium">
                      {toolCall.action}
                    </Text>
                    <Badge colorScheme={statusColor(toolCall.status)}>{toolCall.status}</Badge>
                  </HStack>
                  {toolCall.result_preview && (
                    <Text fontSize="xs" color={subTextColor}>
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
            <AccordionItem border="none">
              <AccordionButton>
                <Box flex="1" textAlign="left" fontSize="sm" fontWeight="medium">
                  Raw Thought
                </Box>
                <AccordionIcon />
              </AccordionButton>
              <AccordionPanel pt={0}>
                <Box borderRadius="lg" bg={mutedBg} p={3}>
                  <Text whiteSpace="pre-wrap" fontSize="xs" color={subTextColor}>
                  {step.raw_text}
                  </Text>
                </Box>
              </AccordionPanel>
            </AccordionItem>
          </Accordion>
        )}
      </Stack>
    </Box>
  );
}
