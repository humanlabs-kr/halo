import { useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { buildInternalHaloMiniLink } from "@/lib/halo-mini-campaigns";
import { sendLightImpactHaptic } from "@/lib/haptic";
import { useHaloMiniCampaign } from "@/hooks/useHaloMiniCampaign";

function HaloMiniBannerCard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const campaign = useHaloMiniCampaign();

  if (!campaign) return null;

  const handleClick = () => {
    sendLightImpactHaptic();
    navigate(buildInternalHaloMiniLink(campaign, "banner"));
  };

  return (
    <article
      className="pressed relative overflow-hidden rounded-[28px] bg-gradient-to-r from-emerald-900/80 to-teal-700/60 p-4 cursor-pointer border border-emerald-500/30"
      onClick={handleClick}
    >
      <div className="flex items-center gap-4">
        <img
          src="/halo-mini.webp"
          alt="Halo Mini"
          className="h-12 w-12 rounded-2xl object-cover flex-shrink-0"
        />
        <div className="flex-1 text-left min-w-0">
          <p className="text-base font-semibold text-white truncate">
            {t("10K Points + {{brand}} Rewards", { brand: campaign.rewardBrand })}
          </p>
          <p className="text-sm text-white/70 truncate">
            {t("Free download — exclusive Halo offer")}
          </p>
        </div>
        <div className="flex items-center gap-1 px-2 py-1 bg-black/40 rounded-full border border-emerald-500/30 flex-shrink-0">
          <span className="text-sm leading-none">{campaign.flag}</span>
        </div>
      </div>
    </article>
  );
}

export default HaloMiniBannerCard;
