export function EmptyState({
  title,
  body,
}: {
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-white/10 bg-ink-800/40 px-6 py-16 text-center">
      <p className="text-lg font-medium text-white">{title}</p>
      <p className="mx-auto mt-2 max-w-xl text-sm text-slate-400">{body}</p>
    </div>
  );
}
