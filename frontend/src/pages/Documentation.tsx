import {
  BookOpen,
  Check,
  Code2,
  Copy,
  FileText,
  Layers,
  Terminal,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { EmptyState } from "../components/EmptyState";
import { fetchDocumentation, fetchProjects } from "../services/api";
import type { DocsData, ProjectSummary } from "../types";

export function DocumentationPage() {
  const [params] = useSearchParams();
  const projectIdParam = Number(params.get("projectId") || 0);

  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [projectId, setProjectId] = useState<number>(projectIdParam);
  const [docs, setDocs] = useState<DocsData | null>(null);
  const [activeTab, setActiveTab] = useState<
    "readme" | "architecture" | "api" | "setup" | "report"
  >("readme");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchProjects().then(setProjects).catch(() => {});
  }, []);

  useEffect(() => {
    if (!projectId && projectIdParam) {
      setProjectId(projectIdParam);
    }
  }, [projectIdParam]);

  useEffect(() => {
    if (!projectId) return;
    setLoading(true);
    setError(null);
    fetchDocumentation(projectId)
      .then(setDocs)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [projectId]);

  const activeContent = docs
    ? activeTab === "readme"
      ? docs.readme
      : activeTab === "architecture"
        ? docs.architecture_overview
        : activeTab === "api"
          ? docs.api_docs
          : activeTab === "setup"
            ? docs.setup_instructions
            : docs.report
    : "";

  function handleCopy() {
    if (!activeContent) return;
    navigator.clipboard.writeText(activeContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-mint-400">Project Knowledge</p>
          <h2 className="mt-2 text-3xl font-semibold text-white">Documentation</h2>
          <p className="mt-1 text-slate-400">
            System architecture, API documentation, runbooks, and reports compiled by the Documentation agent.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={projectId}
            onChange={(e) => setProjectId(Number(e.target.value))}
            className="rounded-xl border border-white/10 bg-ink-900 px-3 py-2 text-sm text-white outline-none ring-mint-500/40 focus:ring"
          >
            <option value={0}>Select project…</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
          {error}
        </div>
      )}

      {!projectId ? (
        <EmptyState title="Select a project" body="Choose a project to explore its generated documentation." />
      ) : loading ? (
        <p className="text-slate-400">Loading documentation…</p>
      ) : !docs || (!docs.readme && !docs.report) ? (
        <EmptyState
          title="No documentation generated yet"
          body="Run the workflow through completion to automatically write README.md, API specs, and the project report."
        />
      ) : (
        <div className="space-y-4">
          {/* Section Navigation Tabs & Copy Button */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setActiveTab("readme")}
                className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-medium transition ${
                  activeTab === "readme"
                    ? "bg-mint-500 text-ink-950 font-semibold"
                    : "border border-white/10 bg-ink-900/60 text-slate-300 hover:bg-white/5"
                }`}
              >
                <BookOpen size={14} />
                README.md
              </button>

              <button
                onClick={() => setActiveTab("architecture")}
                className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-medium transition ${
                  activeTab === "architecture"
                    ? "bg-mint-500 text-ink-950 font-semibold"
                    : "border border-white/10 bg-ink-900/60 text-slate-300 hover:bg-white/5"
                }`}
              >
                <Layers size={14} />
                Architecture
              </button>

              <button
                onClick={() => setActiveTab("api")}
                className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-medium transition ${
                  activeTab === "api"
                    ? "bg-mint-500 text-ink-950 font-semibold"
                    : "border border-white/10 bg-ink-900/60 text-slate-300 hover:bg-white/5"
                }`}
              >
                <Code2 size={14} />
                API Documentation
              </button>

              <button
                onClick={() => setActiveTab("setup")}
                className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-medium transition ${
                  activeTab === "setup"
                    ? "bg-mint-500 text-ink-950 font-semibold"
                    : "border border-white/10 bg-ink-900/60 text-slate-300 hover:bg-white/5"
                }`}
              >
                <Terminal size={14} />
                Setup & Install
              </button>

              <button
                onClick={() => setActiveTab("report")}
                className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-medium transition ${
                  activeTab === "report"
                    ? "bg-mint-500 text-ink-950 font-semibold"
                    : "border border-white/10 bg-ink-900/60 text-slate-300 hover:bg-white/5"
                }`}
              >
                <FileText size={14} />
                Development Summary
              </button>
            </div>

            <button
              onClick={handleCopy}
              className="flex items-center gap-2 rounded-xl border border-white/10 bg-ink-900/80 px-3.5 py-2 text-xs text-slate-300 transition hover:bg-white/5"
            >
              {copied ? <Check size={14} className="text-mint-400" /> : <Copy size={14} />}
              {copied ? "Copied to clipboard" : "Copy markdown"}
            </button>
          </div>

          {/* Document Content View */}
          <div className="rounded-2xl border border-white/5 bg-ink-800/80 p-6">
            <pre className="max-h-[68vh] overflow-auto font-mono text-xs leading-6 text-slate-200 whitespace-pre-wrap break-words">
              {activeContent || "(no content generated for this section)"}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
