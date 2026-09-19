import { useTranslation } from "react-i18next";

type SectionHeadingProps = {
  title: string;
  subtitle: string;
  className?: string;
  actionIcon?: boolean;
  onClick?: () => void;
};

export default function SectionHeading({
  title,
  subtitle,
  className = "",
  actionIcon = false,
  onClick,
}: SectionHeadingProps) {
  const { t } = useTranslation();

  const content = (
    <>
      <div>
        <p className="text-base font-bold">{title}</p>
        <p className="text-xs text-[#8D8D8D]">{subtitle}</p>
      </div>
      {actionIcon && (
        <img
          src="/u_arrow-right.svg"
          alt={t("More")}
          className="h-5 w-5 text-black"
        />
      )}
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`mt-6 px-1.5 flex items-center justify-between w-full text-left ${className} pressed`}
      >
        {content}
      </button>
    );
  }

  return (
    <div
      className={`mt-6 px-1.5 flex items-center justify-between ${className}`}
    >
      {content}
    </div>
  );
}

