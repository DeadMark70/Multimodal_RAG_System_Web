# Portable Document Paths and PDF Viewer Diagnostics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make existing Windows-style PDF metadata work in Linux Docker, persist portable paths for new documents, safely migrate eligible Supabase rows, and expose useful Source Viewer status/request-ID diagnostics.

**Architecture:** The backend owns one pure path normalizer and one filesystem resolver in `core/uploads.py`. Runtime services and the manual migration reuse those helpers; the frontend keeps the existing PDF endpoint and adds request-ID-aware error presentation. No object storage, endpoint, Graph evidence, or startup-mutation changes are introduced.

**Tech Stack:** Python 3.11+, pathlib, FastAPI, Supabase/PostgREST, pytest, Ruff, React 18, TypeScript 5.9, Axios, Chakra UI, Vitest.

## Global Constraints

- Implement `docs/superpowers/specs/2026-08-12-portable-document-paths-design.md`.
- Store new `original_path` and `translated_path` values as `uploads/<user-id>/<document-id>/<filename>.pdf` using `/`.
- Accept only canonical POSIX or legacy relative Windows references; reject absolute, UNC, traversal, cross-user, and cross-document paths.
- Keep `GET /pdfmd/file/{doc_id}?type=original|translated` and Graph/citation contracts unchanged.
- Never expose server filesystem paths or raw backend exceptions.
- Migration is manual, defaults to dry-run, requires `--apply`, and never runs at startup.
- Migration updates use both document ID and user ID and are idempotent.
- Preserve Source Viewer filename, page, provenance, and quote after download failure.
- Do not add dependencies, object storage, signed URLs, caches, or repair heuristics.
- Use TDD: capture RED before production edits, then run focused and regression gates.
- Commit only listed files; preserve unrelated/user-owned changes.

---

### Task 1: Add the safe cross-platform path contract

**Repository:** `D:\flutterserver\pdftopng`

**Files:**
- Modify: `core/uploads.py`
- Modify: `tests/test_uploads.py`

**Interfaces:**
- Consumes: `BASE_UPLOAD_FOLDER` and `ensure_upload_root()`.
- Produces: `build_document_storage_path(*, user_id: str, doc_id: str, filename: str) -> str`.
- Produces: `normalize_document_storage_path(*, user_id: str, doc_id: str, storage_path: str) -> str`.
- Produces: `resolve_document_storage_path(*, user_id: str, doc_id: str, storage_path: str) -> Path`.
- Preserves: `resolve_document_user_folder(...)` through the new resolver.

- [ ] **Step 1: Add failing portable-path and rejection tests**

Append focused tests:

```python
def test_build_document_storage_path_is_posix() -> None:
    assert upload_paths.build_document_storage_path(
        user_id="user-1", doc_id="doc-1", filename="paper.pdf"
    ) == "uploads/user-1/doc-1/paper.pdf"


@pytest.mark.parametrize(
    ("stored", "expected"),
    [
        ("uploads/user-1/doc-1/paper.pdf", "uploads/user-1/doc-1/paper.pdf"),
        (r"uploads\user-1\doc-1\paper.pdf", "uploads/user-1/doc-1/paper.pdf"),
    ],
)
def test_normalize_accepts_portable_and_legacy_relative(
    stored: str, expected: str
) -> None:
    assert upload_paths.normalize_document_storage_path(
        user_id="user-1", doc_id="doc-1", storage_path=stored
    ) == expected


@pytest.mark.parametrize(
    "stored",
    [
        "/app/uploads/user-1/doc-1/paper.pdf",
        r"D:\uploads\user-1\doc-1\paper.pdf",
        r"\\server\share\paper.pdf",
        "uploads/user-1/doc-1/../doc-2/paper.pdf",
        "uploads/user-2/doc-1/paper.pdf",
        "uploads/user-1/doc-2/paper.pdf",
        r"uploads/user-1\doc-1/paper.pdf",
    ],
)
def test_normalize_rejects_unsafe_values(stored: str) -> None:
    with pytest.raises(ValueError):
        upload_paths.normalize_document_storage_path(
            user_id="user-1", doc_id="doc-1", storage_path=stored
        )


def test_resolve_legacy_path_inside_exact_document_root(
    tmp_path, monkeypatch
) -> None:
    monkeypatch.chdir(tmp_path)
    expected = tmp_path / "uploads" / "user-1" / "doc-1" / "paper.pdf"
    expected.parent.mkdir(parents=True)
    expected.write_bytes(b"%PDF")
    resolved = upload_paths.resolve_document_storage_path(
        user_id="user-1",
        doc_id="doc-1",
        storage_path=r"uploads\user-1\doc-1\paper.pdf",
    )
    assert resolved == expected.resolve()
```

Update `test_resolve_document_user_folder_prefers_original_path` to cover a legacy
relative Windows value under `tmp_path`.

- [ ] **Step 2: Run tests and verify RED**

```powershell
.\.venv\Scripts\python.exe -m pytest tests/test_uploads.py -q
```

Expected: the three new helpers are missing and legacy folder resolution fails.

- [ ] **Step 3: Implement the minimal normalizer and resolver**

Import `PurePosixPath` and `PureWindowsPath`, then implement:

```python
def _validate_path_component(value: str, *, label: str) -> None:
    if not value or value in {".", ".."} or "/" in value or "\\" in value:
        raise ValueError(f"{label} must be a single path component")


def build_document_storage_path(
    *, user_id: str, doc_id: str, filename: str
) -> str:
    for label, value in (
        ("user_id", user_id), ("doc_id", doc_id), ("filename", filename)
    ):
        _validate_path_component(value, label=label)
    return PurePosixPath(BASE_UPLOAD_FOLDER, user_id, doc_id, filename).as_posix()


def normalize_document_storage_path(
    *, user_id: str, doc_id: str, storage_path: str
) -> str:
    _validate_path_component(user_id, label="user_id")
    _validate_path_component(doc_id, label="doc_id")
    if not storage_path or ("/" in storage_path and "\\" in storage_path):
        raise ValueError("storage path must use one separator style")
    parsed = (
        PureWindowsPath(storage_path)
        if "\\" in storage_path
        else PurePosixPath(storage_path)
    )
    if parsed.is_absolute() or parsed.drive or parsed.root:
        raise ValueError("storage path must be relative")
    parts = parsed.parts
    if len(parts) != 4 or parts[:3] != (
        BASE_UPLOAD_FOLDER, user_id, doc_id
    ):
        raise ValueError("storage path is outside the authorized document")
    if any(part in {"", ".", ".."} for part in parts):
        raise ValueError("storage path contains an unsafe component")
    _validate_path_component(parts[3], label="filename")
    return PurePosixPath(*parts).as_posix()


def resolve_document_storage_path(
    *, user_id: str, doc_id: str, storage_path: str
) -> Path:
    canonical = normalize_document_storage_path(
        user_id=user_id, doc_id=doc_id, storage_path=storage_path
    )
    upload_root = Path(ensure_upload_root()).resolve()
    document_root = (upload_root / user_id / doc_id).resolve()
    candidate = Path(canonical).resolve()
    if not candidate.is_relative_to(document_root):
        raise ValueError("storage path escapes the authorized document")
    return candidate
```

Use `resolve_document_storage_path(...).parent` in
`resolve_document_user_folder` when `original_path` is present.

- [ ] **Step 4: Run focused tests and Ruff**

```powershell
.\.venv\Scripts\python.exe -m pytest tests/test_uploads.py -q
.\.venv\Scripts\python.exe -m ruff check core/uploads.py tests/test_uploads.py
```

Expected: all pass with no Ruff errors.

- [ ] **Step 5: Commit Task 1**

```powershell
git add core/uploads.py tests/test_uploads.py
git diff --cached --check
git commit -m "fix(storage): resolve portable document paths"
```

---

### Task 2: Use portable paths throughout PDF runtime flows

**Repository:** `D:\flutterserver\pdftopng`

**Files:**
- Modify: `pdfserviceMD/service.py`
- Modify: `tests/test_pdfservice_manual_translation.py`
- Create: `tests/test_pdfservice_portable_paths.py`
- Regression only: `tests/test_pdfservice_background_processing.py`

**Interfaces:**
- Consumes: Task 1 path helpers.
- Produces: portable database writes while native paths remain local to file I/O.
- Preserves: `get_document_file_info(...) -> tuple[str, str]` and endpoint shape.

- [ ] **Step 1: Add failing service tests**

Replace absolute Windows fixtures in
`test_get_document_file_info_supports_type_selection` with files under
`tmp_path/uploads/<TEST_USER_ID>/doc-1/`. Store one legacy `\` reference and one
portable `/` reference.

Create `tests/test_pdfservice_portable_paths.py`:

```python
@pytest.mark.asyncio
async def test_upload_persists_portable_original_path(
    tmp_path, monkeypatch
) -> None:
    monkeypatch.chdir(tmp_path)
    create_record = AsyncMock()
    upload = UploadFile(
        filename="paper.pdf",
        file=BytesIO(b"%PDF-1.7"),
        headers=Headers({"content-type": "application/pdf"}),
    )
    with (
        patch("pdfserviceMD.service.create_document_record", create_record),
        patch("pdfserviceMD.service.update_processing_step", new=AsyncMock()),
        patch("pdfserviceMD.service.update_document_status", new=AsyncMock()),
        patch("pdfserviceMD.service.ocr_service_sync", return_value="markdown"),
        patch("pdfserviceMD.service.markdown_extact", return_value=("markdown", [])),
        patch("pdfserviceMD.service.save_ocr_artifacts"),
    ):
        result = await run_upload_pipeline(
            file=upload, user_id="user-1", base_upload_folder="uploads"
        )
    stored = create_record.await_args.kwargs["original_path"]
    assert stored == f"uploads/user-1/{result.doc_id}/paper.pdf"
    assert "\\" not in stored


@pytest.mark.asyncio
async def test_download_resolves_legacy_windows_relative_path(
    tmp_path, monkeypatch
) -> None:
    monkeypatch.chdir(tmp_path)
    pdf = tmp_path / "uploads" / "user-1" / "doc-1" / "paper.pdf"
    pdf.parent.mkdir(parents=True)
    pdf.write_bytes(b"%PDF")
    row = {
        "file_name": "paper.pdf",
        "original_path": r"uploads\user-1\doc-1\paper.pdf",
        "translated_path": None,
    }
    with patch(
        "pdfserviceMD.service.get_document", new=AsyncMock(return_value=row)
    ):
        path, name = await get_document_file_info(
            doc_id="doc-1", user_id="user-1", file_type="original"
        )
    assert Path(path) == pdf.resolve()
    assert name == "paper.pdf"


@pytest.mark.asyncio
async def test_download_rejects_cross_document_path() -> None:
    row = {
        "file_name": "paper.pdf",
        "original_path": "uploads/user-1/doc-2/paper.pdf",
        "translated_path": None,
    }
    with patch(
        "pdfserviceMD.service.get_document", new=AsyncMock(return_value=row)
    ):
        with pytest.raises(AppError) as exc_info:
            await get_document_file_info(
                doc_id="doc-1", user_id="user-1", file_type="original"
            )
    assert exc_info.value.status_code == 404
    assert "uploads/" not in exc_info.value.message
```

Add a translation assertion that `update_document_status(...,
translated_path=...)` receives
`uploads/<user>/<doc>/translated_<filename>` while the generator receives a native
filesystem path.

- [ ] **Step 2: Run tests and verify RED**

```powershell
.\.venv\Scripts\python.exe -m pytest tests/test_pdfservice_portable_paths.py tests/test_pdfservice_manual_translation.py -q
```

Expected: legacy download and portable write assertions fail because `service.py`
still uses raw `os.path.normpath` and persists native paths.

- [ ] **Step 3: Add one safe service adapter**

Import Task 1 helpers and add:

```python
def _resolve_stored_file(
    *, user_id: str, doc_id: str, storage_path: str | None
) -> Path | None:
    if not storage_path:
        return None
    try:
        resolved = resolve_document_storage_path(
            user_id=user_id, doc_id=doc_id, storage_path=storage_path
        )
    except ValueError:
        return None
    return resolved if resolved.is_file() else None
```

Use it in `prepare_retry_index_context`, `list_user_documents`,
`_can_translate_document`, `get_document_processing_status`,
`get_document_file_info`, `finalize_indexing_status`, and
`translate_user_document`. Pass the already authenticated user ID and owned
document ID. Never fall back to the raw path.

- [ ] **Step 4: Persist portable original and translated references**

In `run_upload_pipeline` keep native `save_path` for file/OCR work, but persist:

```python
original_storage_path = build_document_storage_path(
    user_id=user_id, doc_id=document_id, filename=filename
)
await create_document_record(
    doc_id=document_id,
    user_id=user_id,
    file_name=filename,
    original_path=original_storage_path,
)
```

After translated PDF generation succeeds, persist:

```python
translated_storage_path = build_document_storage_path(
    user_id=user_id, doc_id=doc_id, filename=output_pdf_filename
)
await update_document_status(
    doc_id=doc_id,
    status="completed",
    translated_path=translated_storage_path,
    error_message=None,
)
```

- [ ] **Step 5: Keep unavailable errors safe**

For empty, invalid, escaped, or missing stored files, raise:

```python
raise AppError(
    code=ErrorCode.NOT_FOUND,
    message="Document file unavailable",
    status_code=404,
)
```

Use the database filename for original downloads and the canonical translated
basename for translated downloads. Never log or return the stored path.

- [ ] **Step 6: Run focused and affected regressions**

```powershell
.\.venv\Scripts\python.exe -m pytest tests/test_uploads.py tests/test_pdfservice_portable_paths.py tests/test_pdfservice_manual_translation.py tests/test_pdfservice_background_processing.py tests/test_api_contracts_v3.py -q
.\.venv\Scripts\python.exe -m ruff check core/uploads.py pdfserviceMD/service.py tests/test_uploads.py tests/test_pdfservice_portable_paths.py tests/test_pdfservice_manual_translation.py
```

Expected: all pass and API shape is unchanged.

- [ ] **Step 7: Commit Task 2**

```powershell
git add pdfserviceMD/service.py tests/test_pdfservice_manual_translation.py tests/test_pdfservice_portable_paths.py
git diff --cached --check
git commit -m "fix(pdf): use portable document references"
```

Stage `tests/test_pdfservice_background_processing.py` only if a narrowly required
fixture changes, and record the reason.

---

### Task 3: Add the explicit dry-run/apply Supabase migration

**Repository:** `D:\flutterserver\pdftopng`

**Files:**
- Modify: `pdfserviceMD/repository.py`
- Create: `scripts/migrate_document_paths.py`
- Create: `tests/test_migrate_document_paths.py`
- Modify: `tests/test_pdfservice_repository.py`

**Interfaces:**
- Consumes: Task 1 `normalize_document_storage_path(...)`.
- Produces: `list_document_path_rows(*, offset: int, limit: int) -> list[dict]`.
- Produces: `update_owned_document_paths(*, doc_id: str, user_id: str, paths: dict[str, str]) -> None`.
- Produces: `migrate_document_paths(*, apply: bool, batch_size: int = 100) -> MigrationSummary`.
- CLI: `python scripts/migrate_document_paths.py [--apply] [--batch-size 100]`.

- [ ] **Step 1: Add failing repository scope tests**

In `tests/test_pdfservice_repository.py`, add:

```python
@pytest.mark.asyncio
async def test_update_owned_document_paths_scopes_by_document_and_user() -> None:
    seen: list[tuple[str, object]] = []

    class Query:
        def update(self, payload: dict[str, str]):
            seen.append(("payload", payload))
            return self

        def eq(self, field: str, value: str):
            seen.append((field, value))
            return self

        def execute(self):
            return SimpleNamespace(data=[])

    class Client:
        def table(self, name: str):
            assert name == "documents"
            return Query()

    async def fake_execute(*, handler, **_):
        return handler(Client())

    with patch(
        "pdfserviceMD.repository.execute_supabase_operation",
        new=AsyncMock(side_effect=fake_execute),
    ):
        await update_owned_document_paths(
            doc_id="doc-1",
            user_id="user-1",
            paths={"original_path": "uploads/user-1/doc-1/paper.pdf"},
        )

    assert seen == [
        ("payload", {"original_path": "uploads/user-1/doc-1/paper.pdf"}),
        ("id", "doc-1"),
        ("user_id", "user-1"),
    ]
```

Add a pagination test asserting
`list_document_path_rows(offset=100, limit=100)` selects exactly
`id,user_id,original_path,translated_path`, orders by `id`, and uses
`range(100, 199)`.

- [ ] **Step 2: Add failing migration behavior tests**

Create `tests/test_migrate_document_paths.py`:

```python
@pytest.mark.asyncio
async def test_dry_run_classifies_without_writes(capsys) -> None:
    rows = [{
        "id": "doc-1",
        "user_id": "user-1",
        "original_path": r"uploads\user-1\doc-1\paper.pdf",
        "translated_path": None,
    }]
    with (
        patch(
            "scripts.migrate_document_paths.list_document_path_rows",
            new=AsyncMock(side_effect=[rows, []]),
        ),
        patch(
            "scripts.migrate_document_paths.update_owned_document_paths",
            new=AsyncMock(),
        ) as update,
    ):
        summary = await migrate_document_paths(apply=False, batch_size=100)

    assert summary.changed_fields == 1
    assert summary.applied_fields == 0
    update.assert_not_awaited()
    output = capsys.readouterr().out
    assert "doc-1 original_path convertible" in output
    assert "user-1" not in output
    assert "paper.pdf" not in output
    assert "uploads" not in output


@pytest.mark.asyncio
async def test_apply_updates_only_convertible_fields() -> None:
    legacy = {
        "id": "doc-1",
        "user_id": "user-1",
        "original_path": r"uploads\user-1\doc-1\paper.pdf",
        "translated_path": "uploads/user-1/doc-1/translated_paper.pdf",
    }
    update = AsyncMock()
    with (
        patch(
            "scripts.migrate_document_paths.list_document_path_rows",
            new=AsyncMock(side_effect=[[legacy], []]),
        ),
        patch(
            "scripts.migrate_document_paths.update_owned_document_paths",
            new=update,
        ),
    ):
        summary = await migrate_document_paths(apply=True, batch_size=100)

    update.assert_awaited_once_with(
        doc_id="doc-1",
        user_id="user-1",
        paths={"original_path": "uploads/user-1/doc-1/paper.pdf"},
    )
    assert summary.applied_fields == 1
```

Also test nulls, already portable values, unsupported absolute Windows paths,
cross-document paths, batch size, and a second all-portable run with zero pending
fields.

- [ ] **Step 3: Run tests and verify RED**

```powershell
.\.venv\Scripts\python.exe -m pytest tests/test_pdfservice_repository.py tests/test_migrate_document_paths.py -q
```

Expected: imports fail for the new repository functions and migration module.

- [ ] **Step 4: Implement bounded repository helpers**

Add to `pdfserviceMD/repository.py`:

```python
async def list_document_path_rows(
    *, offset: int, limit: int
) -> list[dict]:
    response = await execute_supabase_operation(
        operation="list_document_path_rows",
        failure_message="Failed to retrieve document paths",
        handler=lambda client: client.table("documents")
        .select("id,user_id,original_path,translated_path")
        .order("id")
        .range(offset, offset + limit - 1)
        .execute(),
    )
    return response.data or []


async def update_owned_document_paths(
    *, doc_id: str, user_id: str, paths: dict[str, str]
) -> None:
    allowed = {"original_path", "translated_path"}
    if not paths or not set(paths).issubset(allowed):
        raise ValueError("paths must contain document path fields")
    await execute_supabase_operation(
        operation="update_owned_document_paths",
        failure_message="Failed to update document paths",
        handler=lambda client: client.table("documents")
        .update(paths)
        .eq("id", doc_id)
        .eq("user_id", user_id)
        .execute(),
    )
```

- [ ] **Step 5: Implement classifier, migration, and CLI**

In `scripts/migrate_document_paths.py`:

- define frozen `MigrationSummary` with `scanned_rows`, `changed_fields`,
  `applied_fields`, `unchanged_fields`, and `rejected_fields`;
- process only `original_path` and `translated_path`;
- call `normalize_document_storage_path(...)`;
- classify `normalized == stored` as unchanged and `ValueError` as rejected;
- perform at most one scoped update per row;
- output only `<doc-id> <field> <classification>`;
- use `asyncio.run` and argparse;
- default batch size to 100 and accept only 1–1000;
- return nonzero on Supabase errors.

The apply branch is:

```python
if apply and pending:
    await update_owned_document_paths(
        doc_id=doc_id,
        user_id=user_id,
        paths=pending,
    )
    applied_fields += len(pending)
```

- [ ] **Step 6: Run tests, CLI help, and Ruff**

```powershell
.\.venv\Scripts\python.exe -m pytest tests/test_uploads.py tests/test_pdfservice_repository.py tests/test_migrate_document_paths.py -q
.\.venv\Scripts\python.exe scripts/migrate_document_paths.py --help
.\.venv\Scripts\python.exe -m ruff check core/uploads.py pdfserviceMD/repository.py scripts/migrate_document_paths.py tests/test_migrate_document_paths.py tests/test_pdfservice_repository.py
```

Expected: all pass and help documents `--apply`/`--batch-size`. Do not run
`--apply` against real Supabase during implementation.

- [ ] **Step 7: Commit Task 3**

```powershell
git add pdfserviceMD/repository.py scripts/migrate_document_paths.py tests/test_migrate_document_paths.py tests/test_pdfservice_repository.py
git diff --cached --check
git commit -m "feat(storage): migrate legacy document paths"
```

---

### Task 4: Show status-specific Source Viewer errors and request IDs

**Repository:** `D:\flutterserver\Multimodal_RAG_System`

**Files:**
- Modify: `src/services/api.ts`
- Modify: `src/services/api.interceptor.test.ts`
- Modify: `src/components/evidence/SourceViewerOverlay.tsx`
- Modify: `src/components/evidence/SourceViewerOverlay.test.tsx`

**Interfaces:**
- Consumes: backend `X-Request-ID` response header.
- Produces: `new ApiError(message: string, status?: number, requestId?: string)`.
- Preserves: `downloadPdf(...) -> Promise<Blob>` and Source Viewer props.

- [ ] **Step 1: Add a failing blob-download request-ID test**

```typescript
it('preserves request ID from a failed PDF blob response', async () => {
  await expect(
    responseRejected({
      response: {
        status: 404,
        data: new Blob(
          [JSON.stringify({ error: { message: 'Document file unavailable' } })],
          { type: 'application/json' },
        ),
        headers: new AxiosHeaders({ 'x-request-id': 'req-pdf-404' }),
      },
      message: 'Request failed with status code 404',
    }),
  ).rejects.toMatchObject({
    name: 'ApiError',
    status: 404,
    requestId: 'req-pdf-404',
  });
});
```

- [ ] **Step 2: Add failing Source Viewer copy tests**

```typescript
it.each([403, 404])(
  'shows safe unavailable copy and request ID for %s',
  async (status) => {
    vi.mocked(downloadPdf).mockRejectedValueOnce(
      Object.assign(new Error('hidden backend detail'), {
        status,
        requestId: 'req-pdf-missing',
      }),
    );
    renderViewer({ quote: 'Keep this quote visible.' });

    expect(
      await screen.findByText('找不到 PDF，或目前帳號無權存取。'),
    ).toBeInTheDocument();
    expect(screen.getByText('Request ID: req-pdf-missing')).toBeInTheDocument();
    expect(screen.getByText('Keep this quote visible.')).toBeInTheDocument();
    expect(screen.queryByText('hidden backend detail')).not.toBeInTheDocument();
  },
);

it('shows rate-limit copy without inventing a request ID', async () => {
  vi.mocked(downloadPdf).mockRejectedValueOnce(
    Object.assign(new Error('Too many requests'), { status: 429 }),
  );
  renderViewer();
  expect(
    await screen.findByText('PDF 請求過於頻繁，請稍後再試。'),
  ).toBeInTheDocument();
  expect(screen.queryByText(/Request ID:/)).not.toBeInTheDocument();
});
```

Keep the existing 401, quote-preservation, and renderer-failure tests.

- [ ] **Step 3: Run tests and verify RED**

```powershell
npx vitest run src/services/api.interceptor.test.ts src/components/evidence/SourceViewerOverlay.test.tsx
```

Expected: `ApiError` lacks `requestId` and non-401 failures are still generic.

- [ ] **Step 4: Extend ApiError without parsing Blob bodies**

```typescript
export class ApiError extends Error {
  readonly status: number | undefined;
  readonly requestId: string | undefined;

  constructor(message: string, status?: number, requestId?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.requestId = requestId;
  }
}
```

In the response interceptor:

```typescript
const requestIdValue = error.response?.headers?.['x-request-id'];
const requestId =
  typeof requestIdValue === 'string' && requestIdValue.length > 0
    ? requestIdValue
    : undefined;
throw new ApiError(message, status, requestId);
```

Do not decode the JSON error Blob.

- [ ] **Step 5: Store structured viewer failure state**

```typescript
type PdfDownloadFailure = {
  message: string;
  requestId?: string;
};

function describePdfDownloadFailure(error: unknown): PdfDownloadFailure {
  const value =
    typeof error === 'object' && error !== null
      ? (error as { status?: number; requestId?: string })
      : {};
  const message =
    value.status === 401
      ? '登入狀態已失效，請重新登入。'
      : value.status === 403 || value.status === 404
        ? '找不到 PDF，或目前帳號無權存取。'
        : value.status === 429
          ? 'PDF 請求過於頻繁，請稍後再試。'
          : '無法載入 PDF。';
  return {
    message,
    requestId:
      typeof value.requestId === 'string' && value.requestId
        ? value.requestId
        : undefined,
  };
}
```

Render `Request ID: <value>` only when present. Keep evidence content outside the
download-error conditional and preserve `PDF 預覽載入失敗` separately.

- [ ] **Step 6: Run focused and production gates**

```powershell
npx vitest run src/services/api.interceptor.test.ts src/services/pdfApi.test.ts src/components/evidence/SourceViewerOverlay.test.tsx src/components/evidence/LazySourceViewerBoundary.test.tsx
npx tsc --noEmit
npm run lint:ci
npm run build
```

Expected: tests, TypeScript, zero-warning lint, and build pass. An existing Vite
large-chunk advisory is acceptable.

- [ ] **Step 7: Commit Task 4**

```powershell
git add src/services/api.ts src/services/api.interceptor.test.ts src/components/evidence/SourceViewerOverlay.tsx src/components/evidence/SourceViewerOverlay.test.tsx
git diff --cached --check
git commit -m "fix(evidence): explain PDF download failures"
```

---

### Task 5: Run cross-stack acceptance and prepare the operator migration

**Repositories:** both backend and frontend

**Files:** Verification only. The later `--apply` command writes Supabase document
metadata and requires explicit operator approval.

- [ ] **Step 1: Run the full backend gate**

From `D:\flutterserver\pdftopng`:

```powershell
.\.venv\Scripts\python.exe -m pytest -q
.\.venv\Scripts\python.exe -m ruff check .
.\.venv\Scripts\python.exe scripts/sync_openapi_artifacts.py --check
```

Expected: all pass and OpenAPI has no changes.

- [ ] **Step 2: Run the full frontend gate**

From `D:\flutterserver\Multimodal_RAG_System`:

```powershell
npm test -- --run
npm run lint:ci
npx tsc --noEmit
npm run test:scripts
npm run contract:check -- --backend ..\pdftopng
npm run docs:check
npm run docs:links
npm run build
```

Expected: every command exits zero and contract check passes without repinning.

- [ ] **Step 3: Build and validate Docker**

From `D:\flutterserver` on the deployment host:

```powershell
docker compose build backend frontend
docker compose up -d
docker compose ps
curl.exe -f http://127.0.0.1:8000/health/ready
curl.exe -f http://127.0.0.1:3000/health/ready
```

Expected: backend is healthy, frontend starts after readiness, port 3000 proxies
health, and backend 8000 remains loopback-only.

- [ ] **Step 4: Run migration dry-run**

```powershell
docker compose exec backend python scripts/migrate_document_paths.py
```

Expected: exit zero with scanned, convertible, unchanged, and rejected counts.
Review every rejected classification before writes.

- [ ] **Step 5: Apply only after backup and explicit approval**

After confirming a current Supabase backup and recording dry-run counts:

```powershell
docker compose exec backend python scripts/migrate_document_paths.py --apply
docker compose exec backend python scripts/migrate_document_paths.py
```

Expected: apply succeeds and the second dry-run reports zero convertible fields.
An implementation agent must not execute this production mutation automatically.

- [ ] **Step 6: Perform the affected Graph PDF smoke test**

1. Open the node citing `3005_paperAFATN.pdf`.
2. Select verified evidence and **Open source**.
3. Confirm the PDF renders at the cited page and the quote stays visible.
4. In a safe environment, test a known unavailable document and confirm 403/404
   copy includes a request ID but no filesystem path.
5. Correlate that ID with the backend `request_complete` log.

- [ ] **Step 7: Confirm repository cleanliness**

```powershell
git -C D:\flutterserver\pdftopng status --short
git -C D:\flutterserver\Multimodal_RAG_System status --short
```

Expected: no uncommitted Task 1–4 source changes; unrelated files remain untouched.

## Completion Criteria

- `3005_paperAFATN.pdf` opens from Graph evidence in Linux Docker.
- Safe legacy relative Windows paths work before migration.
- New original and translated records use canonical `/` references.
- Migration is bounded, scoped, idempotent, manual, and dry-run by default.
- Unsafe paths fail closed.
- Source Viewer distinguishes auth, unavailable, rate-limit, generic download,
  and renderer failures.
- Request IDs correlate errors without exposing filesystem paths.
- Full backend/frontend gates and contract check pass.
