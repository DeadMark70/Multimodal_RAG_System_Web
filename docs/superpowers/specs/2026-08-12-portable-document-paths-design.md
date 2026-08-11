# Portable Document Paths and PDF Viewer Diagnostics

**Status:** Approved
**Date:** 2026-08-12
**Scope:** `pdftopng` backend, Supabase `documents` metadata, and the shared `Multimodal_RAG_System` Source Viewer

## Objective

Make PDF access work consistently when documents were uploaded on Windows but the
backend later runs in Linux Docker. Preserve compatibility with existing relative
Windows paths, write only portable paths for new files, provide a safe one-time
Supabase migration, and make Source Viewer download failures diagnosable without
exposing server filesystem details.

## Confirmed Root Cause

The affected document exists beneath the mounted upload directory, and its Graph
evidence points to a document owned by the authenticated user. Supabase stores its
`original_path` using Windows separators:

```text
uploads\<user-id>\<document-id>\3005_paperAFATN.pdf
```

The backend runs in Linux Docker with `/app` as its working directory and
`./pdftopng/uploads` mounted at `/app/uploads`. On Linux, `os.path.normpath()` does
not interpret backslashes as directory separators, so `os.path.exists()` checks a
nonexistent filename and the download endpoint returns `404 File not found on
disk`. The frontend collapses this and every other non-401 failure into `無法載入
PDF。`.

## Selected Approach

Use compatibility reads, portable writes, and an explicit one-time migration.

This is preferred over migration-only repair because migration-only does not
prevent a Windows-hosted backend from writing incompatible paths again. Moving all
PDFs into Supabase Storage is out of scope because it would add file transfer,
signed URL, authorization, and rollback work that is unnecessary for this defect.

## Path Contract

### Stored representation

New `documents.original_path` and `documents.translated_path` values are
upload-root-relative POSIX strings:

```text
uploads/<user-id>/<document-id>/<filename>.pdf
```

They are storage references, not host absolute paths. They use `/` on Windows and
Linux and contain no drive letter, UNC prefix, leading slash, `.` segment, or `..`
segment.

### Resolution boundary

Add focused helpers to `core/uploads.py`:

```python
def build_document_storage_path(*, user_id: str, doc_id: str, filename: str) -> str:
    """Return the canonical portable documents-table storage reference."""


def normalize_document_storage_path(
    *, user_id: str, doc_id: str, storage_path: str
) -> str:
    """Validate a portable or legacy relative reference and return canonical POSIX form."""


def resolve_document_storage_path(
    *, user_id: str, doc_id: str, storage_path: str
) -> Path:
    """Resolve a portable or legacy relative Windows reference inside one document root."""
```

The normalizer accepts both canonical `/` paths and legacy relative `\` paths,
validates their components without touching the filesystem, and returns canonical
POSIX form. The resolver calls that normalizer and then resolves the result beneath
the exact document directory. The normalized components must be exactly beneath
`uploads/<user-id>/<document-id>/`, and the resolved candidate must remain beneath
the same document directory.

Reject:

- absolute POSIX, Windows drive, and UNC paths;
- empty, `.`, and `..` components;
- paths for another user or document;
- mixed values that cannot be interpreted as a single upload-root-relative path;
- paths outside the configured upload root after resolution.

Do not return filesystem paths through the API or include them in user-facing
errors and logs.

## Backend Integration

### New uploads and translations

The upload pipeline may continue writing a file through the native `Path` object,
but it persists `build_document_storage_path(...)` instead of `save_path`.
Translation follows the same rule when updating `translated_path`.

### Existing records

Every service boundary that opens a stored original or translated document uses
`resolve_document_storage_path(...)`. This includes:

- PDF download;
- document readiness and availability flags;
- manual translation eligibility and source-file access;
- retry-index and document-folder resolution paths that currently consume
  `original_path` directly.

The public download endpoint and URL remain unchanged:

```http
GET /pdfmd/file/{doc_id}?type=original
```

Document ownership continues to be enforced through the existing `doc_id +
user_id` repository query before path resolution.

## Supabase Migration

Add `scripts/migrate_document_paths.py` as an explicit operator command:

```powershell
python scripts/migrate_document_paths.py
python scripts/migrate_document_paths.py --apply
```

The default is dry-run. It reads `id`, `user_id`, `original_path`, and
`translated_path` from `documents` in bounded batches and classifies each non-null
field as:

- already portable;
- safely convertible legacy relative Windows path;
- invalid or unsupported;
- unchanged because it is empty.

`--apply` updates only safely convertible values and scopes every update by both
document ID and user ID. The script is idempotent: a second dry-run after apply
reports zero pending conversions.

The summary reports scanned rows, changed fields, unchanged fields, and rejected
fields. Per-record output contains only document ID, field name, and classification;
it does not print filenames, user IDs, full paths, prompts, or document content.

Absolute legacy paths are reported as unsupported rather than guessed. They must
be repaired manually because an absolute host path cannot be safely mapped to the
current Docker volume without operator knowledge.

## Source Viewer Diagnostics

Extend the frontend `ApiError` with an optional `requestId`. The response
interceptor obtains it from the `X-Request-ID` response header, which remains
available for blob download failures without decoding an error blob.

The Source Viewer keeps the selected filename, page, provenance, and quote visible
and maps download failures to concise messages:

- `401`: `登入狀態已失效，請重新登入。`
- `403` or `404`: `找不到 PDF，或目前帳號無權存取。`
- `429`: `PDF 請求過於頻繁，請稍後再試。`
- other status or network failure: `無法載入 PDF。`

When a request ID exists, render `Request ID: <value>` below the message so the
operator can correlate it with the backend `request_complete` audit log. Do not
display the backend filesystem error message.

PDF rendering errors remain distinct and continue to use the existing `PDF
預覽載入失敗` state because they occur after a successful download.

## Error Handling and Rollback

- A rejected stored path behaves as unavailable and does not fall back to an
  unscoped filesystem lookup.
- A missing file remains a safe `404`; the response includes the existing request
  ID envelope and header.
- Migration database errors stop the apply run with a nonzero exit code. Already
  completed idempotent updates remain valid and can be safely resumed.
- Deploy backend compatibility reads before applying the migration.
- Rollback does not require reverting migrated `/` values because Python accepts
  forward-slash relative paths on both Windows and Linux. If a wider application
  rollback also restores document metadata, restore the application and database
  snapshot together.

## Testing

### Backend path tests

- canonical `/` storage references resolve beneath the exact document root;
- legacy relative Windows `\` references resolve to the same file;
- another user/document, traversal, absolute drive, UNC, leading slash, and mixed
  malformed paths are rejected;
- new upload and translation records persist portable values;
- PDF download and document readiness succeed for both canonical and legacy
  references;
- missing files and invalid paths return safe errors without exposing paths.

### Migration tests

- dry-run performs no update;
- apply converts `original_path` and `translated_path` independently;
- already portable, null, and unsupported absolute values are not updated;
- updates are scoped by document and user;
- a second run is idempotent;
- output omits user IDs, filenames, and paths.

### Frontend tests

- `ApiError` captures `X-Request-ID` from a failed blob request;
- Source Viewer distinguishes 401, 403/404, 429, and generic failure copy;
- request ID appears only when present;
- evidence quote and page remain visible after a download failure;
- PDF renderer failure remains separate from download failure.

## Deployment Sequence

1. Deploy the backend compatibility resolver and portable-write behavior.
2. Verify `/health/ready` and download one existing legacy-path PDF.
3. Run the migration without `--apply` and review its counts.
4. Take or confirm a current Supabase backup.
5. Run the migration with `--apply`.
6. Run dry-run again and confirm zero pending conversions.
7. Deploy the frontend diagnostics.
8. Open the affected Graph node and verify the PDF, cited page, quote, and request
   ID behavior.

## Non-Goals

- moving PDFs to Supabase Storage or another object store;
- changing Graph evidence, citation, or PDF endpoint contracts;
- automatic database mutation during backend startup;
- rewriting unsupported absolute paths by guessing their upload location;
- adding PDF annotations, caching, or resumable downloads;
- exposing backend filesystem paths or raw exception messages to the browser.

## Acceptance Criteria

- The affected `3005_paperAFATN.pdf` opens from Graph evidence in Linux Docker.
- Existing safe relative Windows paths work before migration.
- New uploads and translations store only portable relative `/` paths.
- Dry-run and apply safely normalize eligible Supabase records and are idempotent.
- Invalid or cross-document paths cannot escape the authorized upload directory.
- Source Viewer displays useful status-specific copy and request ID while retaining
  the selected evidence.
- Focused backend/frontend tests and their existing affected regression suites pass.
