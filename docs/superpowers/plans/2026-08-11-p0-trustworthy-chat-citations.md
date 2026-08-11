# P0 Trustworthy Chat Citations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace fabricated Chat citation fields with retrieved source text and metadata, then expose honest provenance and measured relevance in the shared Source Viewer.

**Architecture:** FastAPI builds citations from the exact `Document` objects used to generate the answer, with database filename lookup only as metadata enrichment. React derives `full`, `partial`, or `source_only` from actual fields and never trusts a separate verification boolean.

**Tech Stack:** LangChain `Document`, FastAPI/Pydantic, pytest, React/TypeScript, Chakra UI, Vitest, existing evidence drawer/viewer, OpenAPI contract pinning.

## Global Constraints

- `snippet` is retrieved `Document.page_content[:200]` after trimming, or `null`.
- Never use generated answer text as a citation fallback.
- Never use a fixed score. Only a measured finite number in `0..1` is returned; otherwise `null`.
- Do not clamp out-of-range scores because clamping would turn an invalid measurement into an apparently valid one.
- Bbox is returned only when it is already a four-number normalized tuple/list satisfying `0 <= x1 < x2 <= 1` and `0 <= y1 < y2 <= 1`.
- String/pixel bboxes are not guessed or normalized without page dimensions.
- Source-only rows remain navigable without being presented as verified original text.
- Preserve citation retrieval order and deduplicate by `(doc_id, page, snippet)`.
- Backend changes commit on `pdftopng/main`; frontend changes commit on `Multimodal_RAG_System/master`.

---

### Task 3: Backend Citation Builder and Wire Contract

**Files:**
- Create: `D:\flutterserver\pdftopng\data_base\citations.py`
- Modify: `D:\flutterserver\pdftopng\data_base\schemas.py`
- Modify: `D:\flutterserver\pdftopng\data_base\rag_filtering.py`
- Modify: `D:\flutterserver\pdftopng\data_base\router.py`
- Modify generated: `D:\flutterserver\pdftopng\openapi.json`
- Modify generated: `D:\flutterserver\pdftopng\contracts\openapi-contract.json`
- Modify generated: `D:\flutterserver\pdftopng\docs\generated\api-surface.md`
- Test: `D:\flutterserver\pdftopng\tests\test_chat_citations.py`
- Test: `D:\flutterserver\pdftopng\tests\test_rag_filtering.py`
- Test: `D:\flutterserver\pdftopng\tests\test_rag_ask_stream.py`

**Interfaces:**
- Produces: `async build_source_details(documents: Sequence[Document], source_doc_ids: Sequence[str]) -> list[SourceDetail]`.
- Produces wire fields: `doc_id: str`, `filename: str | null`, `page: int | null`, `snippet: str | null`, `score: float | null`, `bbox: tuple[float, float, float, float] | null`.
- Consumes metadata keys: document ID via `get_document_id`; filename via `file_name`, `source_file`, `filename`, then `fetch_document_filenames`; page via `page`, then `page_number`; score via `relevance_score`, `reranker_score`, then `score`.
- Produces measured reranker score in returned document metadata as `relevance_score` without changing diagnostic score rows.

- [ ] **Step 1: Write failing builder tests**

```python
from unittest.mock import AsyncMock, patch

import pytest
from langchain_core.documents import Document

from data_base.citations import build_source_details


@pytest.mark.asyncio
async def test_citation_uses_retrieved_text_and_metadata_only() -> None:
    documents = [
        Document(
            page_content="  original paragraph from the PDF  ",
            metadata={
                "doc_id": "doc-1",
                "file_name": "paper.pdf",
                "page": 3,
                "relevance_score": 0.82,
                "bbox": [0.1, 0.2, 0.8, 0.4],
            },
        )
    ]
    with patch(
        "data_base.citations.fetch_document_filenames",
        new=AsyncMock(return_value={"doc-1": "db-name.pdf"}),
    ):
        result = await build_source_details(documents, ["doc-1"])

    assert [item.model_dump() for item in result] == [{
        "doc_id": "doc-1",
        "filename": "paper.pdf",
        "page": 3,
        "snippet": "original paragraph from the PDF",
        "score": 0.82,
        "bbox": (0.1, 0.2, 0.8, 0.4),
    }]


@pytest.mark.asyncio
async def test_invalid_precision_degrades_without_fabrication() -> None:
    document = Document(
        page_content="source text",
        metadata={"doc_id": "doc-1", "page": 0, "score": 2.5, "bbox": "[1,2,3,4]"},
    )
    with patch(
        "data_base.citations.fetch_document_filenames",
        new=AsyncMock(return_value={"doc-1": "paper.pdf"}),
    ):
        result = await build_source_details([document], ["doc-1"])

    assert result[0].filename == "paper.pdf"
    assert result[0].page is None
    assert result[0].score is None
    assert result[0].bbox is None
    assert result[0].snippet == "source text"


@pytest.mark.asyncio
async def test_missing_document_becomes_source_only_without_answer_fallback() -> None:
    with patch(
        "data_base.citations.fetch_document_filenames",
        new=AsyncMock(return_value={"doc-2": "missing.pdf"}),
    ):
        result = await build_source_details([], ["doc-2"])
    assert result[0].model_dump() == {
        "doc_id": "doc-2", "filename": "missing.pdf", "page": None,
        "snippet": None, "score": None, "bbox": None,
    }
```

Add a fourth test with duplicate chunks and assert the first occurrence wins and order follows retrieval order.

- [ ] **Step 2: Run builder tests and verify RED**

```powershell
python -m pytest tests/test_chat_citations.py -q
```

Expected: collection fails because `data_base.citations` does not exist and `SourceDetail` does not allow nullable fields/bbox.

- [ ] **Step 3: Make `SourceDetail` truthful and nullable**

Replace the existing schema fields with:

```python
class SourceDetail(BaseModel):
    doc_id: str
    filename: Optional[str] = None
    page: Optional[int] = Field(default=None, ge=1)
    snippet: Optional[str] = Field(default=None, description="檢索到的引用段落原文")
    score: Optional[float] = Field(default=None, ge=0.0, le=1.0)
    bbox: Optional[tuple[float, float, float, float]] = None
```

- [ ] **Step 4: Implement the isolated citation builder**

Use small private helpers in `data_base/citations.py`:

```python
def _positive_page(metadata: Mapping[str, Any]) -> int | None:
    for key in ("page", "page_number"):
        value = metadata.get(key)
        if isinstance(value, int) and not isinstance(value, bool) and value >= 1:
            return value
    return None


def _measured_score(metadata: Mapping[str, Any]) -> float | None:
    for key in ("relevance_score", "reranker_score", "score"):
        value = metadata.get(key)
        if isinstance(value, (int, float)) and not isinstance(value, bool):
            measured = float(value)
            return measured if math.isfinite(measured) and 0.0 <= measured <= 1.0 else None
    return None


def _normalized_bbox(metadata: Mapping[str, Any]) -> tuple[float, float, float, float] | None:
    value = metadata.get("bbox")
    if not isinstance(value, (list, tuple)) or len(value) != 4:
        return None
    if any(isinstance(item, bool) or not isinstance(item, (int, float)) for item in value):
        return None
    x1, y1, x2, y2 = (float(item) for item in value)
    if not (0.0 <= x1 < x2 <= 1.0 and 0.0 <= y1 < y2 <= 1.0):
        return None
    return (x1, y1, x2, y2)
```

`build_source_details` must fetch filenames once, walk `documents` once, ignore documents whose IDs are not in `source_doc_ids`, trim/slice source text, deduplicate using a set, then append any unseen source IDs as source-only entries. Catch `core.errors.AppError` from `fetch_document_filenames`, log only its safe error code/message, and continue with metadata filenames rather than failing the answer.

- [ ] **Step 5: Preserve actual reranker scores on returned documents**

After `_post_rerank_rows` has been computed, project measured scores into copies of selected documents:

```python
def _attach_measured_scores(
    documents: list[Document], rows: list[dict[str, Any]]
) -> list[Document]:
    scored: list[Document] = []
    for document, row in zip(documents, rows, strict=True):
        value = row.get("score")
        if isinstance(value, (int, float)) and not isinstance(value, bool) and 0.0 <= float(value) <= 1.0:
            metadata = {**document.metadata, "relevance_score": float(value)}
            scored.append(document.model_copy(update={"metadata": metadata}))
        else:
            scored.append(document)
    return scored
```

Call it only after diagnostic metadata is built, immediately before constructing the returned `RagRetrievalResult`. Update `tests/test_rag_filtering.py` to assert the reranked returned documents contain `0.9` and `0.4`, while unavailable-reranker documents contain no made-up score.

- [ ] **Step 6: Replace both router fallback paths**

In `_run_contextual_ask`:

```python
rag_result = await rag_answer_question(..., return_docs=True, ...)

if isinstance(rag_result, RAGResult):
    answer = rag_result.answer
    sources = rag_result.source_doc_ids
    docs = rag_result.documents
else:
    answer, sources = rag_result
    docs = []

source_details = await build_source_details(docs, sources)
```

Return the same `source_details` whether evaluation is enabled or disabled. Remove `_build_source_details(answer, sources)` and remove the evaluation loop that substitutes `answer[:200]` and `0.7`. Evaluation still consumes `docs` for metrics; it does not rewrite citations.

Update `tests/test_rag_ask_stream.py` so a tuple-returning compatibility mock expects `snippet: null` and `score: null`; add a `RAGResult` case proving source text/page/score survives the SSE `complete` event.

- [ ] **Step 7: Run focused citation and stream tests**

```powershell
python -m pytest tests/test_chat_citations.py tests/test_rag_filtering.py tests/test_rag_ask_stream.py tests/test_rag_retrieval_pipeline.py -q
```

Expected: all pass and no assertion contains generated answer text as a snippet.

- [ ] **Step 8: Regenerate and validate backend OpenAPI artifacts**

```powershell
python scripts/sync_openapi_artifacts.py --write
python scripts/sync_openapi_artifacts.py --check
python -m pytest tests/test_openapi_artifacts.py tests/test_api_contracts_v3.py -q
```

Expected: generated schema marks `snippet`, `score`, `page`, and `bbox` nullable and artifact checks pass.

- [ ] **Step 9: Commit Task 3**

```powershell
git add data_base/citations.py data_base/schemas.py data_base/rag_filtering.py data_base/router.py tests/test_chat_citations.py tests/test_rag_filtering.py tests/test_rag_ask_stream.py openapi.json contracts/openapi-contract.json docs/generated/api-surface.md
git diff --cached --check
git commit -m "fix(rag): return trustworthy chat citations"
```

### Task 4: Frontend Provenance Mapping and Relevance Display

**Files:**
- Modify: `D:\flutterserver\Multimodal_RAG_System\src\types\rag.ts`
- Modify: `D:\flutterserver\Multimodal_RAG_System\src\types\evidence.ts`
- Modify: `D:\flutterserver\Multimodal_RAG_System\src\types\evidence.test.ts`
- Modify: `D:\flutterserver\Multimodal_RAG_System\src\components\evidence\EvidenceDrawer.tsx`
- Modify: `D:\flutterserver\Multimodal_RAG_System\src\components\evidence\EvidenceDrawer.test.tsx`
- Modify: `D:\flutterserver\Multimodal_RAG_System\src\components\rag\MessageBubble.test.tsx`
- Modify generated pin: `D:\flutterserver\Multimodal_RAG_System\src\test\fixtures\agenticV9ApiContract.ts`

**Interfaces:**
- Consumes backend `Citation` from Task 3.
- Produces `SourceEvidence.score?: number | null` for Chat; Graph evidence may omit it.
- Produces mapping: `full` for quote+page+valid bbox, `partial` for a quote without exact region, `source_only` without a quote.

- [ ] **Step 1: Replace the legacy distrust tests with failing provenance tests**

```typescript
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

it('keeps source-only citations honest', () => {
  expect(mapCitationToSourceEvidence({
    doc_id: 'doc-2', filename: 'paper.pdf', page: null,
    snippet: null, score: null, bbox: null,
  })).toMatchObject({
    quote: null, score: null, bbox: null, provenanceStatus: 'source_only',
  });
});
```

Add a partial case with page+snippet and `bbox: null`. Add an invalid runtime bbox case and assert it is ignored.

- [ ] **Step 2: Run focused tests and verify RED**

```powershell
npx vitest run src/types/evidence.test.ts src/components/evidence/EvidenceDrawer.test.tsx
```

Expected: TypeScript/test failures because nullable citation fields and evidence score are not supported.

- [ ] **Step 3: Update types and the mapping function**

```typescript
export interface Citation {
  doc_id: string;
  filename: string | null;
  page: number | null;
  snippet: string | null;
  score: number | null;
  bbox?: [number, number, number, number] | null;
}

export interface SourceEvidence {
  // existing fields
  score?: number | null;
}
```

Implement `isNormalizedBbox` without coercion. Trim the snippet; empty text becomes `null`. Set status to `full` only with quote, positive page, and valid bbox; set `partial` when quote exists; otherwise set `source_only`. Pass only a finite `0..1` score.

- [ ] **Step 4: Display relevance only when measured**

In `EvidenceDrawer`, render a compact label such as `相關度 82%` beside the page/provenance metadata only when `score` is a finite number in `0..1`. Do not render `0%` for `null`; do not add a confidence bar or new ranking UI.

Tests must assert:

```typescript
expect(screen.getByText('相關度 82%')).toBeInTheDocument();
expect(screen.queryByText(/相關度/)).not.toBeInTheDocument(); // source-only fixture
```

Keep `MessageBubble` click behavior unchanged and update its fixture types to accept nullable citation fields.

- [ ] **Step 5: Run focused frontend tests**

```powershell
npx vitest run src/types/evidence.test.ts src/components/evidence/EvidenceDrawer.test.tsx src/components/rag/MessageBubble.test.tsx src/pages/Chat.test.tsx
npx tsc --noEmit
```

Expected: all pass.

- [ ] **Step 6: Pin and verify the backend contract**

Task 3 must already be committed in `pdftopng`. Then run:

```powershell
npm run contract:pin
npm run contract:check
npm run test:scripts
```

Expected: `src/test/fixtures/agenticV9ApiContract.ts` records the Task 3 backend commit and OpenAPI SHA.

- [ ] **Step 7: Commit Task 4**

```powershell
git add src/types/rag.ts src/types/evidence.ts src/types/evidence.test.ts src/components/evidence/EvidenceDrawer.tsx src/components/evidence/EvidenceDrawer.test.tsx src/components/rag/MessageBubble.test.tsx src/test/fixtures/agenticV9ApiContract.ts
git diff --cached --check
git commit -m "feat(evidence): show trustworthy chat provenance"
```
