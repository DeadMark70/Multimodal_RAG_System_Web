import { describe, expect, it } from 'vitest';

import { mapCitationToSourceEvidence } from './evidence';

describe('mapCitationToSourceEvidence', () => {
  it('maps measured chat evidence to full provenance', () => {
    expect(mapCitationToSourceEvidence({
      doc_id: 'doc-1', filename: 'paper.pdf', page: 7,
      snippet: 'Quoted source text', score: 0.82,
      bbox: [0.1, 0.2, 0.8, 0.4],
    })).toEqual({
      docId: 'doc-1', filename: 'paper.pdf', page: 7,
      quote: 'Quoted source text', score: 0.82,
      bbox: [0.1, 0.2, 0.8, 0.4], provenanceStatus: 'full',
    });
  });

  it('maps a quote without an exact region to partial provenance', () => {
    expect(mapCitationToSourceEvidence({
      doc_id: 'doc-2', filename: 'paper.pdf', page: 4,
      snippet: '  Page-level quote  ', score: 0.6, bbox: null,
    })).toEqual({
      docId: 'doc-2', filename: 'paper.pdf', page: 4,
      quote: 'Page-level quote', score: 0.6,
      bbox: null, provenanceStatus: 'partial',
    });
  });

  it('keeps source-only citations honest', () => {
    expect(mapCitationToSourceEvidence({
      doc_id: 'doc-3', filename: 'paper.pdf', page: null,
      snippet: null, score: null, bbox: null,
    })).toMatchObject({
      quote: null, score: null, bbox: null, provenanceStatus: 'source_only',
    });
  });

  it('ignores an invalid runtime bbox', () => {
    expect(mapCitationToSourceEvidence({
      doc_id: 'doc-4', filename: 'paper.pdf', page: 2,
      snippet: 'Quote with malformed coordinates', score: 0.5,
      bbox: [0.1, 0.2, 1.2, 0.4],
    })).toMatchObject({
      quote: 'Quote with malformed coordinates',
      bbox: null,
      provenanceStatus: 'partial',
    });
  });
});
