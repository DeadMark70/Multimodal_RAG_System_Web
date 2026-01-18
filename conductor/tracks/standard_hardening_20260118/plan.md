# Implementation Plan: Code Standard Hardening

This plan outlines the steps to implement stricter TypeScript import rules and document dimension robustness standards to prevent recurring bugs.

## Phase 1: Configuration Hardening
- [x] Task: Update TSConfig for Strict Type Syntax
    - [ ] Add `"verbatimModuleSyntax": true` to `compilerOptions` in `tsconfig.app.json`
    - [ ] Verify that `npm run build` still passes (or identify immediate syntax errors)
- [x] Task: Configure ESLint for Consistent Type Imports
    - [ ] Update `eslint.config.js` to include `@typescript-eslint/consistent-type-imports` set to `"error"`
    - [ ] Run `npm run lint` to identify violations
- [ ] Task: Conductor - User Manual Verification 'Configuration Hardening' (Protocol in workflow.md)

## Phase 2: Documentation & Standards
- [x] Task: Update TypeScript Style Guide
    - [x] Add "Type-Only Imports" section to `conductor/code_styleguides/typescript.md`
    - [x] Add "Dimension Robustness" Best Practice section to `conductor/code_styleguides/typescript.md`
- [ ] Task: Conductor - User Manual Verification 'Documentation & Standards' (Protocol in workflow.md)

## Phase 3: Verification & Remediation
- [x] Task: Fix Existing Lint/Type Violations
    - [x] Run `npm run format` (if configured to auto-fix type imports)
    - [x] Manually fix any remaining violations reported by `npm run lint` or `tsc`
- [x] Task: Final Project-Wide Check
    - [x] Run `npm run build` and `npm run test` to ensure no regressions
- [x] Task: Conductor - User Manual Verification 'Verification & Remediation' (Protocol in workflow.md)