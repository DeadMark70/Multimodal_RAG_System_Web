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
        promptCapture: { hash: 'captured', preview: 'captured', fullPrompt: 'not_captured_at_execution' },
      }}
    />);

    expect(screen.getByText('Atomic Slot Alignment')).toBeInTheDocument();
    expect(screen.getByText('S1')).toBeInTheDocument();
    expect(screen.getByText(/evidence_complete/)).toBeInTheDocument();
    expect(screen.queryByText('full_prompt')).not.toBeInTheDocument();
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
});
