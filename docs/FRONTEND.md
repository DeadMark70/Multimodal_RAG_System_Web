# FRONTEND

## Stack

- React 18 + TypeScript + Vite
- Zustand + TanStack Query
- Chakra UI + Framer Motion
- Axios + Supabase Auth session
- Vitest + Testing Library

## Frontend Architecture

- Routes and shell: `src/App.tsx`, `src/main.tsx`
- Service layer: `src/services/`
- Domain hooks: `src/hooks/`
- Global state: `src/stores/`
- Feature UI: `src/components/` and `src/pages/`

## Evaluation Frontend

### Phase 1 delivered

- `src/pages/EvaluationCenter.tsx`: evaluation route shell and tab layout
- `src/components/evaluation/TestCaseManager.tsx`: CRUD, filtering, import/export UI
- `src/components/evaluation/ModelConfigPanel.tsx`: model discovery, parameter editing, preset save flow
- `src/services/evaluationApi.ts`: Phase 1 evaluation REST client
- Focused UI and service coverage for evaluation setup flows

### Phase 2 delivered

- `src/components/evaluation/CampaignRunner.tsx`: mode selection, question selection, preset-driven execution, progress panel
- `src/services/evaluationApi.ts`: authenticated SSE stream client for campaign progress and reconnect
- `src/types/evaluation.ts`: campaign config, status, result, and SSE event typings
- `src/pages/EvaluationCenter.tsx`: Phase 2 tab is enabled and integrated into the evaluation center

### Runtime behavior

- Campaign runner only starts from saved model presets
- SSE uses authenticated `fetch` stream parsing instead of browser `EventSource`
- Progress and history recover from backend snapshots after reconnect

### Focused verification

- `src/services/evaluationApi.test.ts`
- `src/components/evaluation/CampaignRunner.test.tsx`
- `src/pages/EvaluationCenter.ui.test.tsx`
- `npx tsc --noEmit`

## State Model

- Persistent settings: `useSettingsStore`
- Session/transient interactions: `useSessionStore`
- Async query cache: TanStack Query client in `App.tsx`

## Performance Rules

1. Use selector-based Zustand subscriptions.
2. Avoid broad store reads in large render trees.
3. Keep SSE loops cooperative and cheap.
4. Avoid repeated large object writes during progress updates.

## Accessibility Baseline

1. Every icon-only control has `aria-label`.
2. Dialogs include title and description.
3. Keyboard navigation must work for table rows and menus.
