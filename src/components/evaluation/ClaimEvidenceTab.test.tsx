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
