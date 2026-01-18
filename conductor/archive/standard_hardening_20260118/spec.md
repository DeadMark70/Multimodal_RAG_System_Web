# Specification: Code Standard Hardening (Import Types & Dimension Robustness)

**Track ID**: `standard_hardening_20260118`
**Type**: Chore / Standard Update
**Status**: Draft

## 1. Overview
This track aims to codify the lessons learned from recent critical bugs:
1. **White Screen Bug**: Caused by non-type-only imports of TypeScript types in an ESM/Vite environment.
2. **Invisible Component Bug**: Caused by components relying on parent height (`h="full"`) without fallback or explicit prop support, especially in Canvas-based visualizations.

By updating our `tsconfig`, `eslint` configurations, and `typescript.md` style guide, we will prevent these issues from recurring.

## 2. Functional Requirements

### 2.1 Configuration Hardening
- **TSConfig**: Enable `verbatimModuleSyntax: true` in `tsconfig.app.json` to enforce correct type-only import/export usage at the compiler level.
- **ESLint**: Add and configure `@typescript-eslint/consistent-type-imports` with the level set to `"error"`.

### 2.2 Documentation Updates
- **TypeScript Style Guide (`conductor/code_styleguides/typescript.md`)**:
    - Add a section on **Type-Only Imports**, explaining *why* it's required for Vite/ESM and providing code examples.
    - Add a **Best Practice** section for "Dimension Robustness" in UI components:
        - Pattern: `ResizeObserver` + Optional Props (`width`/`height`) + Safe Fallbacks.
        - Guideline: Avoid relying solely on `h="full"` for Canvas/SVG containers.

## 3. Acceptance Criteria
- [ ] `tsconfig.app.json` includes `"verbatimModuleSyntax": true`.
- [ ] `eslint.config.js` (or applicable ESLint config) triggers a lint error when a type is imported without the `type` keyword.
- [ ] `conductor/code_styleguides/typescript.md` contains the new standards with clear "Do/Don't" examples.
- [ ] Running `npm run lint` on the current project identifies any existing violations (to be fixed as part of this track).

## 4. Out of Scope
- Global refactoring of every component's layout logic (only the standard and documentation are being updated, plus fixing immediate lint errors).