import clsx from "clsx";

const TONES: Record<string, string> = {
  idle: "bg-slate-500/15 text-slate-300 ring-slate-500/30",
  pending: "bg-amber-400/10 text-amber-200 ring-amber-400/30",
  running: "bg-mint-500/10 text-mint-300 ring-mint-500/30",
  completed: "bg-emerald-400/10 text-emerald-300 ring-emerald-400/30",
  failed: "bg-rose-500/15 text-rose-300 ring-rose-500/30",
  "waiting for approval": "bg-sky-400/10 text-sky-200 ring-sky-400/30",
  draft: "bg-slate-500/15 text-slate-300 ring-slate-500/30",
  connected: "bg-mint-500/10 text-mint-300 ring-mint-500/30",
  offline: "bg-rose-500/15 text-rose-300 ring-rose-500/30",
};

export function StatusBadge({ value }: { value: string }) {
  const tone = TONES[value.toLowerCase()] ?? TONES.idle;
  return (
    <span className={clsx("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1", tone)}>
      {value}
    </span>
  );
}
