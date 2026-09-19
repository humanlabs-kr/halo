import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { LINE_INVITE_URL } from "@/lib/constants";
import { sendLightImpactHaptic } from "@/lib/haptic";

const COPIED_FEEDBACK_MS = 2_000;

/**
 * Invite a LINE friend to Halo.
 *
 * Inside the LINE webview this opens LINE's own friend picker, which is the
 * only way to reach a contact list we are not allowed to read. Outside it —
 * a shared link opened in a normal browser — there is no picker and no friend
 * graph, so the same button falls back to copying the invite URL.
 *
 * `@line/liff` is imported on use, not at module scope: it is a Kaia-only
 * dependency and the home screen of the other two chains should not pay for it.
 */
export default function InviteFriendsCard() {
  const { t } = useTranslation();
  const [isInLiff, setIsInLiff] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void import("@line/liff")
      .then(({ default: liff }) => {
        if (!cancelled) setIsInLiff(liff.isInClient());
      })
      .catch(() => {
        // SDK missing or blocked: the clipboard path still works.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!copied) return;
    const timeoutId = window.setTimeout(() => setCopied(false), COPIED_FEEDBACK_MS);
    return () => window.clearTimeout(timeoutId);
  }, [copied]);

  const handleInvite = async () => {
    sendLightImpactHaptic();
    try {
      const { default: liff } = await import("@line/liff");
      if (liff.isInClient() && liff.isApiAvailable("shareTargetPicker")) {
        await liff.shareTargetPicker(
          [
            {
              type: "text",
              text: t("Join me on Halo! Scan receipts and earn rewards. {{url}}", {
                url: LINE_INVITE_URL,
              }),
            },
          ],
          { isMultiple: false },
        );
        return;
      }
    } catch {
      // Picker unavailable or dismissed — fall through to the copy path so the
      // tap still does something.
    }

    try {
      await navigator.clipboard.writeText(LINE_INVITE_URL);
      setCopied(true);
    } catch {
      // Clipboard is permission-gated in some webviews; nothing else to offer.
    }
  };

  return (
    <article
      className="pressed flex cursor-pointer items-center gap-4 rounded-[28px] bg-[#06C755]/10 p-4 py-3.5 text-card-text"
      onClick={() => void handleInvite()}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#06C755]">
        <svg
          className="h-6 w-6 text-white"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
          />
        </svg>
      </div>
      <div className="min-w-0 flex-1 text-left">
        <p className="text-base font-semibold text-black">{t("Invite friends")}</p>
        <p className="truncate text-sm">
          {isInLiff
            ? t("Share via LINE")
            : copied
              ? t("Link copied")
              : t("Copy invite link")}
        </p>
      </div>
      {copied ? (
        <svg
          className="h-6 w-6 text-[#06C755]"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      ) : (
        <img src="/u_arrow-right.svg" alt="" className="h-6 w-6" />
      )}
    </article>
  );
}
