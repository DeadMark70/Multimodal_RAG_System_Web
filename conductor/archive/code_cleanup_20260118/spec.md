# Specification: Comprehensive Code Cleanup & Refactor

**Track ID**: `code_cleanup_20260118`
**Type**: Refactor / Chore
**Status**: Draft

## 1. Overview
Following the enforcement of stricter TypeScript and ESLint rules, the project now reports over 400 linting and type errors. This track aims to systematically resolve these errors to reach a "Zero Warning/Error" state, improving code quality, type safety, and runtime reliability.

## 2. Functional Requirements

### 2.1 Staged Remediation Batches
The cleanup will be executed in the following logical batches:
1. **Batch 1: Low-Hanging Fruit & Safety**: Remove unused imports/variables and convert remaining type-only imports missed by auto-fix.
2. **Batch 2: Type Hardening**: Replace `any` usages and fix unsafe member access, focusing on core services (`api.ts`, `supabase.ts`) and data types.
3. **Batch 3: Promise & Async Safety**: Resolve "misused promises," "floating promises," and ensure proper `await` usage in async functions.
4. **Batch 4: React & Hook Correctness**: Fix React Hooks rule violations (conditional calls) and move component declarations out of render functions (e.g., in `EvaluationRadarChart.tsx`).

### 2.2 Typing Standard
- **No `any`**: All `any` types must be replaced with concrete interfaces or `unknown` where appropriate.
- **Strict Casting**: Avoid `as any`. Use proper type guards or intermediate `unknown` casting only if absolutely necessary.

## 3. Acceptance Criteria
- [ ] `npm run lint` returns 0 errors and 0 warnings.
- [ ] `npm run build` (TSC + Vite build) passes successfully.
- [ ] `npm run test` passes with all existing tests intact.
- [ ] Manual visual verification confirms that primary features (Dashboard, Knowledge Graph, Chat) render and function correctly.

## 4. Out of Scope
- Adding new features or changing existing UI behavior.
- Performance optimizations that are not directly related to fixing a lint error.