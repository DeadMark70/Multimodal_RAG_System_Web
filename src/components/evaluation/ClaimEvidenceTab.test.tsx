import { ChakraProvider } from '@chakra-ui/react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import theme from '../../theme';
import ClaimEvidenceTab from './ClaimEvidenceTab';
import ClaimEvidenceTable from './ClaimEvidenceTable';

const claims = [
  {
    claim: 'Primary metric improved to 0.91',
    type: 'numeric',
    status: 'supported',
    evidence: ['paper-a.pdf p.5'],
    repairAction: 'none',
    postRepairStatus: 'supported',
  },
  {
    claim: 'The ablation kept graph search enabled',
    type: 'configuration',
    status: 'partially supported',
    evidence: ['run snapshot'],
    repairAction: 'add config citation',
    postRepairStatus: 'supported',
  },
  {
    claim: 'The router always picked agentic',
    type: 'behavior',
    status: 'unsupported',
    evidence: [],
    repairAction: 're-run routing analysis',
    postRepairStatus: 'unsupported',
  },
  {
    claim: 'The citation points to page 7',
    type: 'citation',
    status: 'contradicted',
    evidence: ['paper-a.pdf p.5'],
    repairAction: 'fix citation',
    postRepairStatus: 'supported',
  },
];

const unsupportedReasons = [
  'retrieval miss',
  'context dropped',
  'generation hallucination',
  'citation mismatch',
  'gold evidence missing',
];

function renderWithTheme(node: React.ReactNode) {
  return render(<ChakraProvider theme={theme}>{node}</ChakraProvider>);
}

describe('ClaimEvidenceTab', () => {
  it('renders claims with support statuses and unsupported reasons', () => {
    renderWithTheme(<ClaimEvidenceTab claims={claims} unsupportedReasons={unsupportedReasons} />);

    expect(screen.getAllByText('supported').length).toBeGreaterThan(0);
    expect(screen.getAllByText('partially supported').length).toBeGreaterThan(0);
    expect(screen.getAllByText('unsupported').length).toBeGreaterThan(0);
    expect(screen.getAllByText('contradicted').length).toBeGreaterThan(0);
    expect(screen.getByText('retrieval miss')).toBeInTheDocument();
    expect(screen.getByText('gold evidence missing')).toBeInTheDocument();
  });

  it('shows v9 claim to atomic-slot evidence alignment without exposing prompts', () => {
    renderWithTheme(<ClaimEvidenceTab
      claims={[]}
      agenticV9Evidence={{
        runId: 'run-v2', schemaVersion: '2', queryContract: {
          route: 'single_lookup', intent: 'verify one fact', required_slots: [{ slot_id: 'S1', description: 'score' }],
        }, slotResolutions: [{ slot_id: 'S1', resolution_stage: 'final', resolution: { slot_id: 'S1', status: 'supported', evidence_ids: ['ev-1'] } }],
        evidencePackets: [], contextPack: undefined, sufficiency: null, budget: undefined, repairs: [{ repair_round_index: 1, stop_reason: 'evidence_complete' }], conflicts: undefined,
        finalClaims: [{ claimId: 'claim-1', statement: 'The score is supported.', supportType: 'direct', evidenceIds: ['ev-1'], premiseEvidenceIds: undefined, qualifiedReason: undefined }], metrics: undefined,
        promptCapture: { hashAvailability: 'captured', previewAvailability: 'captured', fullPromptAvailability: 'not_captured_at_execution' },
      }}
    />);

    expect(screen.getByText('Atomic Slot Alignment')).toBeInTheDocument();
    expect(screen.getByText('S1')).toBeInTheDocument();
    expect(screen.getByText(/evidence_complete/)).toBeInTheDocument();
    expect(screen.queryByText('full_prompt')).not.toBeInTheDocument();
  });

  it('uses the persisted claim slot ID instead of inferring a slot from shared evidence', () => {
    renderWithTheme(<ClaimEvidenceTab
      claims={[]}
      agenticV9Evidence={{
        runId: 'run-shared', schemaVersion: '2', queryContract: {
          route: 'multi_document_exact', intent: 'resolve two facts', required_slots: [
            { slot_id: 'S1', description: 'first fact' },
            { slot_id: 'S2', description: 'second fact' },
          ],
        },
        slotResolutions: [
          { slot_id: 'S1', resolution_stage: 'final', resolution: { slot_id: 'S1', status: 'supported', evidence_ids: ['ev-shared'] } },
          { slot_id: 'S2', resolution_stage: 'final', resolution: { slot_id: 'S2', status: 'supported', evidence_ids: ['ev-shared'] } },
        ],
        evidencePackets: [], contextPack: undefined, sufficiency: null, budget: undefined, repairs: undefined, conflicts: undefined,
        finalClaims: [
          { claimId: 'claim-for-s1', statement: 'Only the first fact.', supportType: 'direct', slotId: 'S1', evidenceIds: ['ev-shared'], premiseEvidenceIds: undefined, qualifiedReason: undefined },
          { claimId: 'claim-without-slot', statement: 'Historical claim.', supportType: 'direct', evidenceIds: ['ev-shared'], premiseEvidenceIds: undefined, qualifiedReason: undefined },
        ], metrics: undefined,
      } as never}
    />);

    expect(screen.getByTestId('slot-claims-S1')).toHaveTextContent('claim-for-s1');
    expect(screen.getByTestId('slot-claims-S2')).toHaveTextContent('N/A');
    expect(screen.queryByText('claim-without-slot')).not.toBeInTheDocument();
  });

  it('renders atomic slot requirements, direct evidence provenance, and every repair round N/A-safely', () => {
    renderWithTheme(<ClaimEvidenceTab
      claims={[]}
      agenticV9Evidence={{
        runId: 'run-details', schemaVersion: '2', queryContract: {
          route: 'graph_relational', intent: 'resolve visual relation', required_slots: [{
            slot_id: 'S1', description: 'figure fact', expected_answer_type: 'numeric',
            source_name_hints: ['Paper A'], authorized_source_doc_ids: ['doc-a'], locator_hints: ['Table 3'],
            depends_on_slot_ids: ['S0'], visual_policy: 'required',
          }],
        },
        slotResolutions: [{ slot_id: 'S1', resolution_stage: 'repair', resolution: { slot_id: 'S1', status: 'supported', evidence_ids: ['ev-visual'], reason: 'verified after repair' } }],
        evidencePackets: [{ evidence_id: 'ev-visual', packet: {
          schema_version: '2', evidence_id: 'ev-visual', task_id: 'task-2', round_id: 'round-2', query_id: 'query-2', query: 'find Figure 2', slot_ids: ['S1'], statement: 'value', support_type: 'direct',
          source: { doc_id: 'doc-a', document_name: 'Paper A', asset_id: 'asset-1' }, scope: {}, locator: { table_id: 'Table 3' },
        } }],
        contextPack: undefined, sufficiency: null, budget: undefined,
        repairs: [
          { repair_round_index: 1, tasks: [{ task_id: 'task-1', round_id: 'round-1', query_id: 'query-1', query: 'find initial value', target_slot_ids: ['S1'], source_scope: {} }], stop_reason: 'continue_missing_slot' },
          { repair_round_index: 2, tasks: [{ task_id: 'task-2', round_id: 'round-2', query_id: 'query-2', query: 'find Figure 2', target_slot_ids: ['S1'], source_scope: {} }], stop_reason: 'evidence_complete' },
        ], conflicts: undefined, finalClaims: undefined, metrics: undefined,
      } as never}
    />);

    expect(screen.getByText('Expected answer type')).toBeInTheDocument();
    expect(screen.getByTestId('slot-source-S1')).toHaveTextContent('Paper A · doc-a');
    expect(screen.getByTestId('slot-locator-S1')).toHaveTextContent('Table 3');
    expect(screen.getByTestId('slot-dependencies-S1')).toHaveTextContent('S0');
    expect(screen.getByTestId('slot-visual-S1')).toHaveTextContent('asset-1');
    expect(screen.getByText('Repair round 1')).toBeInTheDocument();
    expect(screen.getByText('Repair round 2')).toBeInTheDocument();
    expect(screen.getByText(/task-2.*query-2.*S1.*evidence_complete/)).toBeInTheDocument();
  });

  it('keeps unavailable atomic detail as N/A for legacy v1 records', () => {
    renderWithTheme(<ClaimEvidenceTab
      claims={[]}
      agenticV9Evidence={{
        runId: 'run-v1', schemaVersion: '1', queryContract: { route: 'single_lookup', intent: 'legacy', required_slots: [{ slot_id: 'legacy', description: 'legacy slot' }] },
        slotResolutions: undefined, evidencePackets: undefined, contextPack: undefined, sufficiency: undefined, budget: undefined,
        repairs: undefined, conflicts: undefined, finalClaims: undefined, metrics: undefined,
      } as never}
    />);

    expect(screen.getByTestId('slot-source-legacy')).toHaveTextContent('N/A');
    expect(screen.getByTestId('slot-locator-legacy')).toHaveTextContent('N/A');
    expect(screen.getByTestId('slot-dependencies-legacy')).toHaveTextContent('N/A');
    expect(screen.getByTestId('slot-visual-legacy')).toHaveTextContent('N/A');
    expect(screen.getByText('Repair rounds: N/A')).toBeInTheDocument();
  });
});

describe('ClaimEvidenceTable', () => {
  it('renders claim, evidence, repair, and post-repair status columns', () => {
    renderWithTheme(<ClaimEvidenceTable claims={claims} />);

    expect(screen.getByText('Claim')).toBeInTheDocument();
    expect(screen.getByText('Type')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
    expect(screen.getByText('Evidence')).toBeInTheDocument();
    expect(screen.getByText('Repair Action')).toBeInTheDocument();
    expect(screen.getByText('Post Repair Status')).toBeInTheDocument();
  });

  it('renders typed evidence references without provider payload fields', () => {
    renderWithTheme(<ClaimEvidenceTable claims={[{
      claim: 'Typed claim evidence',
      type: 'numeric',
      status: 'supported',
      evidence: ['chunk-1'],
      repairAction: 'retry_retrieval',
      postRepairStatus: 'supported',
      extractionStatus: 'recorded',
    }]} />);

    expect(screen.getByText('chunk-1')).toBeInTheDocument();
    expect(screen.getByText('retry_retrieval')).toBeInTheDocument();
    expect(screen.queryByText('must-not-render')).not.toBeInTheDocument();
  });
});
