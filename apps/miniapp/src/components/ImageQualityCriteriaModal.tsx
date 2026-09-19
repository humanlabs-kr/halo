import { Drawer } from "vaul";
import { Trans, useTranslation } from "react-i18next";
import { getSafeAreaInsetBottom } from "@/lib/safe-area";

type ImageQualityCriteriaModalProps = {
  open: boolean;
  onClose: () => void;
};

function ImageQualityCriteriaModal({
  open,
  onClose,
}: ImageQualityCriteriaModalProps) {
  const { t } = useTranslation();

  return (
    <Drawer.Root open={open} onOpenChange={onClose}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-50 bg-black/60" />
        <Drawer.Content
          className="fixed inset-x-0 bottom-0 z-50 flex flex-col rounded-t-[32px] bg-white text-black shadow-2xl"
          style={{ paddingBottom: `calc(1.5rem + ${getSafeAreaInsetBottom()}px)` }}
        >
          <div className="mx-auto mt-4 h-1 w-10 rounded-full bg-slate-300" />
          <div className="p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold">
                {t("Image Quality Criteria")}
              </h2>
              <button
                type="button"
                onClick={onClose}
                className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-gray-100"
                aria-label={t("Close")}
              >
                <img src="/u_multiply.svg" alt="Close" className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <h3 className="mb-2 text-base font-semibold text-black">
                  {t("Required Information")}
                </h3>
                <ul className="space-y-2 text-sm text-[#6C6C6C]">
                  <li className="flex items-start gap-2">
                    <span className="mt-1 text-black">•</span>
                    <span>
                      <Trans
                        i18nKey="<strong>Merchant name</strong> – The store or business name must be clearly visible"
                        components={{
                          strong: <strong className="text-black" />,
                        }}
                      />
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1 text-black">•</span>
                    <span>
                      <Trans
                        i18nKey={
                          '<strong>Total amount</strong> – A line clearly labeled "TOTAL" (or equivalent) must be visible'
                        }
                        components={{
                          strong: <strong className="text-black" />,
                        }}
                      />
                    </span>
                  </li>
                </ul>
                <div className="mt-3 rounded-xl border-2 border-amber-200 bg-amber-50/80 px-4 py-3">
                  <p className="text-sm font-semibold text-amber-900">
                    {t("📅 7-day period validation")}
                  </p>
                  <p className="mt-1 text-sm text-amber-800/90">
                    <Trans
                      i18nKey="The receipt <strong>issue date</strong> must be within the last <strong>7 days</strong>. Receipts older than 7 days cannot be claimed."
                      components={{ strong: <strong /> }}
                    />
                  </p>
                </div>
              </div>

              <div>
                <h3 className="mb-2 text-base font-semibold text-black">
                  {t("Image Quality Tips")}
                </h3>
                <ul className="space-y-2 text-sm text-[#6C6C6C]">
                  <li className="flex items-start gap-2">
                    <span className="mt-1 text-black">•</span>
                    <span>
                      {t("Ensure the entire receipt is visible in the frame")}
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1 text-black">•</span>
                    <span>
                      {t("Make sure the image is clear and not blurry or distorted")}
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1 text-black">•</span>
                    <span>
                      {t("Avoid shadows or glare that obscure important information")}
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1 text-black">•</span>
                    <span>
                      {t(
                        "Ensure the bottom section with the total amount is not cut off",
                      )}
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1 text-black">•</span>
                    <span>
                      {t("The receipt should be flat and not folded or creased")}
                    </span>
                  </li>
                </ul>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  className="w-full rounded-full bg-black py-4 text-base font-semibold text-white transition hover:bg-black/90"
                  onClick={onClose}
                >
                  {t("Got it")}
                </button>
              </div>
            </div>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}

export default ImageQualityCriteriaModal;
