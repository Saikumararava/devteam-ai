import type { LucideIcon } from "lucide-react";

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  hint: string;
  icon: LucideIcon;
}) {
  return (
    <div className="rounded-2xl border border-white/5 bg-ink-800/80 p-5 shadow-panel">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-slate-400">{label}</p>
          <p className="mt-3 font-mono text-3xl text-white">{value}</p>
        </div>
        <div className="rounded-xl bg-mint-500/10 p-2 text-mint-400">
          <Icon size={18} />
        </div>
      </div>
      <p className="mt-4 text-sm text-slate-400">{hint}</p>
    </div>
  );
}
