# Configuration Guide: Multimodal RAG System

This guide outlines how to configure, run, and build the Multimodal RAG System frontend.

## 1. Prerequisites

Ensure you have the following installed on your system:
- **Node.js**: (LTS version recommended, e.g., v18 or v20)
- **npm** or **yarn**: Package manager.

## 2. Environment Setup

The application relies on environment variables for API connections and authentication.

1.  **Create the Environment File:**
    Duplicate the `.env.example` file and name it `.env` in the project root.

    ```bash
    cp .env.example .env
    ```

2.  **Configure Variables:**
    Open `.env` and fill in the required values:

    ```env
    # Supabase Configuration (Required for Auth)
    VITE_SUPABASE_URL=your_supabase_project_url
    VITE_SUPABASE_ANON_KEY=your_supabase_anon_public_key

    # Backend API Configuration
    # Points to your Python/FastAPI backend
    VITE_API_BASE_URL=http://127.0.0.1:8000
    ```

    *   `VITE_SUPABASE_URL`: Your unique Supabase project URL.
    *   `VITE_SUPABASE_ANON_KEY`: The public anonymous key for your Supabase project.
    *   `VITE_API_BASE_URL`: The URL where your backend API is running. Default is usually `http://127.0.0.1:8000` for local development.

## 3. Installation

Install the project dependencies using npm:

```bash
npm install
```

## 4. Development

To start the local development server with Hot Module Replacement (HMR):

```bash
npm run dev
```

- The application will usually be available at `http://localhost:5173`.
- The backend API (`VITE_API_BASE_URL`) must be running separately for full functionality (login, chat, etc.).

## 5. Building for Production

To create a production-ready build:

```bash
npm run build
```

- This command runs TypeScript validation (`tsc -b`) and then builds the application using Vite.
- The output will be in the `dist/` directory.
- To preview the production build locally:

```bash
npm run preview
```

## 6. Linting

To run the linter and check for code quality issues:

```bash
npm run lint
```

## 7. Troubleshooting

- **401 Unauthorized Errors:** Check if your `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are correct. Also, ensure the backend API is validating the Supabase token correctly.
- **Connection Refused:** Ensure your backend API is running and `VITE_API_BASE_URL` is pointing to the correct address/port.
- **Dependency Issues:** If `npm install` fails, try deleting `node_modules` and `package-lock.json`, then run `npm install` again.
