import { cloudflare } from "@cloudflare/vite-plugin";
import { copyLocalesPlugin } from "@hl/lola";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig } from "vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    copyLocalesPlugin({
      targetPath: path.resolve(__dirname, "./public/locales"),
    }),
    react(),
    cloudflare(),
    tailwindcss(),
  ],
  define: {
    global: "globalThis",
    "process.env": {},
  },
  build: {
    commonjsOptions: {
      transformMixedEsModules: true,
    },
  },
  server: {
    allowedHosts: true,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@common": path.resolve(__dirname, "./src/common.ts"),
    },
  },
});
