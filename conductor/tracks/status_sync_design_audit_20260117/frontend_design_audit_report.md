# Frontend Design Audit Report

## Executive Summary
The current application uses a clean, functional "Horizon UI" style based on Chakra UI. While competent, it lacks unique character and visual depth. The "Deep Research" and "Knowledge Graph" features are visually utilitarian and do not convey the sophistication of the underlying AI.

**Recommended Aesthetic Direction:** "Professional Data Command Center"
- **Keywords:** Precision, Depth, Glassmorphism (subtle), Data-Rich.
- **Palette:** Refine the "Horizon Blue" to be slightly more electric. Use darker, richer backgrounds for contrast.
- **Motion:** Orchestrated entrance animations for data streams.

## 1. Global Theme & Layout
### Findings
- **Color Palette:** The `brand.500` (#4318FF) is a standard corporate blue. The dark mode background (#0B1437) is a good deep navy.
- **Typography:** `DM Sans` is a safe, modern choice. `Noto Sans TC` handles Chinese well.
- **Spacing/Radius:** Cards use `24px` radius (very round), while other elements vary.
- **Consistency:** Shadows are light and diffuse.

### Recommendations
- **Refine Dark Mode:** Add subtle gradients to the dark background to create depth, rather than a flat navy color.
- **Typography Hierarchy:** Increase weight contrast. Make headers bolder and tracking slightly tighter for a "technical" feel.
- **Glassmorphism:** Apply backdrop-filter blur to the Sidebar and Sticky Header to contextualize them as overlays.

## 2. Complex Component UX

### Deep Research Panel (`DeepResearchPanel.tsx`)
**Status:** Functional list of checkboxes and progress bars.
**Issues:**
- Visual hierarchy is flat. Everything looks like a form input.
- "Research Plan" looks like a simple todo list.
- Result display is a massive text block inside a collapsible.

**Recommendations:**
- **Visual Timeline:** Transform the progress list into a vertical "Research Timeline" with connecting lines and pulsating active states.
- **Result Presentation:** Break down the "Detailed Answer" into structured cards (Key Findings, Evidence, Synthesis) rather than one Markdown block.
- **Plan Visualization:** Use a tree or flow diagram (even a simple CSS one) to show how sub-tasks relate to the main goal.

### Knowledge Graph (`KnowledgeGraph.tsx`)
**Status:** Uses `react-force-graph-2d`. Fixed dimensions (800x600).
**Issues:**
- Not responsive.
- Loading state is a generic spinner.
- Empty state is text-only.

**Recommendations:**
- **Responsive Container:** Use a parent `ResizeObserver` to make the canvas fill the available space.
- **Immersive Loading:** Show a "Building Graph..." animation where nodes pop in one by one.
- **Interactive Controls:** Add a floating control panel (Zoom, Filter by Group) on top of the canvas.

### Chat Interface (`Chat.tsx`)
**Status:** Standard bubbles. Floating input bar.
**Issues:**
- "Quick Q&A" vs "Deep Research" tabs feel disconnected.
- Message bubbles are generic.

**Recommendations:**
- **Streamlined Input:** Integrate the mode switcher (Quick/Deep) directly into the input area (like ChatGPT/Claude model selectors) to save header space.
- **Thinking State:** For "Deep Research", show an "Agent Working" widget in the chat stream that expands to show the steps, rather than hiding it in a separate tab or panel.

## 3. Polish & Interaction
### Findings
- **Feedback:** Skeletons were recently added to Chat.
- **Transitions:** Minimal use of `framer-motion`.

### Recommendations
- **Micro-interactions:** Add hover lift effects to all clickable cards.
- **Page Transitions:** Fade in content when switching tabs.
- **Streaming Effect:** Ensure text streams in character-by-character (typewriter effect) for AI responses to feel "alive".

## 4. Implementation Plan (Prioritized)

1.  **Theme Refresh:** Update `theme/index.ts` with refined colors and glassmorphism support.
2.  **Layout Upgrade:** Make Sidebar and Header semi-transparent with blur.
3.  **Graph Responsiveness:** Fix `KnowledgeGraph` dimensions.
4.  **Research UI Overhaul:** Redesign `DeepResearchPanel` to look like a timeline.
