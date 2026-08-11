import type { Citation } from './rag';

export type EvidenceProvenanceStatus = 'full' | 'partial' | 'source_only';

export interface SourceEvidence {
  docId: string;
  filename: string | null;
  page: number | null;
  quote: string | null;
  score?: number | null;
  bbox: [number, number, number, number] | null;
  provenanceStatus: EvidenceProvenanceStatus;
}

export interface SourceEvidencePayload {
  title: string;
  items: SourceEvidence[];
}

function isNormalizedBbox(value: unknown): value is [number, number, number, number] {
  return Array.isArray(value)
    && value.length === 4
    && value.every((coordinate) => (
      typeof coordinate === 'number'
      && Number.isFinite(coordinate)
      && coordinate >= 0
      && coordinate <= 1
    ))
    && value[0] < value[2]
    && value[1] < value[3];
}

export function mapCitationToSourceEvidence(citation: Citation): SourceEvidence {
  const quote = typeof citation.snippet === 'string' && citation.snippet.trim()
    ? citation.snippet.trim()
    : null;
  const bbox = isNormalizedBbox(citation.bbox) ? citation.bbox : null;
  const score = typeof citation.score === 'number'
    && Number.isFinite(citation.score)
    && citation.score >= 0
    && citation.score <= 1
    ? citation.score
    : null;
  const hasPositivePage = typeof citation.page === 'number' && citation.page > 0;

  return {
    docId: citation.doc_id,
    filename: citation.filename ?? null,
    page: citation.page ?? null,
    quote,
    score,
    bbox,
    provenanceStatus: quote
      ? hasPositivePage && bbox ? 'full' : 'partial'
      : 'source_only',
  };
}
