import { lazy, Suspense, useEffect } from 'react';
import { Navigate, Route, Routes } from 'react-router';
import AppLayout from '@/components/AppLayout';
import { getAuthAdapter } from '@/lib/auth/adapter';
import { useAuthStore } from '@/stores/auth';

// Every page is its own chunk. The login screen is the only thing most first
// visits need, and the scanner pulls in the camera stack it alone uses.
const CameraScan = lazy(() => import('@/pages/CameraScan'));
const EventHaloMini = lazy(() => import('@/pages/EventHaloMini'));
const History = lazy(() => import('@/pages/History'));
const HistoryDetail = lazy(() => import('@/pages/HistoryDetail'));
const Home = lazy(() => import('@/pages/Home'));
const Login = lazy(() => import('@/pages/Login'));
const Onboarding = lazy(() => import('@/pages/Onboarding'));
const Payouts = lazy(() => import('@/pages/Payouts'));
const PointLogs = lazy(() => import('@/pages/PointLogs'));
const Privacy = lazy(() => import('@/pages/Privacy'));
const RaffleHistory = lazy(() => import('@/pages/RaffleHistory'));
const Rewards = lazy(() => import('@/pages/Rewards'));
const Terms = lazy(() => import('@/pages/Terms'));
const VerifyEmail = lazy(() => import('@/pages/VerifyEmail'));

function RouteFallback() {
  return <div className="min-h-screen bg-white" />;
}

export default function App() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const platform = useAuthStore((s) => s.platform);
  const checkSession = useAuthStore((s) => s.checkSession);

  // Boot the platform SDK and re-validate the cookie session. The store
  // persists `isAuthenticated` so the app can render immediately; this
  // confirms it against the server and signs the user out if it expired.
  useEffect(() => {
    if (!platform) return;
    void getAuthAdapter(platform)
      .init()
      .catch(() => {
        // A wallet SDK that will not start is reported when the user tries to
        // sign in; it must not block the app from rendering.
      });
    void checkSession();
  }, [platform, checkSession]);

  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        {/* Reachable signed out — store review and shared links need them. */}
        <Route path="/terms" element={<Terms />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/payouts" element={<Payouts />} />
        <Route path="/onboarding" element={<Onboarding />} />

        {isAuthenticated ? (
          <>
            <Route element={<AppLayout />}>
              <Route path="/home" element={<Home />} />
              <Route path="/history" element={<History />} />
              <Route path="/history/:receiptId" element={<HistoryDetail />} />
              <Route path="/rewards" element={<Rewards />} />
              <Route path="/raffle-history" element={<RaffleHistory />} />
              <Route path="/point-logs" element={<PointLogs />} />
              <Route path="/verify-email" element={<VerifyEmail />} />
            </Route>
            {/* Full-screen, outside the tab shell. */}
            <Route path="/camera-scan" element={<CameraScan />} />
            <Route path="/event/halo-mini" element={<EventHaloMini />} />
            <Route path="*" element={<Navigate to="/home" replace />} />
          </>
        ) : (
          <>
            <Route path="/" element={<Login />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </>
        )}
      </Routes>
    </Suspense>
  );
}
