import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Accordion,
  AccordionButton,
  AccordionIcon,
  AccordionItem,
  AccordionPanel,
  Badge,
  Box,
  FormControl,
  FormLabel,
  Grid,
  GridItem,
  HStack,
  Heading,
  Select,
  Spinner,
  Stack,
  Text,
  VStack,
  useToast,
} from '@chakra-ui/react';
import {
  getCampaignResultTrace,
  listCampaignTraces,
  listCampaigns,
} from '../../services/evaluationApi';
import type {
  AgentTraceDetail,
  AgentTracePhase,
  AgentTraceStatus,
  AgentTraceStep,
  AgentTraceSummary,
  CampaignStatus,
} from '../../types/evaluation';

const PHASE_LABELS: Record<AgentTracePhase, string> = {
  planning: 'Planning',
  execution: 'Execution',
  drilldown: 'Drill-down',
  evaluation: 'Evaluation',
  synthesis: 'Synthesis',
};

function statusColor(status: AgentTraceStatus): string {
  switch (status) {
    case 'completed':
      return 'green';
    case 'partial':
      return 'yellow';
    case 'failed':
      return 'red';
    default:
      return 'gray';
  }
}

function phaseColor(phase: AgentTracePhase): string {
  switch (phase) {
    case 'planning':
      return 'blue';
    case 'execution':
      return 'teal';
    case 'drilldown':
      return 'orange';
    case 'evaluation':
      return 'purple';
    case 'synthesis':
      return 'pink';
    default:
      return 'gray';
  }
}

function formatModeCampaign(campaign: CampaignStatus): string {
  return `${campaign.name || campaign.id} (${campaign.config.modes.join(', ')})`;
}

function TraceStepCard({ step }: { step: AgentTraceStep }) {
  const toolTokenCount = step.token_usage.total_tokens ?? 0;

  return (
    <Box borderWidth="1px" borderRadius="lg" p={4} bg="white">
      <HStack justify="space-between" align="start" mb={3}>
        <VStack align="start" spacing={1}>
          <Text fontWeight="semibold">{step.title}</Text>
          <HStack>
            <Badge colorScheme={phaseColor(step.phase)}>{PHASE_LABELS[step.phase]}</Badge>
            <Badge colorScheme={statusColor(step.status)}>{step.status}</Badge>
            {toolTokenCount > 0 && <Badge colorScheme="gray">{toolTokenCount} tokens</Badge>}
            {step.tool_calls.length > 0 && <Badge colorScheme="cyan">{step.tool_calls.length} tools</Badge>}
          </HStack>
        </VStack>
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

function TraceColumn({ detail }: { detail: AgentTraceDetail }) {
  const groupedSteps = useMemo(() => {
    const groups = new Map<AgentTracePhase, AgentTraceStep[]>();
    for (const step of detail.steps) {
      const current = groups.get(step.phase) ?? [];
      current.push(step);
      groups.set(step.phase, current);
    }
    return Array.from(groups.entries());
  }, [detail.steps]);

  return (
    <Box borderWidth="1px" borderRadius="lg" p={5} h="100%">
      <Stack spacing={4}>
        <Box>
          <Heading size="sm">{detail.question_id}</Heading>
          <Text mt={1}>{detail.question}</Text>
          <HStack mt={2}>
            <Badge colorScheme={phaseColor('execution')}>{detail.mode}</Badge>
            <Badge colorScheme={statusColor(detail.trace_status)}>{detail.trace_status}</Badge>
            <Badge colorScheme="gray">run {detail.run_number}</Badge>
            <Badge colorScheme="gray">{detail.total_tokens} tokens</Badge>
          </HStack>
          {detail.summary && (
            <Text mt={3} color="gray.600" fontSize="sm">
              {detail.summary}
            </Text>
          )}
        </Box>

        {groupedSteps.map(([phase, steps]) => (
          <Box key={phase}>
            <Heading size="xs" mb={3} textTransform="uppercase" letterSpacing="0.08em" color="gray.500">
              {PHASE_LABELS[phase]}
            </Heading>
            <Stack spacing={3}>
              {steps.map((step) => (
                <TraceStepCard key={step.step_id} step={step} />
              ))}
            </Stack>
          </Box>
        ))}
      </Stack>
    </Box>
  );
}

export default function AgentTraceViewer() {
  const toast = useToast();
  const [campaigns, setCampaigns] = useState<CampaignStatus[]>([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState('');
  const [traceSummaries, setTraceSummaries] = useState<AgentTraceSummary[]>([]);
  const [primaryResultId, setPrimaryResultId] = useState('');
  const [secondaryResultId, setSecondaryResultId] = useState('');
  const [primaryDetail, setPrimaryDetail] = useState<AgentTraceDetail | null>(null);
  const [secondaryDetail, setSecondaryDetail] = useState<AgentTraceDetail | null>(null);
  const [loadingCampaigns, setLoadingCampaigns] = useState(true);
  const [loadingTraces, setLoadingTraces] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);

  const loadCampaigns = useCallback(async () => {
    setLoadingCampaigns(true);
    try {
      const items = await listCampaigns();
      setCampaigns(items);
      setSelectedCampaignId((current) => current || items[0]?.id || '');
    } catch (error) {
      toast({
        title: '載入 campaign 失敗',
        description: error instanceof Error ? error.message : '未知錯誤',
        status: 'error',
      });
    } finally {
      setLoadingCampaigns(false);
    }
  }, [toast]);

  const loadTraceSummaries = useCallback(
    async (campaignId: string) => {
      setLoadingTraces(true);
      try {
        const items = await listCampaignTraces(campaignId);
        setTraceSummaries(items);
        setPrimaryResultId(items[0]?.campaign_result_id ?? '');
        setSecondaryResultId('');
      } catch (error) {
        toast({
          title: '載入 trace 清單失敗',
          description: error instanceof Error ? error.message : '未知錯誤',
          status: 'error',
        });
        setTraceSummaries([]);
        setPrimaryResultId('');
        setSecondaryResultId('');
      } finally {
        setLoadingTraces(false);
      }
    },
    [toast]
  );

  useEffect(() => {
    void loadCampaigns();
  }, [loadCampaigns]);

  useEffect(() => {
    if (!selectedCampaignId) {
      setTraceSummaries([]);
      setPrimaryResultId('');
      setSecondaryResultId('');
      return;
    }
    void loadTraceSummaries(selectedCampaignId);
  }, [loadTraceSummaries, selectedCampaignId]);

  useEffect(() => {
    if (!selectedCampaignId || !primaryResultId) {
      setPrimaryDetail(null);
      setSecondaryDetail(null);
      return;
    }

    const run = async () => {
      setLoadingDetails(true);
      try {
        const [primary, secondary] = await Promise.all([
          getCampaignResultTrace(selectedCampaignId, primaryResultId),
          secondaryResultId
            ? getCampaignResultTrace(selectedCampaignId, secondaryResultId)
            : Promise.resolve(null),
        ]);
        setPrimaryDetail(primary);
        setSecondaryDetail(secondary);
      } catch (error) {
        toast({
          title: '載入 trace 內容失敗',
          description: error instanceof Error ? error.message : '未知錯誤',
          status: 'error',
        });
      } finally {
        setLoadingDetails(false);
      }
    };

    void run();
  }, [primaryResultId, secondaryResultId, selectedCampaignId, toast]);

  const availableComparisonOptions = useMemo(
    () => traceSummaries.filter((item) => item.campaign_result_id !== primaryResultId),
    [primaryResultId, traceSummaries]
  );

  if (loadingCampaigns) {
    return (
      <HStack py={8} justify="center">
        <Spinner />
        <Text>載入 trace campaigns...</Text>
      </HStack>
    );
  }

  if (campaigns.length === 0) {
    return <Text color="gray.500">尚未建立任何 campaign，因此目前沒有可檢視的 trace。</Text>;
  }

  return (
    <VStack align="stretch" spacing={6}>
      <Box borderWidth="1px" borderRadius="lg" p={5}>
        <Grid templateColumns={{ base: '1fr', xl: 'repeat(3, 1fr)' }} gap={4}>
          <GridItem>
            <FormControl>
              <FormLabel>Campaign</FormLabel>
              <Select value={selectedCampaignId} onChange={(event) => setSelectedCampaignId(event.target.value)}>
                {campaigns.map((campaign) => (
                  <option key={campaign.id} value={campaign.id}>
                    {formatModeCampaign(campaign)}
                  </option>
                ))}
              </Select>
            </FormControl>
          </GridItem>

          <GridItem>
            <FormControl>
              <FormLabel>Primary Trace</FormLabel>
              <Select value={primaryResultId} onChange={(event) => setPrimaryResultId(event.target.value)} isDisabled={traceSummaries.length === 0}>
                {traceSummaries.map((summary) => (
                  <option key={summary.campaign_result_id} value={summary.campaign_result_id}>
                    {summary.question_id} / run {summary.run_number} / {summary.trace_status}
                  </option>
                ))}
              </Select>
            </FormControl>
          </GridItem>

          <GridItem>
            <FormControl>
              <FormLabel>Compare With</FormLabel>
              <Select
                value={secondaryResultId}
                onChange={(event) => setSecondaryResultId(event.target.value)}
                isDisabled={availableComparisonOptions.length === 0}
              >
                <option value="">不比較</option>
                {availableComparisonOptions.map((summary) => (
                  <option key={summary.campaign_result_id} value={summary.campaign_result_id}>
                    {summary.question_id} / run {summary.run_number} / {summary.trace_status}
                  </option>
                ))}
              </Select>
            </FormControl>
          </GridItem>
        </Grid>
      </Box>

      {loadingTraces ? (
        <HStack py={6} justify="center">
          <Spinner />
          <Text>載入 trace 清單...</Text>
        </HStack>
      ) : traceSummaries.length === 0 ? (
        <Box borderWidth="1px" borderRadius="lg" p={5}>
          <Text color="gray.500">此 campaign 目前沒有 agent trace。請先執行含 `agentic` 模式的 campaign。</Text>
        </Box>
      ) : (
        <>
          <Box borderWidth="1px" borderRadius="lg" p={5}>
            <Heading size="sm" mb={4}>
              Available Traces
            </Heading>
            <Stack spacing={3}>
              {traceSummaries.map((summary) => (
                <HStack key={summary.trace_id} justify="space-between" borderWidth="1px" borderRadius="md" p={3}>
                  <Box>
                    <Text fontWeight="medium">
                      {summary.question_id} / run {summary.run_number}
                    </Text>
                    <Text fontSize="sm" color="gray.600">
                      {summary.question}
                    </Text>
                  </Box>
                  <HStack>
                    <Badge colorScheme={statusColor(summary.trace_status)}>{summary.trace_status}</Badge>
                    <Badge colorScheme="gray">{summary.step_count} steps</Badge>
                    <Badge colorScheme="gray">{summary.tool_call_count} tools</Badge>
                    <Badge colorScheme="gray">{summary.total_tokens} tokens</Badge>
                  </HStack>
                </HStack>
              ))}
            </Stack>
          </Box>

          {loadingDetails ? (
            <HStack py={6} justify="center">
              <Spinner />
              <Text>載入 trace 內容...</Text>
            </HStack>
          ) : primaryDetail ? (
            <Grid templateColumns={{ base: '1fr', xl: secondaryDetail ? '1fr 1fr' : '1fr' }} gap={6}>
              <GridItem>
                <TraceColumn detail={primaryDetail} />
              </GridItem>
              {secondaryDetail && (
                <GridItem>
                  <TraceColumn detail={secondaryDetail} />
                </GridItem>
              )}
            </Grid>
          ) : (
            <Box borderWidth="1px" borderRadius="lg" p={5}>
              <Text color="gray.500">請選擇一筆 trace 以檢視時間軸內容。</Text>
            </Box>
          )}
        </>
      )}
    </VStack>
  );
}
