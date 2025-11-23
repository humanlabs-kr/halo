import { Drawer } from "vaul";
import { getSafeAreaInsetsBottom } from "../utils/device";

type ImageQualityCriteriaModalProps = {
  open: boolean;
  onClose: () => void;
};

function ImageQualityCriteriaModal({
  open,
  onClose,
}: ImageQualityCriteriaModalProps) {
  const bottomInset = getSafeAreaInsetsBottom();

  return (
    <Drawer.Root open={open} onOpenChange={onClose}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-50 bg-black/60" />
        <Drawer.Content
          className="fixed inset-x-0 bottom-0 z-50 flex flex-col rounded-t-[32px] bg-white text-black shadow-2xl"
          style={{ paddingBottom: `calc(1.5rem + ${bottomInset}px)` }}
        >
          <div className="mx-auto mt-4 h-1 w-10 rounded-full bg-slate-300" />
          <div className="p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold">Image Quality Criteria</h2>
              <button
                type="button"
                onClick={onClose}
                className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-gray-100"
                aria-label="Close"
              >
                <img src="/u_multiply.svg" alt="Close" className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <h3 className="mb-2 text-base font-semibold text-black">
                  Required Information
                </h3>
                <ul className="space-y-2 text-sm text-[#6C6C6C]">
                  <li className="flex items-start gap-2">
                    <span className="mt-1 text-black">•</span>
                    <span>
                      <strong className="text-black">Merchant name</strong> -
                      The store or business name must be clearly visible
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1 text-black">•</span>
                    <span>
                      <strong className="text-black">Issue date</strong> - The
                      receipt date must be within the last 7 days
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1 text-black">•</span>
                    <span>
                      <strong className="text-black">Total amount</strong> - A
                      line clearly labeled "TOTAL" (or equivalent) must be
                      visible
                    </span>
                  </li>
                </ul>
              </div>

              <div>
                <h3 className="mb-2 text-base font-semibold text-black">
                  Image Quality Tips
                </h3>
                <ul className="space-y-2 text-sm text-[#6C6C6C]">
                  <li className="flex items-start gap-2">
                    <span className="mt-1 text-black">•</span>
                    <span>
                      Ensure the entire receipt is visible in the frame
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1 text-black">•</span>
                    <span>
                      Make sure the image is clear and not blurry or distorted
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1 text-black">•</span>
                    <span>
                      Avoid shadows or glare that obscure important information
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1 text-black">•</span>
                    <span>
                      Ensure the bottom section with the total amount is not cut
                      off
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1 text-black">•</span>
                    <span>
                      The receipt should be flat and not folded or creased
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
                  Got it
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
