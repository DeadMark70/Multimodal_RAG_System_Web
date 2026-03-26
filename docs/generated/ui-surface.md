# Generated UI Surface

Human-maintained inventory of the current frontend surface.

## Routes

| Route | Page | Main hooks / stores | Main services |
|---|---|---|---|
| `/login` | `Login.tsx` | `AuthProvider` context | `supabase` |
| `/signup` | `Signup.tsx` | `AuthProvider` context | `supabase` |
| `/forgot-password` | `ForgotPassword.tsx` | `AuthProvider` context | `supabase` |
| `/reset-password` | `ResetPassword.tsx` | `AuthProvider` context | `supabase` |
| `/dashboard` | `Dashboard.tsx` | `useDashboardStats` | `statsApi.ts` |
| `/knowledge` | `KnowledgeBase.tsx` | `useDocuments`, `useUploadProgressStore` | `pdfApi.ts` |
| `/chat` | `Chat.tsx` | `useChat`, `useDeepResearch`, `useConversations`, `useSettingsStore`, `useSessionStore` | `ragApi.ts`, `conversationApi.ts` |
| `/experiment` | `Experiment.tsx` | page-local state | `ragApi.ts` |
| `/evaluation` | `EvaluationCenter.tsx` | TanStack Query + evaluation components | `evaluationApi.ts` |
| `/graph-demo` | `GraphDemo.tsx` | `useGraphData`, `useSessionStore` | `graphApi.ts` |

## Shared Stores

- `useSettingsStore`: persisted presets, mode flags, theme, sidebar
- `useSessionStore`: transient session and graph/chat workspace state
- `useUploadProgressStore`: background upload/index progress

## Shared Services

- `api.ts`: auth injection, refresh retry, error normalization
- `networkPolicy.ts`: API target allowlisting
- `conversationApi.ts`: conversation CRUD + messages
- `evaluationApi.ts`: evaluation REST + authenticated SSE
- `graphApi.ts`: graph status/data/maintenance
- `pdfApi.ts`: documents and PDF file actions
- `ragApi.ts`: ask, ask stream, research plan/execute
- `statsApi.ts`: dashboard metrics
