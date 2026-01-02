# Codebase Overview: Multimodal RAG System

## 1. Project Introduction
This project is a **Multimodal RAG (Retrieval-Augmented Generation) System** frontend application. It provides a user interface for interacting with a backend AI system that supports document retrieval, knowledge graph visualization, and deep research capabilities. The application is built with modern React practices, emphasizing performance, interactivity, and clean architecture.

## 2. Tech Stack

### Core Framework
- **Runtime:** React 18
- **Build Tool:** Vite 7 (Fast HMR and bundling)
- **Language:** TypeScript (Strict type checking)

### UI & Styling
- **Component Library:** Chakra UI (Layout and basic components)
- **Styling:** Emotion (CSS-in-JS), Framer Motion (Animations)
- **Icons:** React Icons

### State Management & Data Fetching
- **Global State:** Zustand (Lightweight, transient UI state)
- **Server State:** TanStack Query (React Query) v5 (Caching, synchronization)
- **Context:** React Context API (Authentication state)

### Visualization
- **Charts:** Recharts (Data visualization)
- **Graphs:** React Force Graph 2D (Knowledge graph interaction)
- **Flow Diagrams:** @xyflow/react (React Flow)
- **Markdown:** React Markdown (Rendering LLM responses)

### Network & Auth
- **HTTP Client:** Axios (API requests with interceptors)
- **Authentication:** Supabase Auth (Client-side session management)

## 3. Architecture & Folder Structure

The project follows a feature-based and functional organization within the `src` directory:

### `src/` Directory Breakdown

- **`assets/`**: Static assets (images, SVGs).
- **`components/`**: Reusable UI components, categorized by domain:
    - `charts/`: Visualizations for accuracy and trends.
    - `common/`: Generic UI elements (headers, layout components).
    - `experiment/`: Tools for A/B testing or model comparison.
    - `graph/`: Knowledge graph visualization components (`KnowledgeGraph.tsx`).
    - `rag/`: RAG-specific components (Chat bubbles, Document selectors, Upload zones).
    - `settings/`: Application configuration panels.
- **`contexts/`**: React Context providers.
    - `AuthContext.tsx`: Manages user authentication state via Supabase.
- **`hooks/`**: Custom React hooks for logic reuse.
    - `useChat.ts`: Chat interface logic.
    - `useDocuments.ts`: Document management operations.
    - `useGraphData.ts`: Knowledge graph data fetching and manipulation.
- **`layouts/`**: (Empty/Unused). Layout components are located in `src/components/layout/`.
- **`pages/`**: Main application views (Routes).
    - `Login.tsx`: Authentication entry point.
    - `Dashboard.tsx`: System overview.
    - `Chat.tsx`: Main RAG interface.
    - `KnowledgeBase.tsx`: Document management.
    - `Experiment.tsx`: Testing arena.
    - `GraphDemo.tsx`: Dedicated graph visualization view.
- **`services/`**: API integration layer.
    - `api.ts`: Base Axios instance with auth interceptors and error handling.
    - `supabase.ts`: Supabase client initialization.
    - `*Api.ts`: Feature-specific API endpoints (graph, pdf, rag, stats).
- **`stores/`**: Global state management (Zustand).
    - `useSessionStore.ts`: Manages transient session data (selected nodes, PDF page, chat ID, research mode).
    - `useSettingsStore.ts`: (Likely) Application-wide user preferences.
- **`types/`**: TypeScript type definitions.
    - `rag.ts`: RAG related types (ChatMessage, DocumentItem).
    - `graph.ts`: Graph visualization types (GraphNode, GraphLink).
- **`utils/`**: Helper functions (mock data, export utilities).
- **`views/`**: (Empty/Unused).

## 4. Key Features & Workflows

### Authentication
- Uses **Supabase Auth**.
- `AuthContext` provides user session state application-wide.
- Axios interceptors in `services/api.ts` automatically inject the Supabase `access_token` into headers for backend requests.

### RAG Interaction (Chat)
- Users can interact with the system via `Chat.tsx`.
- Supports "Deep Research" mode (managed in `useSessionStore`), breaking down queries into sub-tasks.
- Visualizes reasoning steps and citations.

### Knowledge Graph
- Visualizes relationships between entities using `react-force-graph-2d`.
- Supports interactive features: zooming, node selection, and camera positioning (state managed in `useSessionStore`).

### Document Management
- Users can upload and manage PDF documents (`KnowledgeBase.tsx`).
- Includes a PDF viewer/selector integration.

## 5. Development Standards
- **Routing:** React Router v7 is installed, but currently implemented using v6-style `Routes` and `Route` components (not using Data Routers yet).
- **Type Safety:** Strict TypeScript usage is encouraged.
- **Linting:** ESLint configured for code quality.
