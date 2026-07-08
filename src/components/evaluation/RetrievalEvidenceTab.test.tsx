import { ChakraProvider } from '@chakra-ui/react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import theme from '../../theme';
import EvidenceCoveragePanel from './EvidenceCoveragePanel';
import RetrievalEvidenceTab from './RetrievalEvidenceTab';
import RetrievedChunksTable from './RetrievedChunksTable';

const chunks = [
  {
    rank: 1,
    docId: 'paper-a.pdf',
    page: '5',
    modality: 'table',
    denseScore: 0.92,
    bm25Score: 18.1,
    rerankScore: 0.98,
    inContext: true,
    usedInAnswer: true,
    goldMatch: true,
    excerpt: 'Top ranked table chunk',
  },
  {
    rank: 2,
    docId: 'paper-b.pdf',
    page: '3',
    modality: 'text',
    denseScore: 0.73,
    bm25Score: 11.4,
    rerankScore: 0.71,
    inContext: false,
    usedInAnswer: false,
    goldMatch: false,
    excerpt: 'Retrieved but not packed',
  },
];

const coverage = [
  {
    atomicFactId: 'Q09-F1',
    factText: 'Reported value is 0.9079',
    retrieved: true,
    packed: true,
    mentioned: true,
    cited: true,
    status: 'retrieved-packed-mentioned-cited',
  },
  {
    atomicFactId: 'Q09-F2',
    factText: 'Secondary evidence was retrieved but dropped',
    retrieved: true,
    packed: false,
    mentioned: false,
    cited: false,
    status: 'retrieved-not-packed',
  },
  {
    atomicFactId: 'Q09-F3',
    factText: 'Missing evidence fact',
    retrieved: false,
    packed: false,
    mentioned: false,
    cited: false,
    status: 'missing',
  },
];

function renderWithTheme(node: React.ReactNode) {
  return render(<ChakraProvider theme={theme}>{node}</ChakraProvider>);
}

describe('RetrievalEvidenceTab', () => {
  it('renders retrieved chunks and evidence coverage states', () => {
    renderWithTheme(
      <RetrievalEvidenceTab
        retrievals={[
          { queryLabel: 'Primary retrieval', queryText: 'Find the supporting table for Q09' },
        ]}
        chunks={chunks}
        coverage={coverage}
      />
    );

    expect(screen.getByText('Find the supporting table for Q09')).toBeInTheDocument();
    expect(screen.getByText('retrieved-packed-mentioned-cited')).toBeInTheDocument();
    expect(screen.getByText('retrieved-not-packed')).toBeInTheDocument();
    expect(screen.getByText('missing')).toBeInTheDocument();
  });
});

describe('RetrievedChunksTable', () => {
  it('renders dense retrieval chunk columns', () => {
    renderWithTheme(<RetrievedChunksTable chunks={chunks} />);

    expect(screen.getByText('Rank')).toBeInTheDocument();
    expect(screen.getByText('Doc')).toBeInTheDocument();
    expect(screen.getByText('BM25')).toBeInTheDocument();
    expect(screen.getByText('Gold Match')).toBeInTheDocument();
    expect(screen.getByText('paper-a.pdf')).toBeInTheDocument();
  });
});

describe('EvidenceCoveragePanel', () => {
  it('renders evidence funnel states', () => {
    renderWithTheme(<EvidenceCoveragePanel coverage={coverage} />);

    expect(screen.getAllByText('Retrieved').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Packed').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Mentioned').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Cited').length).toBeGreaterThan(0);
    expect(screen.getByText('Q09-F3')).toBeInTheDocument();
  });
});
