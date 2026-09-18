import { useTranslation } from "react-i18next";

/**
 * Time left in the current raffle round. Rounds close at UTC midnight; the
 * caller owns the ticking clock so this stays a pure display component.
 */
export default function RaffleCountdownCard({
  hours,
  minutes,
  seconds,
}: {
  hours: string;
  minutes: string;
  seconds: string;
}) {
  const { t } = useTranslation();

  return (
    <section className="mt-4 rounded-[28px] bg-[#292929] px-6 py-4 text-white">
      <div className="flex flex-col items-center gap-3">
        <p className="text-sm text-white/70">{t("L-fZMUbLsR")}</p>
        <div className="mx-auto flex max-w-[280px] items-center justify-between gap-3 text-white">
          <CountdownBlock label="Hours" value={hours} />
          <span className="text-2xl font-semibold text-white/80">:</span>
          <CountdownBlock label="Minutes" value={minutes} />
          <span className="text-2xl font-semibold text-white/80">:</span>
          <CountdownBlock label="Seconds" value={seconds} />
        </div>
      </div>
    </section>
  );
}

function CountdownBlock({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <div className="rounded-2xl text-2xl font-semibold">{value}</div>
      <p className="mt-0.5 text-xs text-[#8D8D8D]">{label}</p>
    </div>
  );
}
