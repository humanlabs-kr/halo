// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
import { defineConfig } from "orval";

const baseUrl = process.env.VITE_API_URL;

export default defineConfig({
  reactQuery: {
    input: `${baseUrl}/api/openapi.json`,
    output: {
      target: "./src/lib/generated/react-query.ts",
      client: "react-query",
      override: {
        mutator: {
          path: "./src/lib/react-query-client.ts",
          name: "customInstance",
        },
        query: {
          shouldExportHttpClient: false,
          useQuery: true,
          shouldExportQueryKey: true,
          useMutation: true,
          useInfinite: false,
        },
        useDates: true,
      },
    },
    hooks: {
      afterAllFilesWrite:
        "npx prettier --write --ignore-path .prettierignore ./src/lib/generated/react-query.ts",
    },
  },
  ssr: {
    input: `${baseUrl}/api/openapi.json`,
    output: {
      target: "./src/lib/generated/fetch.ts",
      client: "fetch",
      override: {
        mutator: {
          path: "./src/lib/fetch-client.ts",
          name: "customFetch",
        },
        requestOptions: true,
      },
    },
    hooks: {
      afterAllFilesWrite:
        "npx prettier --write --ignore-path .prettierignore ./src/lib/generated/fetch.ts",
    },
  },
});
