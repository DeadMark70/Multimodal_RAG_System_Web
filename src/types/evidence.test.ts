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

  it.each([
    ['reversed x-axis', [0.8, 0.2, 0.1, 0.4]],
    ['reversed y-axis', [0.1, 0.7, 0.8, 0.2]],
    ['zero width', [0.4, 0.2, 0.4, 0.7]],
    ['zero height', [0.1, 0.5, 0.8, 0.5]],
  ] as const)('rejects a %s runtime bbox', (_label, bbox) => {
    expect(mapCitationToSourceEvidence({
      doc_id: 'doc-5', filename: 'paper.pdf', page: 2,
      snippet: 'Quote with invalid geometry', score: 0.5,
      bbox: [...bbox],
    })).toMatchObject({
      quote: 'Quote with invalid geometry',
      bbox: null,
      provenanceStatus: 'partial',
    });
  });
});
