import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";
import "./index.css";
import "./App.css";
import "./utils/state/initialize-state";
import { NuqsAdapter } from "nuqs/adapters/react-router/v7";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { Toaster } from "react-hot-toast";
import { postAuthSessionRevoke } from "./lib/generated/fetch.ts";
import { callApi } from "./lib/fetch-client.ts";
import { RouteRoot } from "./route.tsx";
import i18n from "./utils/i18n.ts";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

if (import.meta.env.VITE_PROJECT_ENV !== "production") {
  import("eruda").then((eruda) => {
    const erudaInstance = eruda.default;

    erudaInstance.init();
    const snippets = erudaInstance.get("snippets");
    snippets.clear();
    snippets.add(
      "Logout",
      () => {
        callApi(postAuthSessionRevoke).then(() => {
          location.reload();
        });
      },
      "Logout from current auth session"
    );
    snippets.add(
      "Change language",
      () => {
        i18n.changeLanguage(i18n.language === "en-US" ? "ko-KR" : "en-US");
      },
      "Change language to English or Korean"
    );
  });
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <NuqsAdapter>
        <BrowserRouter>
          <RouteRoot />
          <Toaster position="top-center" />
        </BrowserRouter>
      </NuqsAdapter>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  </StrictMode>
);
