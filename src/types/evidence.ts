import type { Citation } from './rag';

export type EvidenceProvenanceStatus = 'full' | 'partial' | 'source_only';

export interface SourceEvidence {
  docId: string;
  filename: string | null;
  page: number | null;
  quote: string | null;
  bbox: [number, number, number, number] | null;
  provenanceStatus: EvidenceProvenanceStatus;
}

export interface SourceEvidencePayload {
  title: string;
  items: SourceEvidence[];
}

export function mapCitationToSourceEvidence(citation: Citation): SourceEvidence {
  return {
    docId: citation.doc_id,
    filename: citation.filename ?? null,
    page: citation.page ?? null,
    quote: null,
    bbox: null,
    provenanceStatus: 'source_only',
  };
}
