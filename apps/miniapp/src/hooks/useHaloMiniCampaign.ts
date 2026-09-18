import { useEffect, useState } from 'react';
import { GEO_API_URL, isDeveloperAddress } from '@/lib/env';
import {
  ADMIN_FALLBACK_CAMPAIGN,
  getHaloMiniCampaign,
  type HaloMiniCampaignWithCode,
} from '@/lib/halo-mini-campaigns';
import { useAuthStore } from '@/stores/auth';

/**
 * Resolves the cross-promo campaign for the user's country, or `null` when
 * there is nothing to show.
 *
 * Shared by the banner, the popup and the campaign page so the geo lookup and
 * the internal-preview bypass exist once. Returns `null` — i.e. renders
 * nothing — when no geo endpoint is configured, so a deployment that does not
 * run the cross-promo needs no code change.
 */
export function useHaloMiniCampaign(): HaloMiniCampaignWithCode | null {
  const address = useAuthStore((s) => s.user?.address);
  const [campaign, setCampaign] = useState<HaloMiniCampaignWithCode | null>(null);

  useEffect(() => {
    let cancelled = false;

    // Internal QA sees the neutral fallback variant without spoofing a country.
    if (isDeveloperAddress(address)) {
      setCampaign(ADMIN_FALLBACK_CAMPAIGN);
      return;
    }

    if (!GEO_API_URL) {
      setCampaign(null);
      return;
    }

    void (async () => {
      try {
        const res = await fetch(GEO_API_URL);
        const data = (await res.json()) as { country?: string };
        if (!cancelled) setCampaign(getHaloMiniCampaign(data.country));
      } catch {
        // Geo lookup is best-effort: no campaign rather than a broken banner.
        if (!cancelled) setCampaign(null);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [address]);

  return campaign;
}
