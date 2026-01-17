# Plan: Frontend Design Implementation

## Phase 1: Global Theme & Glassmorphism [checkpoint: c1b97dc]
**Goal:** Establish the "Data Command Center" aesthetic and glassmorphism foundations.

- [x] Task: Update Theme Engine (TDD) [b172904]
    - [ ] Write Tests: Verify theme object extensions for new colors and glass variants.
    - [ ] Implement: Update `src/theme/index.ts` with "Data Command Center" palette and typography settings.
- [x] Task: Reusable Glass Components [767a6e4]
    - [ ] Write Tests: Component tests for `GlassCard` and `GlassPane` (checking styles/props).
    - [ ] Implement: Create `src/components/common/GlassCard.tsx` and `GlassPane.tsx` using Chakra UI `sx` props for `backdrop-filter`.
- [x] Task: Layout Overhaul [84ee992]
    - [ ] Write Tests: Snapshots or visual regression tests for Sidebar/Header layout.
    - [ ] Implement: Apply glassmorphism to `src/components/layout/Sidebar.tsx` and the sticky header in `Layout.tsx`.
- [x] Task: Conductor - User Manual Verification 'Global Theme & Glassmorphism' (Protocol in workflow.md)

## Phase 2: Complex Component Redesign [checkpoint: 1a22d5c]
**Goal:** Implement immersive visualizations and streamlined interactions.

- [x] Task: Deep Research Interactive Tree (TDD) [f2ad89d]
    - [x] Write Tests: Unit tests for tree branching logic and node animation states.
    - [x] Implement: Redesign `DeepResearchPanel.tsx` to replace the progress list with an SVG or Canvas-based interactive tree.
- [x] Task: Responsive Knowledge Graph & Controls (TDD) [db49850]
    - [x] Write Tests: Verify `ResizeObserver` logic in `KnowledgeGraph.tsx`.
    - [x] Implement: Update `KnowledgeGraph.tsx` for 100% responsiveness and add floating glass control overlays.
- [x] Task: Integrated Chat Input (TDD) [401e537]
    - [x] Write Tests: Integration tests for mode switching within the input bar.
    - [x] Implement: Refactor `Chat.tsx` to integrate the mode selector into the `Input` group.
- [x] Task: Conductor - User Manual Verification 'Complex Component Redesign' (Protocol in workflow.md)

## Phase 3: Motion & Polish [checkpoint: f14ea87]
**Goal:** Add high-impact animations and interactive feedback.

- [x] Task: Page & Element Motion
    - [x] Write Tests: Verify motion variants and animation triggers.
    - [x] Implement: Add `framer-motion` transitions to page loads, tab switches, and card interactions.
- [x] Task: AI Streaming Typewriter Effect
    - [x] Write Tests: Test text-rendering logic for streaming content.
    - [x] Implement: Update message bubbles to support character-by-character streaming for AI responses.
- [x] Task: Final Polish & Accessibility
    - [x] Write Tests: Contrast ratio checks and performance benchmarking.
    - [x] Implement: Optimize `backdrop-filter` usage and ensure WCAG compliance for text-over-glass.
- [x] Task: Conductor - User Manual Verification 'Motion & Polish' (Protocol in workflow.md)
