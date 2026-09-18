import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { buildInternalHaloMiniLink } from "@/lib/halo-mini-campaigns";
import { useHaloMiniCampaign } from "@/hooks/useHaloMiniCampaign";

const POPUP_STORAGE_KEY = "halo.crossPromo.lastShown";
const POPUP_COOLDOWN_HOURS = 24;
const FIRST_VISIT_DELAY_MS = 10_000;
const RETURNING_VISIT_DELAY_MS = 15_000;

export function HaloMiniPopup() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const campaign = useHaloMiniCampaign();
  const [isVisible, setIsVisible] = useState(false);

  // Show the popup after a short dwell, at most once a day.
  useEffect(() => {
    if (!campaign) return;

    const lastShown = localStorage.getItem(POPUP_STORAGE_KEY);
    const lastShownTime = lastShown ? Number.parseInt(lastShown, 10) : Number.NaN;
    const isFirstVisit = Number.isNaN(lastShownTime);

    if (!isFirstVisit) {
      const hoursSince = (Date.now() - lastShownTime) / (1000 * 60 * 60);
      if (hoursSince < POPUP_COOLDOWN_HOURS) return;
    }

    const timeoutId = setTimeout(
      () => setIsVisible(true),
      isFirstVisit ? FIRST_VISIT_DELAY_MS : RETURNING_VISIT_DELAY_MS,
    );
    return () => clearTimeout(timeoutId);
  }, [campaign]);

  const handleClose = () => {
    setIsVisible(false);
    localStorage.setItem(POPUP_STORAGE_KEY, Date.now().toString());
  };

  const handleCTA = () => {
    if (!campaign) return;
    localStorage.setItem(POPUP_STORAGE_KEY, Date.now().toString());
    setIsVisible(false);
    navigate(buildInternalHaloMiniLink(campaign, "popup"));
  };

  if (!isVisible || !campaign) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="relative w-full max-w-sm bg-gradient-to-br from-zinc-900 to-zinc-950 rounded-2xl border border-emerald-500/30 overflow-hidden shadow-2xl shadow-emerald-500/10">
        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute top-3 right-3 p-2 text-white/60 hover:text-white transition-colors z-10"
          aria-label="Close"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>

        {/* Header gradient */}
        <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-emerald-500/20 to-transparent" />

        <div className="relative p-6 pt-8">
          {/* Variant flag pill */}
          <div className="flex justify-center mb-4">
            <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 rounded-full border border-emerald-500/20">
              <span className="text-base leading-none">{campaign.flag}</span>
              <span className="text-[10px] font-bold tracking-wider text-emerald-400">
                {t(campaign.flagBadgeKey)}
              </span>
            </div>
          </div>

          {/* Coin artwork */}
          <div className="flex justify-center mb-4">
            <div className="relative">
              <div className="absolute inset-0 bg-amber-400/30 blur-2xl rounded-full" />
              <img
                src="/halo-mini-coin.webp"
                alt="10,000 points"
                className="relative w-20 h-20 drop-shadow-[0_0_12px_rgba(251,191,36,0.4)]"
              />
            </div>
          </div>

          <h3 className="text-xl font-bold text-white text-center mb-2">
            {t("Get 10,000 Halo Mini Points")}
          </h3>

          <p className="text-white/60 text-center text-sm mb-4">
            {t("Plus {{brand}} rewards — exclusive for Halo users in your country", {
              brand: campaign.rewardBrand,
            })}
          </p>

          {/* Benefits */}
          <div className="space-y-2 mb-6">
            <div className="flex items-center gap-3 p-3 bg-white/5 rounded-lg">
              <img
                src="/halo-mini-coin.webp"
                alt=""
                className="w-6 h-6 flex-shrink-0"
              />
              <span className="text-white text-sm">
                {t("10,000 free Halo Mini points")}
              </span>
            </div>
            <div className="flex items-center gap-3 p-3 bg-white/5 rounded-lg">
              <svg
                className="w-5 h-5 text-emerald-400 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                />
              </svg>
              <span className="text-white text-sm">
                {t("Exclusive {{brand}} rewards", { brand: campaign.rewardBrand })}
              </span>
            </div>
          </div>

          {/* CTA */}
          <button
            onClick={handleCTA}
            className="w-full py-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-black font-bold rounded-xl transition-transform hover:scale-[1.02] active:scale-[0.98]"
          >
            {t("Claim Now")}
          </button>

          <button
            onClick={handleClose}
            className="w-full py-3 text-white/50 text-sm mt-2 hover:text-white/70 transition-colors"
          >
            {t("Maybe later")}
          </button>
        </div>
      </div>
    </div>
  );
}
