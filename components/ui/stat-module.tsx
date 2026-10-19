import { Eyebrow } from "@/components/ui/kit";

export function StatModule({
  label,
  value,
  note,
  accent = false,
}: {
  label: string;
  value: number | string;
  note?: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-lg border border-ink-700 bg-ink-850 p-4">
      <Eyebrow>{label}</Eyebrow>
      <p
        className={
          accent
            ? "mt-2 font-mono text-3xl font-semibold tabular-nums text-signal-400"
            : "mt-2 font-mono text-3xl font-semibold tabular-nums text-fog-100"
        }
      >
        {value}
      </p>
      {note && <p className="mt-1 text-xs text-fog-600">{note}</p>}
    </div>
  );
}
