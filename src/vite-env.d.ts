/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string;
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  readonly VITE_TEST_MODE?: string;
  readonly VITE_MOCK_MODE?: string;
  readonly VITE_TRUSTED_API_HOSTS?: string;
  readonly VITE_TRUSTED_MARKDOWN_HOSTS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
