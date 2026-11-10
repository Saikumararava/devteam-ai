import {
  BookOpen,
  Bot,
  Download,
  FileCode2,
  Loader2,
  Search,
  ShieldCheck,
  TestTubes,
} from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { EmptyState } from "../components/EmptyState";
import { StatusBadge } from "../components/StatusBadge";
import { useProjects } from "../hooks/useProjects";
import { downloadProjectZip } from "../services/api";

export function ProjectHistory() {
  const { projects, loading, error } = useProjects();
  const [search, setSearch] = useState("");
  const [downloadingId, setDownloadingId] = useState<number | null>(null);

  async function handleDownload(id: number, name: string) {
    setDownloadingId(id);
    try {
      await downloadProjectZip(id, name);
    } catch {
      /* ignore download error */
    } finally {
      setDownloadingId(null);
    }
  }

  const filtered = projects.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.description.toLowerCase().includes(search.toLowerCase()) ||
      p.status.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-6">
      {/* Header & Search */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-mint-400">Audit Trail</p>
          <h2 className="mt-2 text-3xl font-semibold text-white">Project history</h2>
          <p className="mt-1 text-slate-400">
            Saved requirements, historical agent workflows, generated artifacts, and test records.
          </p>
        </div>

        <div className="relative w-full max-w-xs">
          <Search size={14} className="absolute left-3.5 top-3.5 text-slate-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search projects or status…"
            className="w-full rounded-xl border border-white/10 bg-ink-900 py-2.5 pl-9 pr-4 text-xs text-white placeholder:text-slate-500 outline-none ring-mint-500/40 focus:ring"
          />
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
          {error}
        </div>
      )}

      {loading ? (
        <p className="text-slate-400">Loading project records…</p>
      ) : projects.length === 0 ? (
        <EmptyState
          title="History is empty"
          body="Every software brief, agent execution sequence, and artifact will be persisted here."
        />
      ) : filtered.length === 0 ? (
        <p className="py-8 text-center text-sm text-slate-500">
          No projects matched your search "{search}".
        </p>
      ) : (
        <div className="space-y-4">
          {filtered.map((project) => (
            <div
              key={project.id}
              className="rounded-2xl border border-white/5 bg-ink-800/70 p-5 transition hover:border-mint-500/30"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-3">
                    <Link
                      to={`/workspace?projectId=${project.id}`}
                      className="text-lg font-semibold text-white hover:text-mint-400"
                    >
                      {project.name}
                    </Link>
                    <StatusBadge value={project.status} />
                  </div>
                  <p className="text-sm text-slate-400 max-w-3xl">
                    {project.description || "No description provided."}
                  </p>
                  <p className="font-mono text-xs text-slate-500 pt-1">
                    Created:{" "}
                    {project.created_at
                      ? new Date(project.created_at).toLocaleString()
                      : "Recently"}
                  </p>
                </div>

                {/* Quick actions for this project */}
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    to={`/workspace?projectId=${project.id}`}
                    className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-ink-900/60 px-3 py-1.5 text-xs text-slate-300 hover:bg-white/5"
                    title="Agent Workspace"
                  >
                    <Bot size={13} className="text-mint-400" />
                    Agents
                  </Link>

                  <Link
                    to={`/code?projectId=${project.id}`}
                    className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-ink-900/60 px-3 py-1.5 text-xs text-slate-300 hover:bg-white/5"
                    title="Generated Code"
                  >
                    <FileCode2 size={13} className="text-blue-400" />
                    Code
                  </Link>

                  <Link
                    to={`/review?projectId=${project.id}`}
                    className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-ink-900/60 px-3 py-1.5 text-xs text-slate-300 hover:bg-white/5"
                    title="Code Review"
                  >
                    <ShieldCheck size={13} className="text-amber-400" />
                    Review
                  </Link>

                  <Link
                    to={`/tests?projectId=${project.id}`}
                    className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-ink-900/60 px-3 py-1.5 text-xs text-slate-300 hover:bg-white/5"
                    title="Testing Results"
                  >
                    <TestTubes size={13} className="text-purple-400" />
                    Tests
                  </Link>

                  <Link
                    to={`/docs?projectId=${project.id}`}
                    className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-ink-900/60 px-3 py-1.5 text-xs text-slate-300 hover:bg-white/5"
                    title="Documentation"
                  >
                    <BookOpen size={13} className="text-emerald-400" />
                    Docs
                  </Link>

                  <button
                    onClick={() => handleDownload(project.id, project.name)}
                    disabled={downloadingId === project.id}
                    className="flex items-center gap-1.5 rounded-lg border border-mint-500/30 bg-mint-500/10 px-3 py-1.5 text-xs text-mint-300 hover:bg-mint-500/20 disabled:opacity-50"
                    title="Download ZIP"
                  >
                    {downloadingId === project.id ? (
                      <Loader2 size={13} className="animate-spin" />
                    ) : (
                      <Download size={13} />
                    )}
                    {downloadingId === project.id ? "..." : "ZIP"}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
