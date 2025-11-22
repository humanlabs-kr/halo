import HumanPassLink from "./HumanPassLink";
import ModalCard from "./ModalCard";

type ScanPendingModalProps = {
  onClose: () => void;
  onHistory: () => void;
  onScanMore: () => void;
};

function ScanPendingModal({ onClose, onHistory, onScanMore }: ScanPendingModalProps) {
  return (
    <ModalCard
      icon={
        <div className="flex h-[60px] w-[60px] items-center justify-center rounded-full bg-slate-100">
          <img src="/fi_clock.svg" alt="Pending review" className="h-9 w-9" />
        </div>
      }
      title="Receipt sent for review"
      description={
        <>Please wait a moment while we process your receipt.</>
      }
      actions={[
        {
          label: "View History",
          tone: "secondary",
          onClick: () => {
            onHistory();
            onClose();
          },
        },
        {
          label: "Scan More",
          tone: "primary",
          onClick: () => {
            onScanMore();
            onClose();
          },
        },
      ]}
      footer={<HumanPassLink className="mt-2 w-full" />}
      onClose={onClose}
    />
  );
}

export default ScanPendingModal;

