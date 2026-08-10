import { describe, expect, it } from 'vitest';

import { mapCitationToSourceEvidence } from './evidence';

describe('mapCitationToSourceEvidence', () => {
  it('maps an existing chat citation without changing its backend contract', () => {
    expect(mapCitationToSourceEvidence({
      doc_id: 'doc-1', filename: 'paper.pdf', page: 3,
      snippet: 'Quoted text', score: 0.9,
    })).toEqual({
      docId: 'doc-1', filename: 'paper.pdf', page: 3,
      quote: 'Quoted text', bbox: null, provenanceStatus: 'full',
    });
  });
});
