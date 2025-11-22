/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_PROJECT_ENV: "local" | "staging" | "production";
  readonly VITE_RPC_URL: string;
  readonly VITE_WORLD_APP_ID: string;
  readonly VITE_API_URL: string;
}

declare global {
  interface ImportMeta {
    readonly env: ImportMetaEnv;
  }
}
