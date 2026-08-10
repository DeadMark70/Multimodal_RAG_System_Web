# Shared Evidence Navigation MVP

**Status:** Conversation design approved; awaiting written-spec review
**Date:** 2026-08-10
**Scope:** `Multimodal_RAG_System` frontend and `pdftopng` backend

## Objective

Make chat citations actionable and let users inspect the source evidence behind a
Graph node without losing their current Chat or Graph context.

The shared interaction is:

1. Click a Chat citation or Graph node.
2. Inspect source evidence in a right-side drawer.
3. Click **Open source** to enter an on-demand full-screen PDF viewer.
4. Close the viewer and return to the unchanged Chat or Graph state.

## MVP Principles

- Reuse one evidence drawer and one source viewer for Chat and Graph.
- Prefer verified source text over inferred or fuzzy matches.
- Guarantee page-level navigation when a page is available.
- Treat exact-region highlighting as best effort, never as fabricated precision.
- Keep the viewer in the current page as an overlay so origin state is naturally
  preserved.
- Reuse the existing authenticated PDF download API.

## Non-Goals

This MVP does not add:

- a generic cross-system evidence service;
- durable evidence IDs or viewer state across page refreshes;
- a dedicated source-viewer route or cross-tab state synchronization;
- fuzzy full-document text search;
- side-by-side comparison of multiple PDFs;
- PDF annotations or editing;
- global Error Boundary, session-recovery, or SSE-resume behavior;
- a complex confidence-ranking interface.

The global resilience work remains a separate sub-project.

## Current State

- Chat citations already include `doc_id`, `filename`, `page`, `snippet`, and
  `score`. `MessageBubble` accepts `onCitationClick`, but `Chat.tsx` does not
  currently provide it.
- `GraphDemo.tsx` receives Graph node clicks but only writes them to the console.
- `/graph/data` uses the node label as its visualization ID and does not expose a
  stable internal node key or source documents.
- The backend already persists edge-level `EvidenceAnchor` data containing
  document, chunk, page, quote, provenance, and optional bounding-box fields.

## User Experience

### Evidence drawer

The right-side drawer is the default evidence surface on both Chat and Graph.

Each verified evidence row shows:

- filename;
- page when available;
- source quote;
- a simple provenance label;
- an **Open source** action.

Graph nodes without verified anchors show a separate **Related source documents**
section. These rows must not be labelled as original text and do not display a
synthetic quote.

On narrow screens the drawer becomes full-screen. Keyboard focus is trapped while
open, Escape closes it, and focus returns to the citation or node control that
opened it.

### Source viewer

The source viewer is a full-screen overlay mounted by the current Chat or Graph
page. It lazy-loads the PDF rendering code only after **Open source** is selected.

The viewer:

- fetches the original PDF through the existing authenticated API;
- opens the requested page when available;
- displays the selected quote beside the PDF;
- highlights a region only when the backend returned a valid normalized bounding
  box;
- otherwise performs page-only navigation without guessing an exact location;
- provides a browser-PDF page fallback if the embedded viewer cannot render.

Closing the overlay restores the existing page because Chat and Graph remain
mounted. Graph zoom, selected node, and the evidence drawer remain unchanged.

## Frontend Design

### Minimal shared contract

```ts
type EvidenceProvenanceStatus = 'full' | 'partial' | 'source_only';

interface SourceEvidence {
  docId: string;
  filename: string | null;
  page: number | null;
  quote: string | null;
  bbox?: [number, number, number, number] | null;
  provenanceStatus: EvidenceProvenanceStatus;
}
```

`bbox`, when present, is normalized page space `[x1, y1, x2, y2]` with every
coordinate in the inclusive range `0..1`. The backend omits legacy bounding boxes
that it cannot safely normalize.

### Shared components

- `EvidenceDrawer`: renders verified evidence and source-only document rows.
- `SourceViewerOverlay`: owns authenticated PDF loading, page navigation, optional
  region highlighting, and browser-PDF fallback.
- `useEvidenceNavigation`: page-local state for the selected evidence, drawer, and
  viewer. It is mounted separately by Chat and Graph; no global provider is needed.
- `mapCitationToSourceEvidence`: adapts the existing Chat citation without changing
  the Chat response contract.

### Chat integration

`Chat.tsx` passes `mapCitationToSourceEvidence(citation)` to the shared navigation
hook from `MessageBubble.onCitationClick`. The Chat backend does not change for the
MVP.

### Graph integration

`GraphDemo.tsx` replaces the console-only click handler with:

1. open the drawer in a loading state;
2. request evidence by stable `node_key`;
3. render verified evidence and source-only documents;
4. keep the selected node visible while the request is active.

Changing nodes cancels or ignores the previous request so stale results cannot
replace the latest selection.

## Backend Design

### Visualization contract

Extend each `/graph/data` node with:

- `node_key`: the stable internal GraphStore node ID;
- `source_docs`: the existing node document IDs.

Keep the current visualization `id` and link endpoints unchanged to avoid a broad
graph-rendering migration.

### Node evidence endpoint

Add:

```http
GET /graph/nodes/{node_key}/evidence
```

The authenticated response contains:

```json
{
  "node_key": "node_method_abc123",
  "label": "Transformer",
  "evidence": [],
  "source_documents": []
}
```

The endpoint:

1. opens the current user's `GraphStore`;
2. validates that `node_key` exists in that store;
3. collects provenance anchors from incident edges;
4. removes exact duplicate anchors;
5. orders full provenance before partial provenance;
6. returns at most 20 evidence rows;
7. joins node `doc_ids` to user-owned document filenames for
   `source_documents`;
8. returns no quote for a source-only document.

No fuzzy retrieval or generated quote is used as a fallback.

## Failure and Security Rules

- A missing or unresolved anchor is never presented as original text.
- An invalid or unavailable bounding box falls back to page-only navigation.
- A missing page still permits quote inspection and opening the PDF at its start.
- Embedded PDF failure exposes retry and browser-PDF fallback actions.
- `401` keeps the selected evidence visible and reports that the session expired.
- `403` and `404` use the same safe user-facing message and do not reveal another
  user's document or node existence.
- PDF access remains authenticated; no local filesystem path or unauthenticated
  object URL is returned by the backend.
- Source quotes and bounding boxes are not placed in the URL or application logs.
- Blob URLs are revoked when the viewer closes or the owning page unmounts.
- A local viewer error boundary prevents PDF failures from replacing Chat or Graph.

## Testing

### Backend

1. A user can fetch evidence for a node in their own GraphStore.
2. Another user's node key returns the same safe not-found behavior as a missing
   node.
3. Incident-edge anchors are deduplicated, ordered, and capped.
4. A node with no anchors returns source documents without fabricated quotes.
5. `/graph/data` exposes `node_key` and `source_docs` without changing existing
   visualization IDs or links.

### Frontend

1. A Chat citation opens the shared drawer and viewer.
2. A Graph node loads its evidence and opens the same drawer and viewer.
3. The viewer opens the requested page and applies a valid normalized bounding
   box when present.
4. Missing bounding boxes and viewer errors use the documented fallbacks.
5. Closing the viewer preserves Chat or Graph state and returns keyboard focus to
   the originating control.

## Acceptance Criteria

- Chat source chips perform a visible action and can open the cited PDF page.
- Clicking a Graph node displays verified source quotes when anchors exist.
- Source-only Graph documents are clearly distinguished from verified original
  text.
- Chat and Graph use the same drawer, viewer, and minimal evidence contract.
- PDF rendering code is not loaded until the user opens a source.
- Closing the source viewer does not reset the current conversation or Graph view.
- Authorization and safe fallback behavior have explicit automated coverage.
