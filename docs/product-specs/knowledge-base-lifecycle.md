# Knowledge Base Lifecycle

## User Outcomes

- Users can upload PDFs and track processing state.
- Users can open original and translated PDFs through authenticated requests.
- Users can trigger translation for OCR-complete files.
- Users can retry retrieval indexing for `index_failed` documents.
- Users can delete a document and no longer expect it to remain available in chat selection.

## Acceptance Notes

- Mixed-success background processing must be visible through document status and error messaging.
- Retry actions must be discoverable from the document action menu.
- Document actions should not require manual URL crafting or unauthenticated file access.
