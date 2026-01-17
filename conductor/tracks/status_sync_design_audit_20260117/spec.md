# Specification: Project Status Sync & Frontend Design Audit

## Overview
This track aims to bring the project's documentation and specifications up to date with the latest architectural decisions and implemented modules, and to perform a comprehensive design audit of the frontend to enhance its visual appeal and usability.

We will synchronize the `conductor/product.md`, `conductor/tech-stack.md`, and potentially `conductor/workflow.md` with the definitive module guides (PDF, RAG, Image, Multimodal, Graph, Stats, Conversations) and `agentlog/openapi.json`. We will explicitly ignore outdated guides (`backend_implementation_guide`, `frontend_integration_guide_v3`, `optimization_audit.md`, `backend_implementation_guide_20260102.md`).

Simultaneously, we will utilize the `frontend-design` skill to audit the application, focusing on global theming, complex component usability, and interactive polish.

## Functional Requirements

### 1. Documentation Synchronization
- **Source of Truth Analysis:**
    - Analyze `agentlog/openapi.json` for current API contract.
    - Analyze the following specific guides in `checklist/`:
        - `pdfservice_md_guide.md`
        - `database_guide.md` (RAG Database)
        - `image_service_guide.md`
        - `multimodal_rag_guide.md`
        - `graph_rag_guide.md`
        - `stats_guide.md`
        - `conversations_guide.md`
- **Artifact Updates:**
    - Update `conductor/product.md` to reflect the 7-module architecture and their specific capabilities.
    - Update `conductor/tech-stack.md` to ensure all backend services, databases, and AI models mentioned in the guides are listed.
    - Update `conductor/tracks.md` (or creating new planned tracks if gaps are found) to reflect the current implementation state vs. the desired state described in the guides.

### 2. Frontend Design Audit
- **Skill Activation:** Activate and use `frontend-design` to analyze the codebase.
- **Scope:**
    - **Global Theme:** Analyze `src/theme/index.ts` and general layout components for color, typography, and spacing consistency.
    - **Complex Components:** Review `DeepResearchPanel`, `KnowledgeGraph`, and `Chat` interface for usability and visual hierarchy.
    - **Polish:** Identify opportunities for loading skeletons, transitions, and error states.
- **Output:** Produce a `frontend_design_audit_report.md` with actionable recommendations for "optimizing and beautifying" the UI.

## Non-Functional Requirements
- **Accuracy:** The documentation updates must strictly follow the content of the "valid" guides and ignore the "outdated" ones.
- **Aesthetic Quality:** Design recommendations should align with a modern, professional data-centric application (clean, intuitive, responsive).

## Acceptance Criteria
- [ ] `conductor/product.md` accurately describes the 7 core modules.
- [ ] `conductor/tech-stack.md` lists all technologies used in the 7 modules.
- [ ] A new `frontend_design_audit_report.md` is created containing specific, actionable design improvements for Theme, Complex Components, and UI Polish.
- [ ] A summary of "Outdated vs. Current" features is verified against `openapi.json`.

## Out of Scope
- Implementation of the design recommendations (this track is for *Audit* and *Spec/Status Update*. Implementation of design changes will be a separate follow-up track).
