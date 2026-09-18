import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import { QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { WagmiProvider } from 'wagmi';
import App from '@/App';
import { queryClient } from '@/lib/api/query-instance';
import { IS_DEV } from '@/lib/env';
import { getWagmiConfig } from '@/lib/wagmi';
import '@/lib/i18n';
import '@/index.css';

// Mini apps run inside a wallet webview with no devtools. eruda is an on-screen
// console; the dynamic import keeps it out of the production bundle entirely.
if (IS_DEV) {
  // Optional: a failed load (offline, blocked) must not take the app with it.
  void import('eruda')
    .then(({ default: eruda }) => eruda.init())
    .catch(() => {});
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <WagmiProvider config={getWagmiConfig()}>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <App />
          <Toaster position="top-center" />
        </BrowserRouter>
      </QueryClientProvider>
    </WagmiProvider>
  </StrictMode>,
);
