import ModalCard from "./ModalCard";
import { useTranslation } from "react-i18next";

type ScanPendingModalProps = {
  onClose: () => void;
  onHistory: () => void;
  onScanMore: () => void;
};

function ScanPendingModal({
  onClose,
  onHistory,
  onScanMore,
}: ScanPendingModalProps) {
  const { t } = useTranslation();
  return (
    <ModalCard
      icon={
        <div className="flex h-[60px] w-[60px] items-center justify-center rounded-full bg-slate-100">
          <img src="/fi_clock.svg" alt={t("Pending review")} className="h-9 w-9" />
        </div>
      }
      title={t("L-Uy0mkspA")}
      description={<>{t("L-ZMgc1zLo")}</>}
      actions={[
        {
          label: t("L-kT4ZjeE1"),
          tone: "secondary",
          onClick: () => {
            onHistory();
            onClose();
          },
        },
        {
          label: t("L-3PB4WnGD"),
          tone: "primary",
          onClick: () => {
            onScanMore();
            onClose();
          },
        },
      ]}
      onClose={onClose}
    />
  );
}

export default ScanPendingModal;
