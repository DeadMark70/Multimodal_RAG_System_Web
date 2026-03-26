# PRODUCT_SENSE

## Purpose

Describe what users can do from the frontend and where the UI intentionally draws boundaries.

## User-Visible Capabilities

1. Sign in, register, recover passwords, and return to a clean authenticated session.
2. Upload PDFs, monitor processing, open original/translated files, retry indexing, and delete documents.
3. Ask ordinary RAG questions or run multi-step Deep Research with streamed progress and saved conversation state.
4. Inspect graph health, run graph maintenance, retry failed graph extraction, and purge orphan graph residues.
5. Manage evaluation datasets, model presets, campaigns, result analysis, and persisted agent traces.

## Product Boundaries

- The frontend never treats itself as the authorization source of truth; backend authz remains authoritative.
- Graph and evaluation are operational surfaces, not hidden admin-only tooling.
- Official mode presets and stored snapshots matter more than exposing raw low-level flags everywhere.
