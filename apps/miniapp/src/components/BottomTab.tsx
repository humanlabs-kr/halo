import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { sendSelectionHaptic } from "@/lib/haptic";
import { getSafeAreaInsetBottom } from "@/lib/safe-area";

type TabPath = "/history" | "/home" | "/rewards";

function BottomTab() {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const bottomInset = getSafeAreaInsetBottom();
  const [activeTab, setActiveTab] = useState<TabPath>("/home");
  const tabs = useMemo(
    () =>
      [
        { path: "/history", label: t("L-q1iAiW0f"), icon: "/u_receipt.svg" },
        { path: "/home", label: t("L-oifhdD3L"), icon: "/u_home-alt.svg" },
        { path: "/rewards", label: t("L-42p9Zgx7"), icon: "/u_gift.svg" },
      ] as const,
    [t]
  );

  useEffect(() => {
    const currentPath = location.pathname;
    const matchingTab = tabs.find(
      (tab) =>
        currentPath === tab.path || currentPath.startsWith(`${tab.path}/`)
    );
    if (matchingTab) {
      setActiveTab(matchingTab.path);
    }
  }, [location.pathname, tabs]);

  const handleTabClick = (path: TabPath) => {
    sendSelectionHaptic();
    setActiveTab(path);
    navigate(path);
  };

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-slate-200 bg-white/95 backdrop-blur"
      style={{ paddingBottom: bottomInset }}
    >
      <div className="mx-auto flex max-w-[420px] items-stretch justify-between">
        {tabs.map(({ path, label, icon }) => {
          const isActive = activeTab === path;
          return (
            <button
              key={path}
              onClick={() => handleTabClick(path)}
              onContextMenu={(e) => e.preventDefault()}
              onDragStart={(e) => e.preventDefault()}
              className={[
                "flex flex-1 flex-col items-center justify-center gap-1 rounded-2xl py-3 text-xs font-medium select-none",
                isActive
                  ? "text-black opacity-100"
                  : "text-slate-400 opacity-60",
              ].join(" ")}
              style={{ WebkitTouchCallout: "none" }}
            >
              <img
                src={icon}
                alt={`${label} icon`}
                draggable={false}
                onContextMenu={(e) => e.preventDefault()}
                onDragStart={(e) => e.preventDefault()}
                className={[
                  "h-6 w-6",
                  isActive ? "opacity-100" : "opacity-40",
                ].join(" ")}
                style={{ WebkitTouchCallout: "none", userSelect: "none" }}
              />
              <span>{label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default BottomTab;
