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
