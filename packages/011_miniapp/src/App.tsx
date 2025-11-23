import { Outlet, useLocation } from "react-router";
import BottomTab from "./components/BottomTab";
import "./App.css";
import { getSafeAreaInsetsBottom } from "./utils/device";
import { useEffect } from "react";

function App() {
  const location = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  return (
    <div
      className="min-h-screen"
      style={{ paddingBottom: getSafeAreaInsetsBottom() + 64 }}
    >
      <div className="flex-1 overflow-y-auto">
        <Outlet />
      </div>
      <BottomTab />
    </div>
  );
}

export default App;
