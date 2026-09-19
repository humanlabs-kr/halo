import { useTranslation } from "react-i18next";
import ModalCard from "./ModalCard";
import { SUPPORT_EMAIL } from "@/lib/env";

function BlacklistModal() {
  const { t } = useTranslation();

  return (
    <ModalCard
      icon={
        <div className="flex h-[72px] w-[72px] items-center justify-center rounded-full bg-red-50">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-9 w-9 text-red-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
            />
          </svg>
        </div>
      }
      title={t("Account Suspended")}
      description={
        <div className="space-y-3">
          <p>
            {t("This account has been suspended for violating our terms of service.")}
          </p>
          <p className="text-xs text-slate-400">
            {t(
              "If you believe this is a mistake, contact {{email}} with a screenshot, your wallet address, and which chain you are using.",
              { email: SUPPORT_EMAIL },
            )}
          </p>
        </div>
      }
    />
  );
}

export default BlacklistModal;
