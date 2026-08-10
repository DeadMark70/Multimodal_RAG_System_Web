# Shared Evidence Navigation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Chat citations and Graph nodes open one shared evidence drawer and an on-demand authenticated PDF viewer with page navigation and safe optional region highlighting.

**Architecture:** The backend adds one user-scoped Graph node-evidence endpoint and exposes the existing stable GraphStore node ID in `/graph/data`. The frontend normalizes existing Chat citations and Graph evidence responses into one minimal `SourceEvidence` contract, then reuses page-local navigation state, a Chakra drawer, and a lazily loaded PDF.js-backed full-screen overlay.

**Tech Stack:** FastAPI, Pydantic 2, GraphStore/NetworkX, pytest, React 18, TypeScript 5, Chakra UI 2, TanStack Query 5, Axios, `react-pdf`/PDF.js, Vitest, Testing Library.

## Global Constraints

- Reuse one evidence drawer and one source viewer for Chat and Graph.
- Keep Chat's backend citation response unchanged in this MVP.
- Add only `node_key`, `source_docs`, and one `/graph/nodes/{node_key}/evidence` endpoint to the Graph API.
- Use the existing authenticated `GET /pdfmd/file/{doc_id}` download path; never expose a backend filesystem path or unauthenticated PDF URL.
- Keep the source viewer in the current page as a full-screen overlay so Chat and Graph stay mounted.
- Guarantee page-level navigation when a page exists; apply a bounding box only when the backend returns normalized `[x1, y1, x2, y2]` coordinates in `0..1`.
- Never present a source-only document or unresolved anchor as original quoted text.
- Do not add durable evidence IDs, a generic evidence service, viewer routing, cross-tab state, fuzzy document search, PDF annotation, or multi-PDF comparison.
- Keep global Error Boundary, session recovery, and SSE resume work outside this plan.

## File Map

### Backend repository: `D:/flutterserver/pdftopng`

- Create `graph_rag/node_evidence.py`: assemble a user-scoped node evidence response from incident-edge anchors and owned document metadata.
- Create `tests/test_graph_node_evidence_api.py`: unit and API coverage for node evidence, source-only fallback, authorization isolation, and visualization metadata.
- Modify `graph_rag/schemas.py`: add node evidence response models.
- Modify `graph_rag/router.py`: extend `VisNode` and register the new endpoint.
- Modify `docs/BACKEND.md`: document the endpoint and response boundary.
- Regenerate `openapi.json`, `contracts/openapi-contract.json`, and `docs/generated/api-surface.md` with the existing sync script.

### Frontend repository: `D:/flutterserver/Multimodal_RAG_System`

- Create `src/types/evidence.ts`: minimal shared evidence types and Chat citation mapper.
- Create `src/hooks/useEvidenceNavigation.ts`: page-local drawer/viewer state only.
- Create `src/components/evidence/EvidenceDrawer.tsx`: shared source list and source-only presentation.
- Create `src/components/evidence/SourceViewerOverlay.tsx`: lazy PDF rendering, page jump, optional normalized-box overlay, and browser fallback.
- Create focused tests beside each new source file.
- Modify `src/types/graph.ts`: add `node_key`, `source_docs`, and raw node-evidence API types.
- Modify `src/services/graphApi.ts` and its test: fetch and normalize Graph node evidence.
- Modify `src/hooks/useGraphData.ts`: expose one mutation hook for node evidence.
- Modify `src/pages/Chat.tsx` and `src/pages/Chat.test.tsx`: connect `MessageBubble.onCitationClick` to shared evidence navigation.
- Modify `src/components/graph/KnowledgeGraph.tsx` and its test: preserve `node_key` in 3D node projection and click callbacks.
- Modify `src/pages/GraphDemo.tsx` and its test: load evidence for the latest clicked node and reuse the shared UI.
- Modify `package.json` and `package-lock.json`: add `react-pdf`.
- Modify `docs/product-specs/chat-and-presets.md` and `docs/design-docs/upload-and-graph-workspace.md`: document the user-visible behavior.
- Update `src/test/fixtures/agenticV9ApiContract.ts` using `npm run contract:pin` after the backend commit is final.

---

### Task 1: Add the user-scoped Graph node evidence API

**Files:**
- Create: `D:/flutterserver/pdftopng/graph_rag/node_evidence.py`
- Create: `D:/flutterserver/pdftopng/tests/test_graph_node_evidence_api.py`
- Modify: `D:/flutterserver/pdftopng/graph_rag/schemas.py:664`
- Modify: `D:/flutterserver/pdftopng/graph_rag/router.py:35`
- Modify: `D:/flutterserver/pdftopng/graph_rag/router.py:100`
- Modify: `D:/flutterserver/pdftopng/graph_rag/router.py:363`

**Interfaces:**
- Consumes: `GraphStore.get_node(node_key)`, `GraphStore.get_edges_for_node(node_key)`, `GraphStore.edge_id(...)`, `GraphStore.get_edge_provenance(...)`, and `pdfserviceMD.repository.get_document(...)`.
- Produces: `build_node_evidence_response(*, user_id: str, node_key: str) -> GraphNodeEvidenceResponse` and authenticated `GET /graph/nodes/{node_key}/evidence`.
- Produces for frontend: `/graph/data.nodes[*].node_key`, `/graph/data.nodes[*].source_docs`, and the exact response models below.

- [ ] **Step 1: Write failing backend tests for evidence aggregation and source-only fallback**

Create `tests/test_graph_node_evidence_api.py` with a temporary GraphStore containing one node, one incident edge, duplicate full anchors, one partial anchor, and one document-only source:

```python
from unittest.mock import AsyncMock, patch

import pytest

from core.errors import AppError, ErrorCode
from graph_rag.node_evidence import build_node_evidence_response
from graph_rag.schemas import EntityType, EvidenceAnchor
from graph_rag.store import GraphStore


def _store(tmp_path):
    store = GraphStore("user-1", storage_dir=tmp_path)
    source = store.add_node_from_extraction("Transformer", EntityType.METHOD, "doc-1")
    store.graph.nodes[source]["doc_ids"] = ["doc-1", "doc-2"]
    target = store.add_node_from_extraction("Attention", EntityType.CONCEPT, "doc-1")
    store.add_edge_from_extraction(source, target, "uses", "doc-1")
    edge_id = store.edge_id(source, target, "uses")
    full = EvidenceAnchor(
        doc_id="doc-1", chunk_id="chunk-1", page=3,
        quote="Transformer uses self-attention.", quote_hash="quote-1",
        chunk_hash="chunk-1-hash", confidence=0.95,
    )
    partial = EvidenceAnchor(
        doc_id="doc-1", page=4, quote="A second source passage.", confidence=0.7,
    )
    store.record_edge_provenance(edge_id, [full, full, partial])
    return store, source


@pytest.mark.asyncio
async def test_build_node_evidence_deduplicates_and_keeps_source_only_documents(tmp_path):
    store, node_key = _store(tmp_path)

    async def fake_get_document(*, doc_id, user_id, columns="*"):
        assert user_id == "user-1"
        return {"id": doc_id, "file_name": f"{doc_id}.pdf"}

    with (
        patch("graph_rag.node_evidence.GraphStore", return_value=store),
        patch("graph_rag.node_evidence.get_document", side_effect=fake_get_document),
    ):
        response = await build_node_evidence_response(user_id="user-1", node_key=node_key)

    assert [item.provenance_status for item in response.evidence] == ["full", "partial"]
    assert [item.page for item in response.evidence] == [3, 4]
    assert [item.doc_id for item in response.source_documents] == ["doc-1", "doc-2"]
    assert response.source_documents[1].filename == "doc-2.pdf"


@pytest.mark.asyncio
async def test_build_node_evidence_uses_safe_not_found_for_missing_node(tmp_path):
    store = GraphStore("user-1", storage_dir=tmp_path)
    with patch("graph_rag.node_evidence.GraphStore", return_value=store):
        with pytest.raises(AppError) as exc_info:
            await build_node_evidence_response(user_id="user-1", node_key="node-other-user")

    assert exc_info.value.code is ErrorCode.NOT_FOUND
    assert exc_info.value.status_code == 404


@pytest.mark.asyncio
async def test_build_node_evidence_caps_rows_and_drops_mismatched_quotes(tmp_path):
    store, node_key = _store(tmp_path)
    edge = store.get_edges_for_node(node_key)[0]
    edge_id = store.edge_id(edge.source_id, edge.target_id, edge.relation)
    anchors = [
        EvidenceAnchor(
            doc_id="doc-1", chunk_id=f"chunk-{index}", page=index + 1,
            quote=f"Verified quote {index}", quote_hash=f"quote-{index}",
            chunk_hash=f"chunk-hash-{index}", confidence=0.9,
            verification_status="quote_match",
        )
        for index in range(25)
    ]
    anchors.append(EvidenceAnchor(
        doc_id="doc-1", chunk_id="bad", quote="Mismatched quote",
        confidence=0.9, verification_status="quote_mismatch",
    ))
    store.record_edge_provenance(edge_id, anchors)

    with (
        patch("graph_rag.node_evidence.GraphStore", return_value=store),
        patch("graph_rag.node_evidence.get_document", new=AsyncMock(
            return_value={"id": "doc-1", "file_name": "doc-1.pdf"}
        )),
    ):
        response = await build_node_evidence_response(user_id="user-1", node_key=node_key)

    assert len(response.evidence) == 20
    assert all(item.quote != "Mismatched quote" for item in response.evidence)
```

- [ ] **Step 2: Run the focused backend tests and verify the missing module failure**

Run from `D:/flutterserver/pdftopng`:

```powershell
$env:TEST_MODE="true"
$env:USE_FAKE_PROVIDERS="true"
$env:CI_BLOCK_EXTERNAL_NETWORK="true"
.\.venv\Scripts\python.exe -m pytest tests/test_graph_node_evidence_api.py -q
```

Expected: collection fails because `graph_rag.node_evidence` and the response models do not exist.

- [ ] **Step 3: Add exact Pydantic response models**

Append these models near the existing evidence schemas in `graph_rag/schemas.py`:

```python
class GraphNodeSourceEvidence(BaseModel):
    doc_id: str
    filename: Optional[str] = None
    page: Optional[int] = None
    quote: str
    bbox: Optional[tuple[float, float, float, float]] = None
    provenance_status: Literal["full", "partial"]


class GraphNodeSourceDocument(BaseModel):
    doc_id: str
    filename: Optional[str] = None


class GraphNodeEvidenceResponse(BaseModel):
    node_key: str
    label: str
    evidence: List[GraphNodeSourceEvidence] = Field(default_factory=list)
    source_documents: List[GraphNodeSourceDocument] = Field(default_factory=list)
```

- [ ] **Step 4: Implement the bounded evidence assembler**

Create `graph_rag/node_evidence.py` with the following behavior and signatures:

```python
from __future__ import annotations

from core.errors import AppError, ErrorCode
from graph_rag.schemas import (
    EvidenceAnchor,
    GraphNodeEvidenceResponse,
    GraphNodeSourceDocument,
    GraphNodeSourceEvidence,
)
from graph_rag.store import GraphStore
from pdfserviceMD.repository import get_document

_MAX_EVIDENCE = 20


def _safe_bbox(anchor: EvidenceAnchor):
    if anchor.bbox is None or len(anchor.bbox) != 4:
        return None
    x1, y1, x2, y2 = (float(value) for value in anchor.bbox)
    if not all(0.0 <= value <= 1.0 for value in (x1, y1, x2, y2)):
        return None
    if x2 <= x1 or y2 <= y1:
        return None
    return (x1, y1, x2, y2)


def _anchor_key(anchor: EvidenceAnchor):
    return (
        anchor.doc_id,
        anchor.chunk_id or "",
        anchor.page,
        anchor.quote_hash or anchor.quote or "",
    )


async def build_node_evidence_response(
    *, user_id: str, node_key: str
) -> GraphNodeEvidenceResponse:
    store = GraphStore(user_id)
    node = store.get_node(node_key)
    if node is None:
        raise AppError(
            code=ErrorCode.NOT_FOUND,
            message="Graph node not found",
            status_code=404,
        )

    document_rows = {}
    for doc_id in sorted(set(node.doc_ids)):
        row = await get_document(
            doc_id=doc_id, user_id=user_id, columns="id,file_name"
        )
        if row is not None:
            document_rows[doc_id] = row

    anchors = []
    for edge in store.get_edges_for_node(node_key):
        edge_id = store.edge_id(edge.source_id, edge.target_id, edge.relation)
        anchors.extend(store.get_edge_provenance(edge_id))

    unique = {}
    for anchor in anchors:
        if anchor.quote and anchor.verification_status in {"quote_match", "not_checked"}:
            unique.setdefault(_anchor_key(anchor), anchor)

    ordered = sorted(
        unique.values(),
        key=lambda anchor: (
            0 if anchor.provenance_status == "full" else 1,
            anchor.doc_id,
            anchor.page if anchor.page is not None else 10**9,
        ),
    )[:_MAX_EVIDENCE]

    return GraphNodeEvidenceResponse(
        node_key=node_key,
        label=node.label,
        evidence=[
            GraphNodeSourceEvidence(
                doc_id=anchor.doc_id,
                filename=(document_rows.get(anchor.doc_id) or {}).get("file_name"),
                page=anchor.page,
                quote=anchor.quote,
                bbox=_safe_bbox(anchor),
                provenance_status=anchor.provenance_status,
            )
            for anchor in ordered
        ],
        source_documents=[
            GraphNodeSourceDocument(
                doc_id=doc_id,
                filename=(document_rows.get(doc_id) or {}).get("file_name"),
            )
            for doc_id in sorted(document_rows)
        ],
    )
```

- [ ] **Step 5: Extend visualization nodes and register the endpoint**

Update `VisNode` and its projection in `graph_rag/router.py`:

```python
class VisNode(BaseModel):
    id: str
    node_key: str
    group: int
    val: int
    desc: str
    source_docs: List[str] = Field(default_factory=list)
```

```python
VisNode(
    id=node.label,
    node_key=node.id,
    group=hash(node.entity_type.value) % 5,
    val=len(node.doc_ids) * 2,
    desc=node.description or node.entity_type.value,
    source_docs=node.doc_ids,
)
```

Import `GraphNodeEvidenceResponse` and `build_node_evidence_response`, then add:

```python
@router.get(
    "/nodes/{node_key}/evidence",
    response_model=GraphNodeEvidenceResponse,
    summary="取得圖譜節點原文證據",
    description="回傳目前使用者節點的來源引文與相關來源文件。",
)
async def get_graph_node_evidence(
    node_key: str,
    user_id: str = Depends(get_current_user_id),
) -> GraphNodeEvidenceResponse:
    return await build_node_evidence_response(user_id=user_id, node_key=node_key)
```

- [ ] **Step 6: Add API and visualization assertions, then run focused tests**

In `tests/test_graph_node_evidence_api.py`, add a TestClient case that overrides `get_current_user_id`, patches `graph_rag.node_evidence.GraphStore`, calls the encoded node path, and asserts `200`, `node_key`, `evidence[0].page`, and `source_documents`. Add a second test for `/graph/data` asserting the existing node `id` remains the label while `node_key` is the internal ID.

Run:

```powershell
.\.venv\Scripts\python.exe -m pytest tests/test_graph_node_evidence_api.py tests/test_graph_store_provenance_sidecars.py -q
.\.venv\Scripts\python.exe -m ruff check graph_rag/node_evidence.py graph_rag/router.py graph_rag/schemas.py tests/test_graph_node_evidence_api.py --select E9,F63,F7,F82,F401,F841
```

Expected: all focused tests pass and Ruff reports `All checks passed!`.

- [ ] **Step 7: Commit the backend behavior**

```powershell
git add graph_rag/node_evidence.py graph_rag/schemas.py graph_rag/router.py tests/test_graph_node_evidence_api.py
git commit -m "feat(graph): expose node source evidence"
```

---

### Task 2: Add the minimal frontend evidence contract and Graph client

**Files:**
- Create: `src/types/evidence.ts`
- Create: `src/types/evidence.test.ts`
- Modify: `src/types/graph.ts:18`
- Modify: `src/services/graphApi.ts:40`
- Modify: `src/services/graphApi.test.ts`
- Modify: `src/hooks/useGraphData.ts:13`

**Interfaces:**
- Consumes: backend `GraphNodeEvidenceResponse` from Task 1 and existing `Citation` from `src/types/rag.ts`.
- Produces: `SourceEvidence`, `SourceEvidencePayload`, `mapCitationToSourceEvidence`, `getGraphNodeEvidence(nodeKey)`, and `useGraphNodeEvidence()`.

- [ ] **Step 1: Write failing mapper and API tests**

Create `src/types/evidence.test.ts`:

```ts
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
```

Add a `graphApi.test.ts` case that mocks `api.get` with one verified row and one source document, calls `getGraphNodeEvidence('node/method')`, asserts the path uses `encodeURIComponent`, and expects source-only documents to be normalized with `quote: null` and `provenanceStatus: 'source_only'`.

- [ ] **Step 2: Run the focused frontend tests and verify missing exports**

```powershell
npx vitest run src/types/evidence.test.ts src/services/graphApi.test.ts
```

Expected: failure because `src/types/evidence.ts` and `getGraphNodeEvidence` do not exist.

- [ ] **Step 3: Add the shared types and Chat mapper**

Create `src/types/evidence.ts`:

```ts
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
    filename: citation.filename,
    page: citation.page,
    quote: citation.snippet,
    bbox: null,
    provenanceStatus: 'full',
  };
}
```

- [ ] **Step 4: Extend Graph types and normalize the API response**

Add required `node_key: string` and `source_docs: string[]` fields to `GraphNode`. Add raw API response interfaces using backend snake-case names. Implement `getGraphNodeEvidence` in `graphApi.ts`:

```ts
interface GraphNodeEvidenceApiItem {
  doc_id: string;
  filename: string | null;
  page: number | null;
  quote: string;
  bbox: [number, number, number, number] | null;
  provenance_status: 'full' | 'partial';
}

interface GraphNodeSourceDocumentApiItem {
  doc_id: string;
  filename: string | null;
}

interface GraphNodeEvidenceResponse {
  node_key: string;
  label: string;
  evidence: GraphNodeEvidenceApiItem[];
  source_documents: GraphNodeSourceDocumentApiItem[];
}

export async function getGraphNodeEvidence(nodeKey: string): Promise<SourceEvidencePayload> {
  const response = await api.get<GraphNodeEvidenceResponse>(
    `/graph/nodes/${encodeURIComponent(nodeKey)}/evidence`,
  );
  const verified = response.data.evidence.map((item) => ({
    docId: item.doc_id,
    filename: item.filename,
    page: item.page,
    quote: item.quote,
    bbox: item.bbox,
    provenanceStatus: item.provenance_status,
  }));
  const sourceOnly = response.data.source_documents
    .filter((document) => !verified.some((item) => item.docId === document.doc_id))
    .map((document) => ({
      docId: document.doc_id,
      filename: document.filename,
      page: null,
      quote: null,
      bbox: null,
      provenanceStatus: 'source_only' as const,
    }));
  return { title: response.data.label, items: [...verified, ...sourceOnly] };
}
```

- [ ] **Step 5: Expose one TanStack mutation hook and run tests**

Add to `useGraphData.ts`:

```ts
export function useGraphNodeEvidence() {
  return useMutation<SourceEvidencePayload, Error, string>({
    mutationFn: getGraphNodeEvidence,
  });
}
```

Run:

```powershell
npx vitest run src/types/evidence.test.ts src/services/graphApi.test.ts
npx tsc --noEmit
```

Expected: tests pass and TypeScript exits `0`.

- [ ] **Step 6: Commit the frontend contract layer**

```powershell
git add src/types/evidence.ts src/types/evidence.test.ts src/types/graph.ts src/services/graphApi.ts src/services/graphApi.test.ts src/hooks/useGraphData.ts
git commit -m "feat(evidence): add shared source contract"
```

---

### Task 3: Build page-local evidence navigation and the shared drawer

**Files:**
- Create: `src/hooks/useEvidenceNavigation.ts`
- Create: `src/hooks/useEvidenceNavigation.test.tsx`
- Create: `src/components/evidence/EvidenceDrawer.tsx`
- Create: `src/components/evidence/EvidenceDrawer.test.tsx`

**Interfaces:**
- Consumes: `SourceEvidencePayload` and `SourceEvidence` from Task 2.
- Produces: `EvidenceNavigationController` with `open`, `setPayload`, `setError`, `close`, `openViewer`, and `closeViewer`; controlled `EvidenceDrawer` props.

- [ ] **Step 1: Write failing controller and drawer tests**

The hook test must render a harness and assert this sequence: `open({title, items: [], loading: true})`, `setPayload(payload)`, `openViewer(item)`, `closeViewer()`, and `close()` reset state. The drawer test must assert that a full item displays its quote and page, while a `source_only` item renders under `相關來源文件` without an `原文` label.

Use this exact drawer fixture:

```ts
const verified: SourceEvidence = {
  docId: 'doc-1', filename: 'paper.pdf', page: 3,
  quote: 'Transformer uses self-attention.', bbox: null,
  provenanceStatus: 'full',
};
const sourceOnly: SourceEvidence = {
  docId: 'doc-2', filename: 'related.pdf', page: null,
  quote: null, bbox: null, provenanceStatus: 'source_only',
};
```

- [ ] **Step 2: Run tests and verify the new modules are missing**

```powershell
npx vitest run src/hooks/useEvidenceNavigation.test.tsx src/components/evidence/EvidenceDrawer.test.tsx
```

Expected: module resolution failure for the two new source files.

- [ ] **Step 3: Implement the page-local controller**

Create `useEvidenceNavigation.ts` with one state object:

```ts
export interface EvidenceNavigationState {
  isOpen: boolean;
  title: string;
  items: SourceEvidence[];
  isLoading: boolean;
  error: string | null;
  viewerEvidence: SourceEvidence | null;
}

const initialState: EvidenceNavigationState = {
  isOpen: false, title: '', items: [], isLoading: false,
  error: null, viewerEvidence: null,
};

export function useEvidenceNavigation() {
  const [state, setState] = useState(initialState);
  return {
    state,
    open: (title: string, items: SourceEvidence[] = [], isLoading = false) =>
      setState({ ...initialState, isOpen: true, title, items, isLoading }),
    setPayload: (payload: SourceEvidencePayload) =>
      setState((current) => ({ ...current, title: payload.title, items: payload.items, isLoading: false, error: null })),
    setError: (message: string) =>
      setState((current) => ({ ...current, isLoading: false, error: message })),
    close: () => setState(initialState),
    openViewer: (evidence: SourceEvidence) =>
      setState((current) => ({ ...current, viewerEvidence: evidence })),
    closeViewer: () =>
      setState((current) => ({ ...current, viewerEvidence: null })),
  };
}

export type EvidenceNavigationController = ReturnType<typeof useEvidenceNavigation>;
```

- [ ] **Step 4: Implement the controlled Chakra drawer**

`EvidenceDrawer` must accept `state`, `onClose`, `onOpenSource`, and `finalFocusRef`. Partition items with `provenanceStatus === 'source_only'`. Resolve `const drawerSize = useBreakpointValue({ base: 'full', md: 'md' }) ?? 'md'` and pass it to `<Drawer placement="right" size={drawerSize}>`. Render verified items first with filename, `第 N 頁`, quote, provenance badge, and `開啟原文`; render source-only items under `相關來源文件` with copy `僅確認文件關聯，沒有可驗證的原文片段` and `開啟文件`.

Use this controlled prop contract so Chat and Graph own their state independently while sharing the same presentation:

```ts
export interface EvidenceDrawerProps {
  state: EvidenceNavigationState;
  onClose: () => void;
  onOpenSource: (evidence: SourceEvidence) => void;
  finalFocusRef?: React.RefObject<HTMLElement | null>;
}
```

The action must call the supplied handler with the exact `SourceEvidence` object:

```tsx
<Button size="sm" onClick={() => onOpenSource(item)}>
  {item.provenanceStatus === 'source_only' ? '開啟文件' : '開啟原文'}
</Button>
```

Loading renders a centered spinner, an error renders a retry-neutral alert, and an empty successful payload renders `這個節點目前沒有可用的來源證據。`.

- [ ] **Step 5: Run focused tests, accessibility assertions, and TypeScript**

```powershell
npx vitest run src/hooks/useEvidenceNavigation.test.tsx src/components/evidence/EvidenceDrawer.test.tsx
npx tsc --noEmit
```

Expected: all tests pass; the drawer has `role="dialog"`, Escape closes through Chakra behavior, and TypeScript exits `0`.

- [ ] **Step 6: Commit the drawer and navigation state**

```powershell
git add src/hooks/useEvidenceNavigation.ts src/hooks/useEvidenceNavigation.test.tsx src/components/evidence/EvidenceDrawer.tsx src/components/evidence/EvidenceDrawer.test.tsx
git commit -m "feat(evidence): add shared source drawer"
```

---

### Task 4: Add the on-demand PDF source viewer

**Files:**
- Create: `src/components/evidence/SourceViewerOverlay.tsx`
- Create: `src/components/evidence/SourceViewerOverlay.test.tsx`
- Modify: `package.json`
- Modify: `package-lock.json`

**Interfaces:**
- Consumes: one `SourceEvidence`, `downloadPdf(docId, 'original')`, and `onClose`.
- Produces: default-exported `SourceViewerOverlay` suitable for `lazy(() => import(...))`.

- [ ] **Step 1: Install the single PDF UI dependency**

```powershell
npm install react-pdf
```

Expected: `react-pdf` is added to dependencies and its PDF.js dependency is locked in `package-lock.json`.

- [ ] **Step 2: Write failing viewer tests with a mocked PDF renderer**

Mock `react-pdf` so `Document` invokes `onLoadSuccess({ numPages: 7 })` and `Page` renders its `pageNumber`. Mock `downloadPdf`, `URL.createObjectURL`, `URL.revokeObjectURL`, and `window.open`. Cover:

```ts
it('downloads the authenticated PDF and opens the cited page', async () => {
  renderViewer({ page: 3, bbox: null });
  expect(await screen.findByText('Rendered page 3')).toBeInTheDocument();
  expect(downloadPdf).toHaveBeenCalledWith('doc-1', 'original');
});

it('renders a normalized evidence rectangle', async () => {
  renderViewer({ page: 2, bbox: [0.1, 0.2, 0.6, 0.5] });
  const highlight = await screen.findByTestId('source-bbox-highlight');
  expect(highlight).toHaveStyle({ left: '10%', top: '20%', width: '50%', height: '30%' });
});

it('revokes the blob URL when closed', async () => {
  const { unmount } = renderViewer({ page: 1, bbox: null });
  await screen.findByText('Rendered page 1');
  unmount();
  expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:pdf');
});

it('falls back without replacing the owning page when PDF rendering throws', async () => {
  renderThrowingViewer();
  expect(await screen.findByText('PDF 預覽載入失敗')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: '使用瀏覽器開啟' })).toBeInTheDocument();
});

it('reports an expired session while keeping the selected quote visible', async () => {
  vi.mocked(downloadPdf).mockRejectedValueOnce({ response: { status: 401 } });
  renderViewer({ page: 3, bbox: null, quote: 'Keep this quote visible.' });
  expect(await screen.findByText('登入狀態已失效，請重新登入。')).toBeInTheDocument();
  expect(screen.getByText('Keep this quote visible.')).toBeInTheDocument();
});
```

- [ ] **Step 3: Run the viewer test and verify the component is missing**

```powershell
npx vitest run src/components/evidence/SourceViewerOverlay.test.tsx
```

Expected: module resolution failure for `SourceViewerOverlay`.

- [ ] **Step 4: Implement the full-screen PDF overlay**

Create a full-screen Chakra `Modal`. Configure the PDF.js worker through `react-pdf`, download the blob in an effect, create one object URL, and revoke it in cleanup. Render `Document` and one `Page` using `pageNumber={evidence.page ?? 1}`. Keep the page wrapper `position="relative"`; render the normalized rectangle only when `bbox` exists:

```tsx
{evidence.bbox && (
  <Box
    data-testid="source-bbox-highlight"
    position="absolute"
    pointerEvents="none"
    border="3px solid"
    borderColor="yellow.400"
    bg="yellow.200"
    opacity={0.35}
    left={`${evidence.bbox[0] * 100}%`}
    top={`${evidence.bbox[1] * 100}%`}
    width={`${(evidence.bbox[2] - evidence.bbox[0]) * 100}%`}
    height={`${(evidence.bbox[3] - evidence.bbox[1]) * 100}%`}
  />
)}
```

The right column displays filename, page, quote, and provenance status. If authenticated download rejects with response status `401`, show `登入狀態已失效，請重新登入。` without clearing the quote. On render failure, show `PDF 預覽載入失敗` and a button that opens `${blobUrl}#page=${evidence.page ?? 1}` with `noopener,noreferrer`. Implement a small private React class error boundary in this file around `Document`; its fallback uses the same failure panel.

- [ ] **Step 5: Run viewer tests, TypeScript, and a production build**

```powershell
npx vitest run src/components/evidence/SourceViewerOverlay.test.tsx src/services/pdfApi.test.ts
npx tsc --noEmit
npm run build
```

Expected: tests pass, TypeScript exits `0`, and Vite emits a separate lazy PDF viewer chunk without build errors.

- [ ] **Step 6: Commit the viewer**

```powershell
git add package.json package-lock.json src/components/evidence/SourceViewerOverlay.tsx src/components/evidence/SourceViewerOverlay.test.tsx
git commit -m "feat(evidence): add lazy PDF source viewer"
```

---

### Task 5: Connect Chat citations to shared evidence navigation

**Files:**
- Modify: `src/pages/Chat.tsx:1`
- Modify: `src/pages/Chat.tsx:143`
- Modify: `src/pages/Chat.tsx:485`
- Modify: `src/pages/Chat.test.tsx:19`
- Test: `src/components/rag/MessageBubble.test.tsx`

**Interfaces:**
- Consumes: `mapCitationToSourceEvidence`, `useEvidenceNavigation`, `EvidenceDrawer`, and lazy `SourceViewerOverlay`.
- Produces: a visible action for every existing Chat source chip without changing Chat API data.

- [ ] **Step 1: Add a failing MessageBubble callback test**

Append to `MessageBubble.test.tsx`:

```ts
it('passes the exact citation to its click handler', async () => {
  const citation = {
    doc_id: 'doc-1', filename: 'paper.pdf', page: 3,
    snippet: 'Source quote', score: 0.9,
  };
  const onCitationClick = vi.fn();
  render(<ChakraProvider theme={theme}><MessageBubble
    role="assistant" content="Answer" sources={[citation]}
    onCitationClick={onCitationClick}
  /></ChakraProvider>);
  fireEvent.click(screen.getByRole('button', { name: '切換來源顯示' }));
  fireEvent.click(await screen.findByRole('button', { name: /paper\.pdf/i }));
  expect(onCitationClick).toHaveBeenCalledWith(citation);
});
```

Add a Chat integration test whose MessageBubble mock captures `onCitationClick`, invokes it with the same citation, and whose EvidenceDrawer mock asserts it receives an item titled `paper.pdf` with page `3`.

- [ ] **Step 2: Run the focused tests and verify the Chat integration failure**

```powershell
npx vitest run src/components/rag/MessageBubble.test.tsx src/pages/Chat.test.tsx
```

Expected: the MessageBubble unit test passes, while the Chat integration assertion fails because Chat does not pass `onCitationClick` or mount the shared UI.

- [ ] **Step 3: Mount one page-local navigation controller in Chat**

In `Chat`, create `const evidenceNavigation = useEvidenceNavigation()` and a ref for final focus. Add:

```ts
const handleCitationClick = (citation: Citation) => {
  const item = mapCitationToSourceEvidence(citation);
  evidenceNavigation.open(item.filename ?? '來源文件', [item]);
};
```

Pass `onCitationClick={handleCitationClick}` to every `MessageBubble`. Mount `EvidenceDrawer` once near the end of the page. Lazy-import `SourceViewerOverlay` at module scope and render it only when `viewerEvidence` is non-null inside `Suspense`.

- [ ] **Step 4: Verify Chat source behavior and no chat regressions**

```powershell
npx vitest run src/components/rag/MessageBubble.test.tsx src/pages/Chat.test.tsx src/hooks/useChat.test.tsx
npx tsc --noEmit
```

Expected: all focused tests pass and TypeScript exits `0`.

- [ ] **Step 5: Commit Chat integration**

```powershell
git add src/pages/Chat.tsx src/pages/Chat.test.tsx src/components/rag/MessageBubble.test.tsx
git commit -m "feat(chat): open citations in source viewer"
```

---

### Task 6: Connect Graph node clicks to verified source evidence

**Files:**
- Modify: `src/components/graph/KnowledgeGraph.tsx:345`
- Modify: `src/components/graph/KnowledgeGraph.test.tsx:189`
- Modify: `src/pages/GraphDemo.tsx:69`
- Modify: `src/pages/GraphDemo.tsx:736`
- Modify: `src/pages/GraphDemo.test.tsx:1`

**Interfaces:**
- Consumes: `GraphNode.node_key`, `useGraphNodeEvidence`, `useEvidenceNavigation`, shared drawer, and shared viewer.
- Produces: latest-click-wins node evidence loading with no Graph remount.

- [ ] **Step 1: Write failing 3D node-key preservation and Graph page tests**

Update the KnowledgeGraph fixture so its node contains `node_key: 'node-1-key'` and `source_docs: ['doc-1']`. Assert its click callback receives both fields.

Change the GraphDemo KnowledgeGraph mock to render a button that calls:

```ts
onNodeClick({
  id: 'Transformer', node_key: 'node-transformer', source_docs: ['doc-1'],
  group: 1, val: 2, desc: 'Method',
});
```

Mock `useGraphNodeEvidence().mutate` so it invokes `onSuccess` with:

```ts
{
  title: 'Transformer',
  items: [{
    docId: 'doc-1', filename: 'paper.pdf', page: 3,
    quote: 'Transformer uses self-attention.', bbox: null,
    provenanceStatus: 'full',
  }],
}
```

Assert clicking the node displays `paper.pdf`, `第 3 頁`, and `Transformer uses self-attention.` in the shared drawer mock.

- [ ] **Step 2: Run the focused Graph tests and verify failure**

```powershell
npx vitest run src/components/graph/KnowledgeGraph.test.tsx src/pages/GraphDemo.test.tsx
```

Expected: failure because `node_key` is not preserved through the 3D projection and GraphDemo still logs clicks.

- [ ] **Step 3: Preserve Graph metadata through 3D projection**

In the `KnowledgeGraph.tsx` 3D node mapping, copy:

```ts
node_key: node.node_key,
source_docs: node.source_docs,
```

Add the same two fields to every node in the file-local `MOCK_GRAPH_DATA` fixture. Do not change `id`, link source/target values, force simulation state, or the existing callback signature.

- [ ] **Step 4: Implement latest-click-wins evidence loading in GraphDemo**

Create the evidence navigation controller, the Graph evidence mutation, and `selectedNodeKeyRef`. Replace the console handler:

```ts
const handleGraphNodeClick = (node: GraphNode) => {
  selectedNodeKeyRef.current = node.node_key;
  evidenceNavigation.open(node.id, [], true);
  graphNodeEvidenceMutation.mutate(node.node_key, {
    onSuccess: (payload) => {
      if (selectedNodeKeyRef.current === node.node_key) {
        evidenceNavigation.setPayload(payload);
      }
    },
    onError: () => {
      if (selectedNodeKeyRef.current === node.node_key) {
        evidenceNavigation.setError('無法載入這個節點的來源證據。');
      }
    },
  });
};
```

Pass `handleGraphNodeClick` to `KnowledgeGraph`. Mount the same `EvidenceDrawer` and lazy `SourceViewerOverlay` used by Chat. Do not put the selected node in `graphData` or change the KnowledgeGraph `key`; this preserves Graph zoom and simulation state.

- [ ] **Step 5: Add a stale-response regression and run Graph tests**

In `GraphDemo.test.tsx`, capture two mutation callbacks, click node A then node B, resolve A after B, and assert A's filename never appears. Then resolve B and assert B's evidence appears.

Run:

```powershell
npx vitest run src/components/graph/KnowledgeGraph.test.tsx src/pages/GraphDemo.test.tsx src/services/graphApi.test.ts
npx tsc --noEmit
```

Expected: all focused tests pass and TypeScript exits `0`.

- [ ] **Step 6: Commit Graph integration**

```powershell
git add src/components/graph/KnowledgeGraph.tsx src/components/graph/KnowledgeGraph.test.tsx src/pages/GraphDemo.tsx src/pages/GraphDemo.test.tsx
git commit -m "feat(graph): open node source evidence"
```

---

### Task 7: Sync docs and contracts, then run full acceptance

**Files:**
- Modify: `D:/flutterserver/pdftopng/docs/BACKEND.md`
- Regenerate: `D:/flutterserver/pdftopng/openapi.json`
- Regenerate: `D:/flutterserver/pdftopng/contracts/openapi-contract.json`
- Regenerate: `D:/flutterserver/pdftopng/docs/generated/api-surface.md`
- Modify: `docs/product-specs/chat-and-presets.md`
- Modify: `docs/design-docs/upload-and-graph-workspace.md`
- Modify: `src/test/fixtures/agenticV9ApiContract.ts`

**Interfaces:**
- Consumes: the final backend commit and all frontend behavior from Tasks 1–6.
- Produces: current OpenAPI artifacts, frontend backend-pin alignment, user-facing docs, and fresh full-suite evidence.

- [ ] **Step 1: Document and regenerate the backend API surface**

In `pdftopng/docs/BACKEND.md`, add `/graph/nodes/{node_key}/evidence` under GraphRAG and state that quotes come only from persisted incident-edge provenance. Then run:

```powershell
$env:TEST_MODE="true"
$env:USE_FAKE_PROVIDERS="true"
$env:CI_BLOCK_EXTERNAL_NETWORK="true"
.\.venv\Scripts\python.exe scripts\sync_openapi_artifacts.py --write
.\.venv\Scripts\python.exe scripts\sync_openapi_artifacts.py --check
.\.venv\Scripts\python.exe scripts\check_markdown_links.py
```

Expected: the check reports `OpenAPI artifacts are current` and Markdown links are valid.

- [ ] **Step 2: Run full backend acceptance and commit final backend state**

```powershell
.\.venv\Scripts\python.exe -m ruff check . --select E9,F63,F7,F82,F401,F841
.\.venv\Scripts\python.exe scripts\check_complexity_ratchet.py --check
.\.venv\Scripts\python.exe scripts\run_pytest_with_warning_budget.py --max-warnings 56 -- -q
```

Expected: Ruff passes, complexity does not exceed the baseline, pytest exits `0`, and warnings do not exceed `56`.

```powershell
git add docs/BACKEND.md openapi.json contracts/openapi-contract.json docs/generated/api-surface.md
git commit -m "docs(graph): publish node evidence contract"
```

- [ ] **Step 3: Update frontend product and design docs**

Add the Chat citation drawer/viewer behavior to `docs/product-specs/chat-and-presets.md`. Add Graph node evidence, source-only honesty, and the shared authenticated viewer to `docs/design-docs/upload-and-graph-workspace.md`. Keep global session/SSE resilience explicitly outside this feature.

- [ ] **Step 4: Pin the final backend commit and check generated docs**

From `D:/flutterserver/Multimodal_RAG_System`:

```powershell
npm run contract:pin -- --backend ..\pdftopng
npm run contract:check -- --backend ..\pdftopng
npm run docs:sync
npm run docs:check
npm run docs:links
```

Expected: the frontend fixture contains the final backend commit and OpenAPI SHA, contract check reports a match, generated UI docs are current, and Markdown links are valid.

- [ ] **Step 5: Run full frontend acceptance**

```powershell
npm run lint:ci
npx tsc --noEmit
npm run test:scripts
npm test -- --run
npm run build
```

Expected: every command exits `0`; Vitest reports no failed tests; Vite produces the production build.

- [ ] **Step 6: Commit frontend docs and contract pin**

```powershell
git add docs/product-specs/chat-and-presets.md docs/design-docs/upload-and-graph-workspace.md docs/generated/ui-surface.md src/test/fixtures/agenticV9ApiContract.ts
git commit -m "docs: publish shared evidence navigation"
```

- [ ] **Step 7: Verify both repositories are clean except the approved companion artifacts**

```powershell
git -C ..\pdftopng status --short --branch
git status --short --branch
```

Expected: no tracked modifications remain. The frontend may still show the intentionally untracked `.superpowers/brainstorm/` visual-companion directory; do not include it in a feature commit.
