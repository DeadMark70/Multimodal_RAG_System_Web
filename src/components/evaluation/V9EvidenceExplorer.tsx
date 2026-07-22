import {
  Badge,
  Box,
  Button,
  Code,
  Heading,
  HStack,
  SimpleGrid,
  Stack,
  Table,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
} from '@chakra-ui/react';
import { useMemo, useState } from 'react';
import type { AgenticV9RunEvidence } from '../../pages/EvaluationCenter.mappers';
import type { V9EvidenceScope } from '../../types/evaluation';
import { formatOptionalText, formatOptionalTokens } from './evaluationDisplay';

const PAGE_SIZE = 10;
const EXCERPT_LIMIT = 600;

export interface GraphObservabilityView {
  status: 'recorded' | 'fallback' | 'not_instrumented';
  events: Array<{
    route: string | null;
    routerReason: string | null;
    nodeCount: number | null;
    edgeCount: number | null;
    pathCount: number | null;
    graphToChunkSuccessRate: number | null;
  }>;
  evidenceItems: Array<{ source: string | null; locator: string | null }>;
}

function stateText(value: boolean | undefined): string {
  return value === undefined ? 'N/A' : value ? 'yes' : 'no';
}

function locatorText(locator: { printed_page_label?: string | null; section?: string | null; table_id?: string | null; figure_id?: string | null; pdf_page_index?: number | null }): string {
  const parts = [
    locator.printed_page_label ? `p. ${locator.printed_page_label}` : null,
    locator.section ?? null,
    locator.table_id ?? null,
    locator.figure_id ?? null,
    locator.pdf_page_index == null ? null : `PDF ${locator.pdf_page_index}`,
  ].filter((part): part is string => Boolean(part));
  return parts.length ? parts.join(' · ') : 'N/A';
}

function scopeText(scope: V9EvidenceScope): string {
  const parts = Object.entries(scope)
    .filter(([, value]) => value !== null && value !== undefined && value !== '')
    .map(([key, value]) => `${key}: ${String(value)}`);
  return parts.length ? parts.join(' · ') : 'N/A';
}

function boundedExcerpt(value: string): string {
  return value.length > EXCERPT_LIMIT ? `${value.slice(0, EXCERPT_LIMIT)}…` : value;
}

function copyText(value: string) {
  void globalThis.navigator?.clipboard?.writeText?.(value);
}

function graphState(policy: string | null | undefined, graph: GraphObservabilityView | undefined): { label: string; message: string } {
  if (!graph || graph.status === 'not_instrumented') {
    if (policy === 'never') return { label: 'Not requested', message: 'The contract disabled graph traversal for this run.' };
    return { label: 'Not instrumented', message: 'Graph traversal is not instrumented for this run; mode alone is not evidence of traversal.' };
  }
  if (graph.status === 'fallback') return { label: 'Fallback', message: 'Graph routing fell back; recorded diagnostics remain available below.' };
  if (!graph.events.length) return { label: 'Not triggered', message: 'Graph observability was recorded, but no traversal event was triggered.' };
  return { label: 'Traversal recorded', message: 'Recorded graph events are shown below; zero counts are measured zeros, while missing counts remain N/A.' };
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    supported: 'green',
    conflicted: 'red',
    explicitly_unavailable: 'orange',
    not_found: 'gray',
  };
  return <Badge colorScheme={colors[status] ?? 'gray'}>{status}</Badge>;
}

function GraphPanel({ policy, graph }: { policy: string | null | undefined; graph?: GraphObservabilityView }) {
  const state = graphState(policy, graph);
  return (
    <Box borderWidth="1px" borderRadius="md" p={3} data-testid="v9-graph-observability">
      <Heading size="sm" mb={2}>Graph provenance</Heading>
      <Stack spacing={2} fontSize="sm">
        <Text>Policy: {formatOptionalText(policy)}</Text>
        <Badge alignSelf="start" colorScheme={state.label === 'Traversal recorded' ? 'green' : state.label === 'Fallback' ? 'orange' : 'gray'}>{state.label}</Badge>
        <Text color="text.secondary">{state.message}</Text>
        {(graph?.events ?? []).map((event, index) => (
          <Text key={`${event.route ?? 'n/a'}-${index}`} color="text.secondary">
            {`Route ${formatOptionalText(event.route)} · reason ${formatOptionalText(event.routerReason)} · nodes ${formatOptionalTokens(event.nodeCount)} · edges ${formatOptionalTokens(event.edgeCount)} · paths ${formatOptionalTokens(event.pathCount)} · graph→chunk ${event.graphToChunkSuccessRate == null ? 'N/A' : `${(event.graphToChunkSuccessRate * 100).toFixed(1)}%`}`}
          </Text>
        ))}
        {graph?.evidenceItems.length ? (
          <Stack spacing={1}>
            <Text fontWeight="medium">Resolved source evidence</Text>
            {graph.evidenceItems.map((item, index) => (
              <Text key={`${item.source ?? 'n/a'}-${index}`} color="text.secondary">
                {`${formatOptionalText(item.source)} · ${formatOptionalText(item.locator)}`}
              </Text>
            ))}
          </Stack>
        ) : graph?.status === 'recorded' ? <Text color="text.secondary">Resolved source evidence: none recorded.</Text> : null}
      </Stack>
    </Box>
  );
}

/**
 * Renders only the typed selected-run v9 evidence projection. Missing telemetry
 * deliberately remains N/A rather than being inferred from packet ordering.
 */
export default function V9EvidenceExplorer({
  data,
  graph,
}: {
  data?: AgenticV9RunEvidence;
  graph?: GraphObservabilityView;
}) {
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [expandedPackets, setExpandedPackets] = useState<Set<string>>(new Set());
  const [selectedPacketId, setSelectedPacketId] = useState<string | null>(null);
  const packets = data?.evidencePackets;
  const packed = useMemo(() => new Set(data?.contextPack?.packedEvidenceIds ?? []), [data?.contextPack?.packedEvidenceIds]);
  const used = useMemo(() => new Set((data?.finalClaims ?? []).flatMap((claim) => [...(claim.evidenceIds ?? []), ...(claim.premiseEvidenceIds ?? [])])), [data?.finalClaims]);
  const visiblePackets = packets?.slice(0, visibleCount) ?? [];

  if (!data) {
    return <Text color="text.secondary">Evidence-first v9 observability is unavailable for this historical run.</Text>;
  }

  function openPacket(packetId: string) {
    setSelectedPacketId(packetId);
    globalThis.document?.getElementById(`v9-evidence-packet-${packetId}`)?.scrollIntoView?.({ block: 'nearest' });
  }

  return (
    <Stack spacing={4} data-testid="v9-evidence-explorer" data-agentic-v9-run-id={data.runId}>
      <Box>
        <Heading size="sm" mb={2}>Evidence packets</Heading>
        {selectedPacketId ? <Text fontSize="sm" color="text.secondary">Selected packet: {selectedPacketId}</Text> : null}
        {packets === undefined ? <Text color="text.secondary">N/A — evidence packets were not instrumented.</Text> : !packets.length ? <Text color="text.secondary">No evidence packets recorded.</Text> : (
          <Box overflowX="auto">
            <Table size="sm">
              <Thead><Tr><Th>Packet</Th><Th>Source</Th><Th>Scope</Th><Th>Locator</Th><Th>Support</Th><Th>Slots</Th><Th>Round</Th><Th>Packed</Th><Th>Used</Th><Th>Cited</Th></Tr></Thead>
              <Tbody>
                {visiblePackets.map(({ evidence_id: packetId, packet }) => {
                  const expanded = expandedPackets.has(packetId);
                  return (
                    <Tr id={`v9-evidence-packet-${packetId}`} key={packetId} bg={selectedPacketId === packetId ? 'blue.50' : undefined}>
                      <Td><Stack spacing={1}><Code whiteSpace="pre-wrap">{packetId}</Code><HStack><Button size="xs" onClick={() => copyText(packetId)}>Copy</Button><Button size="xs" variant="outline" onClick={() => setExpandedPackets((current) => { const next = new Set(current); if (expanded) { next.delete(packetId); } else { next.add(packetId); } return next; })}>{expanded ? `Hide excerpt for ${packetId}` : `Show excerpt for ${packetId}`}</Button></HStack>{expanded ? <Text whiteSpace="pre-wrap" maxW="420px">{boundedExcerpt(packet.statement)}</Text> : null}</Stack></Td>
                      <Td>{packet.source.document_name ?? packet.source.doc_id}</Td>
                      <Td>{scopeText(packet.scope)}</Td>
                      <Td>{locatorText(packet.locator)}</Td>
                      <Td>{packet.support_type}</Td>
                      <Td>{packet.slot_ids.length ? packet.slot_ids.join(', ') : 'N/A'}</Td>
                      <Td>{packet.round_id}</Td>
                      <Td>{stateText(data.contextPack?.packedEvidenceIds === undefined ? undefined : packed.has(packetId))}</Td>
                      <Td>{stateText(data.finalClaims === undefined ? undefined : used.has(packetId))}</Td>
                      <Td>N/A</Td>
                    </Tr>
                  );
                })}
              </Tbody>
            </Table>
            {packets.length > visiblePackets.length ? <Button mt={2} size="sm" variant="outline" onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}>Show {Math.min(PAGE_SIZE, packets.length - visiblePackets.length)} more packets</Button> : null}
          </Box>
        )}
      </Box>

      <SimpleGrid columns={{ base: 1, xl: 2 }} spacing={4}>
        <Box borderWidth="1px" borderRadius="md" p={3}>
          <Heading size="sm" mb={2}>Slot resolutions</Heading>
          {data.slotResolutions === undefined ? <Text color="text.secondary">N/A — slot resolution was not instrumented.</Text> : !data.slotResolutions.length ? <Text color="text.secondary">No slot resolutions recorded.</Text> : (
            <Table size="sm"><Thead><Tr><Th>Slot</Th><Th>Status</Th><Th>Evidence</Th><Th>Reason</Th></Tr></Thead><Tbody>{data.slotResolutions.map((item) => <Tr key={item.slot_id}><Td>{item.slot_id}</Td><Td><StatusBadge status={item.resolution.status} /></Td><Td>{item.resolution.evidence_ids?.length ? item.resolution.evidence_ids.join(', ') : 'N/A'}</Td><Td whiteSpace="pre-wrap">{formatOptionalText(item.resolution.reason)}</Td></Tr>)}</Tbody></Table>
          )}
        </Box>

        <Box borderWidth="1px" borderRadius="md" p={3}>
          <Heading size="sm" mb={2}>Context pack</Heading>
          {data.contextPack === undefined ? <Text color="text.secondary">N/A — context packing was not instrumented.</Text> : data.contextPack === null ? <Text color="text.secondary">No context pack materialized.</Text> : (
            <Stack spacing={1} fontSize="sm">
              <Text>Input packets: {packets === undefined ? 'N/A' : packets.length}</Text>
              <Text>Packed packets: {data.contextPack.packedEvidenceIds === undefined ? 'N/A' : data.contextPack.packedEvidenceIds.length}</Text>
              <Text>Dropped packets: {data.contextPack.droppedEvidenceIds === undefined ? 'N/A' : data.contextPack.droppedEvidenceIds.length}</Text>
              <Text>Total packed tokens: {formatOptionalTokens(data.contextPack.tokenCount)}</Text>
              <Text>Per-slot tokens: N/A (not instrumented)</Text>
              <Text>Per-source tokens: N/A (not instrumented)</Text>
            </Stack>
          )}
        </Box>
      </SimpleGrid>

      <GraphPanel policy={data.queryContract?.graph_policy} graph={graph} />

      <Box borderWidth="1px" borderRadius="md" p={3}>
        <Heading size="sm" mb={2}>Visual evidence</Heading>
        {packets === undefined ? <Text color="text.secondary">N/A — evidence packets were not instrumented.</Text> : (() => {
          const visuals = packets.filter(({ packet }) => packet.source.asset_id);
          return visuals.length ? <Stack spacing={1}>{visuals.map(({ evidence_id, packet }) => <Text key={evidence_id} fontSize="sm">{`${packet.source.asset_id} · ${packet.source.doc_id} · ${locatorText(packet.locator)}`}</Text>)}</Stack> : <Text color="text.secondary">No visual asset locator/evidence recorded.</Text>;
        })()}
      </Box>

      <Box borderWidth="1px" borderRadius="md" p={3}>
        <Heading size="sm" mb={2}>Claim citations</Heading>
        {data.finalClaims === undefined ? <Text color="text.secondary">N/A — final claim evidence was not instrumented.</Text> : !data.finalClaims.length ? <Text color="text.secondary">No final claims recorded.</Text> : <Stack spacing={2}>{data.finalClaims.map((claim) => <Box key={claim.claimId}><HStack justify="space-between" align="start"><Text whiteSpace="pre-wrap">{claim.statement}</Text><Button size="xs" onClick={() => copyText(claim.claimId)}>{`Copy claim ${claim.claimId}`}</Button></HStack>{claim.evidenceIds?.length ? <HStack mt={1} flexWrap="wrap">{claim.evidenceIds.map((packetId) => <Button key={packetId} size="xs" variant="outline" onClick={() => openPacket(packetId)}>{`Open packet ${packetId} for claim ${claim.claimId}`}</Button>)}</HStack> : <Text fontSize="sm" color="text.secondary">Evidence packets: N/A</Text>}</Box>)}</Stack>}
      </Box>
    </Stack>
  );
}
