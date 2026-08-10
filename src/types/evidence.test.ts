import { describe, expect, it } from 'vitest';

import { mapCitationToSourceEvidence } from './evidence';

describe('mapCitationToSourceEvidence', () => {
  it('does not present the default generated-answer snippet as source text', () => {
    expect(mapCitationToSourceEvidence({
      doc_id: 'doc-1', filename: null, page: null,
      snippet: 'This is generated answer text, not a source excerpt.', score: 0,
    })).toEqual({
      docId: 'doc-1', filename: null, page: null,
      quote: null, bbox: null, provenanceStatus: 'source_only',
    });
  });

  it('retains a supplied page for navigation without claiming a verified quote', () => {
    expect(mapCitationToSourceEvidence({
      doc_id: 'doc-2', filename: 'paper.pdf', page: 7,
      snippet: 'Unknown-provenance text', score: 0.8,
    })).toEqual({
      docId: 'doc-2', filename: 'paper.pdf', page: 7,
      quote: null, bbox: null, provenanceStatus: 'source_only',
    });
  });
});
