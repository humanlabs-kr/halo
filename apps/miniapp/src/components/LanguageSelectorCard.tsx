import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Drawer } from "vaul";
import { sendLightImpactHaptic } from "@/lib/haptic";
import {
  changeLanguage,
  LANGUAGE_NAMES,
  REFERENCE_LANG,
  SUPPORTED_LANGS,
  type LangCode,
} from "@/lib/i18n";

/**
 * The app's only way to change language.
 *
 * Halo ships 40 locales and picks one from the device on first run. That is
 * right most of the time and wrong in exactly the cases that matter — a shared
 * phone, a handset bought abroad, a webview that reports the host app's locale
 * rather than the user's. Without a picker those users have no way out, so
 * this is shown on every chain, not just the one it was written for.
 */
export default function LanguageSelectorCard() {
  const { t, i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);

  // `resolvedLanguage` is the entry i18next actually loaded, so a device that
  // asked for "ko-KR" resolves to the "ko" we ship instead of matching nothing.
  const resolved = i18n.resolvedLanguage ?? "";
  const current: LangCode = (SUPPORTED_LANGS as readonly string[]).includes(resolved)
    ? (resolved as LangCode)
    : REFERENCE_LANG;

  const select = (code: LangCode) => {
    sendLightImpactHaptic();
    void changeLanguage(code);
    setIsOpen(false);
  };

  return (
    <Drawer.Root open={isOpen} onOpenChange={setIsOpen}>
      <Drawer.Trigger asChild>
        <article className="pressed flex cursor-pointer items-center gap-4 rounded-[28px] bg-card-background p-4 py-3.5 text-card-text">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-200">
            <svg
              className="h-6 w-6 text-gray-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129"
              />
            </svg>
          </div>
          <div className="min-w-0 flex-1 text-left">
            <p className="text-base font-semibold text-black">{t("Language")}</p>
            <p className="truncate text-sm">{LANGUAGE_NAMES[current]}</p>
          </div>
          <img src="/u_arrow-right.svg" alt="" className="h-6 w-6" />
        </article>
      </Drawer.Trigger>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-50 bg-black/60" />
        <Drawer.Content className="fixed inset-x-0 bottom-0 z-50 flex max-h-[85vh] flex-col rounded-t-[32px] bg-white">
          <div className="mx-auto mt-4 h-1 w-10 rounded-full bg-slate-300" />
          <div className="flex min-h-0 flex-col p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))]">
            <Drawer.Title className="mb-4 text-xl font-bold text-black">
              {t("Select language")}
            </Drawer.Title>
            <div className="grid min-h-0 grid-cols-2 gap-2 overflow-y-auto">
              {SUPPORTED_LANGS.map((code) => (
                <button
                  key={code}
                  type="button"
                  lang={code}
                  onClick={() => select(code)}
                  aria-current={code === current}
                  className={`rounded-xl p-3 text-left text-sm transition-colors ${
                    code === current
                      ? "bg-black text-white"
                      : "bg-gray-100 text-black hover:bg-gray-200"
                  }`}
                >
                  {LANGUAGE_NAMES[code]}
                </button>
              ))}
            </div>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
