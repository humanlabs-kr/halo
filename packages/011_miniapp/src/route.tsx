import App from "./App";
import Home from "./pages/Home";
import Login from "./pages/Login";
import { useWorldAuthStore } from "./utils/state/use-world-auth-store";
import { Navigate, Route, Routes } from "react-router";
import CameraScan from "./pages/CameraScan";
import History from "./pages/History";
import Onboarding from "./pages/Onboarding";
import Rewards from "./pages/Rewards";

export const RouteRoot = () => {
  const { isAuthenticated } = useWorldAuthStore();

  if (isAuthenticated) {
    return (
      <Routes>
        <Route element={<App />}>
          <Route path="home" element={<Home />} />
          <Route path="history" element={<History />} />
          <Route path="rewards" element={<Rewards />} />
        </Route>
        <Route path="onboarding" element={<Onboarding />} />
        <Route path="camera-scan" element={<CameraScan />} />
        <Route path="*" element={<Navigate to="/home" replace />} />
      </Routes>
    );
  } else {
    return (
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    );
  }
};
