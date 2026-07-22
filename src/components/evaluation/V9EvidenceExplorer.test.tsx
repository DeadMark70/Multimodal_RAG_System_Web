import { ChakraProvider } from '@chakra-ui/react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import theme from '../../theme';
import V9EvidenceExplorer from './V9EvidenceExplorer';

const evidence = {
  runId: 'run-v9',
  schemaVersion: '1',
  queryContract: {
    route: 'graph_relational' as const,
    intent: 'compare reported results',
    graph_policy: 'required_locator' as const,
    required_slots: [{ slot_id: 'dice', description: 'Dice score' }],
  },
  slotResolutions: [{
    slot_id: 'dice',
    resolution_stage: 'final',
    resolution: { slot_id: 'dice', status: 'supported' as const, evidence_ids: ['packet-1'] },
  }],
  evidencePackets: [{
    evidence_id: 'packet-1',
    packet: {
      schema_version: '1',
      evidence_id: 'packet-1',
      task_id: 'task-1',
      round_id: 'round-2',
      query_id: 'query-1',
      slot_ids: ['dice'],
      statement: '<script>quoted evidence remains plain text</script>',
      support_type: 'direct' as const,
      source: { doc_id: 'paper-a', asset_id: 'asset-1' },
      scope: { dataset: 'BraTS' },
      locator: { printed_page_label: '7', table_id: 'T2' },
    },
  }],
  contextPack: {
    packedEvidenceIds: ['packet-1'],
    droppedEvidenceIds: ['packet-2'],
    tokenCount: null,
  },
  finalClaims: [{
    claimId: 'claim-1',
    statement: 'Dice is reported.',
    supportType: 'direct' as const,
    evidenceIds: ['packet-1'],
    premiseEvidenceIds: undefined,
    qualifiedReason: undefined,
  }],
  sufficiency: undefined,
  budget: undefined,
  repairs: undefined,
  conflicts: undefined,
  metrics: undefined,
};

function renderExplorer(graph?: React.ComponentProps<typeof V9EvidenceExplorer>['graph']) {
  return render(
    <ChakraProvider theme={theme}>
      <V9EvidenceExplorer data={evidence} graph={graph} />
    </ChakraProvider>
  );
}

describe('V9EvidenceExplorer', () => {
  it('renders evidence provenance with N/A for uninstrumented citation and token attribution', () => {
    renderExplorer({
      status: 'recorded',
      events: [{ route: 'traverse', routerReason: 'required locator', nodeCount: 0, edgeCount: null, pathCount: 0, graphToChunkSuccessRate: null }],
      evidenceItems: [{ source: 'paper-a', locator: 'p. 7' }],
    });

    expect(screen.getByText('Evidence packets')).toBeInTheDocument();
    expect(screen.getByText('paper-a')).toBeInTheDocument();
    expect(screen.getByText('dataset: BraTS')).toBeInTheDocument();
    expect(screen.getByText('p. 7 · T2')).toBeInTheDocument();
    expect(screen.getByText(/Per-slot tokens: N\/A \(not instrumented\)/)).toBeInTheDocument();
    expect(screen.getByText(/nodes 0/)).toBeInTheDocument();
    expect(screen.getByText(/edges N\/A/)).toBeInTheDocument();
    expect(screen.getByText('Visual evidence')).toBeInTheDocument();
    expect(screen.getByText(/asset-1 · paper-a/)).toBeInTheDocument();
  });

  it('reveals authorized plain-text excerpts and navigates a claim citation to its packet', () => {
    renderExplorer();

    expect(screen.queryByText('<script>quoted evidence remains plain text</script>')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Show excerpt for packet-1' }));
    expect(screen.getByText('<script>quoted evidence remains plain text</script>')).toBeInTheDocument();
    expect(screen.queryByRole('script')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Open packet packet-1 for claim claim-1' }));
    expect(screen.getByText('Selected packet: packet-1')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Copy claim claim-1' })).toBeInTheDocument();
  });

  it('does not claim traversal when graph instrumentation is absent', () => {
    renderExplorer({ status: 'not_instrumented', events: [], evidenceItems: [] });

    expect(screen.getByText('Not instrumented')).toBeInTheDocument();
    expect(screen.getByText(/mode alone is not evidence of traversal/)).toBeInTheDocument();
  });

  it('keeps packed and used packet state unavailable when the corresponding telemetry is absent', () => {
    render(
      <ChakraProvider theme={theme}>
        <V9EvidenceExplorer data={{ ...evidence, contextPack: undefined, finalClaims: undefined }} />
      </ChakraProvider>
    );

    const packetRow = screen.getAllByRole('row').find((row) => row.textContent?.includes('packet-1'));
    expect(packetRow).toBeDefined();
    expect(within(packetRow!).getAllByText('N/A')).toHaveLength(3);
    expect(packetRow).not.toHaveTextContent('no');
  });
});
