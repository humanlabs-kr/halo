/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_PROJECT_ENV: "local" | "staging" | "production";
  readonly VITE_DATABASE_URL: string;
  readonly VITE_POINT_DOMAIN: string;
  readonly VITE_NOTIFICATION_DOMAIN: string;
  readonly VITE_API_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
