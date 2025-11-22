import { ReactNode } from "react";

type ModalAction = {
  label: string;
  onClick: () => void;
  tone?: "primary" | "secondary";
};

type ModalCardProps = {
  icon?: ReactNode;
  title: string;
  description?: ReactNode;
  actions?: ModalAction[];
  footer?: ReactNode;
  onClose?: () => void;
};

function ModalCard({ icon, title, description, actions = [], footer, onClose }: ModalCardProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4"
      style={{ zIndex: 60 }}
      onClick={() => onClose?.()}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full rounded-[32px] bg-white p-4 text-center text-black shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        {icon && <div className="mx-auto my-4 flex h-[60px] w-[60px] items-center justify-center">{icon}</div>}
        <div className="relative z-10 space-y-2 px-4">
          <h2 className="text-xl font-semibold">{title}</h2>
          {description && <div className="text-sm text-slate-500">{description}</div>}
        </div>
        {Boolean(actions.length) && (
          <div className="mb-1 mt-6 flex flex-col gap-2">
            {actions.map(({ label, tone = "secondary", onClick }) => (
              <button
                key={label}
                type="button"
                className={[
                  "rounded-full py-4 text-[15px] font-semibold transition",
                  tone === "primary"
                    ? "bg-black text-white hover:bg-black/90"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200",
                ].join(" ")}
                onClick={onClick}
              >
                {label}
              </button>
            ))}
          </div>
        )}
        {footer && <div className="mt-3">{footer}</div>}
      </div>
    </div>
  );
}

export default ModalCard;

