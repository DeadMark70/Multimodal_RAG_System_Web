# Implementation Plan: Comprehensive Code Cleanup & Refactor

This plan follows a staged approach to resolve over 400 linting and type errors, ensuring project stability through automated tests and manual verification.

## Phase 1: Batch 1 - Clean Imports & Safety
- [x] Task: Remove Unused Code
    - [x] Run lint and identify all unused variables/imports (`no-unused-vars`).
    - [x] Safely remove or comment out unused variables.
- [x] Task: Finalize Type-Only Imports
    - [x] Manually fix any `consistent-type-imports` errors that auto-fix missed.
- [x] Task: Conductor - User Manual Verification 'Phase 1: Clean Imports' (Protocol in workflow.md)

## Phase 2: Batch 2 - Type Hardening (The "any" Purge)
- [x] Task: Define Core Data Interfaces
    - [x] Review `types/` directory and ensure interfaces exist for Graph, RAG, and API responses.
    - [x] Replace `any` in `src/services/api.ts` and `src/services/supabase.ts`.
- [x] Task: Refactor Component Props and State
    - [x] Replace `any` in complex components like `KnowledgeGraph.tsx` and `ResearchTree.tsx`.
    - [x] Resolve unsafe member access errors by using defined interfaces.
- [x] Task: Conductor - User Manual Verification 'Phase 2: Type Hardening' (Protocol in workflow.md)

## Phase 3: Batch 3 - Async & Promise Safety
- [x] Task: Fix Async Violations in Hooks
    - [x] Resolve "floating promises" in `useChat.ts`, `useConversations.ts`, and `useDocuments.ts`.
    - [x] Ensure all async operations have appropriate `.catch()` or `try/catch` blocks.
- [x] Task: Fix Async Violations in Components
    - [x] Fix `no-misused-promises` in event handlers (e.g., `UploadZone.tsx`, `DocumentSelector.tsx`).
- [x] Task: Conductor - User Manual Verification 'Phase 3: Async Safety' (Protocol in workflow.md)

## Phase 4: Batch 4 - React Correctness & Final Polish
- [x] Task: Fix React Hook Violations
    - [x] Refactor `MessageBubble.tsx` and `MetricsBadge.tsx` to remove conditional Hook calls.
    - [x] Move `CustomTooltip` and other nested components out of render functions (e.g., in `EvaluationRadarChart.tsx`).
- [x] Task: Final Verification
    - [x] Run `npm run lint` to confirm 0 errors/warnings.
    - [x] Run `npm run build` and `npm run test` to ensure 100% pass rate.
- [x] Task: Conductor - User Manual Verification 'Phase 4: Final Polish' (Protocol in workflow.md)