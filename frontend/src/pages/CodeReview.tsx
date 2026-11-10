import {
  AlertTriangle,
  Info,
  ShieldAlert,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { EmptyState } from "../components/EmptyState";
import { fetchProjects, fetchReview } from "../services/api";
import type { ProjectSummary, ReviewData, ReviewFinding } from "../types";

const SEVERITY_CONFIG = {
  critical: {
    icon: ShieldAlert,
    color: "text-rose-400",
    bg: "bg-rose-500/10 border-rose-500/30",
    label: "Critical",
  },
  high: {
    icon: XCircle,
    color: "text-orange-400",
    bg: "bg-orange-500/10 border-orange-500/30",
    label: "High",
  },
  medium: {
    icon: AlertTriangle,
    color: "text-amber-400",
    bg: "bg-amber-500/10 border-amber-500/30",
    label: "Medium",
  },
  low: {
    icon: Info,
    color: "text-blue-400",
    bg: "bg-blue-500/10 border-blue-500/30",
    label: "Low",
  },
  info: {
    icon: Info,
    color: "text-slate-400",
    bg: "bg-slate-500/10 border-slate-500/30",
    label: "Info",
  },
};

function FindingCard({ finding }: { finding: ReviewFinding }) {
  const cfg = SEVERITY_CONFIG[finding.severity] ?? SEVERITY_CONFIG.info;
  const Icon = cfg.icon;
  const [expanded, setExpanded] = useState(false);

  return (
    <div className={`rounded-xl border p-4 ${cfg.bg}`}>
      <div className="flex items-start gap-3">
        <Icon size={16} className={`mt-0.5 shrink-0 ${cfg.color}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-xs font-bold uppercase ${cfg.color}`}>{cfg.label}</span>
            <span className="text-xs text-slate-500">·</span>
            <span className="text-xs text-slate-500">{finding.category}</span>
          </div>
          <p className="mt-1 text-sm font-medium text-white">{finding.title}</p>
          {expanded && (
            <div className="mt-3 space-y-2">
              <p className="text-xs text-slate-300">{finding.details}</p>
              {finding.suggested_fix && (
                <div className="rounded-lg bg-ink-900 px-3 py-2">
                  <p className="text-xs font-semibold text-mint-400">Suggested fix</p>
                  <p className="mt-1 text-xs text-slate-300">{finding.suggested_fix}</p>
                </div>
              )}
            </div>
          )}
          <button
            onClick={() => setExpanded(!expanded)}
            className="mt-2 text-xs text-slate-500 hover:text-slate-300"
          >
            {expanded ? "Show less ↑" : "Show details ↓"}
          </button>
        </div>
      </div>
    </div>
  );
}

function QualityMeter({ score }: { score: number }) {
  const color =
    score >= 80 ? "bg-mint-500" : score >= 60 ? "bg-amber-500" : "bg-rose-500";
  return (
    <div>
      <div className="flex items-center justify-between text-sm">
        <span className="text-slate-400">Quality score</span>
        <span className="font-bold text-white">{score}/100</span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-ink-700">
        <div
          className={`h-full transition-all duration-700 ${color}`}
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );
}

export function CodeReview() {
  const [params] = useSearchParams();
  const projectIdParam = Number(params.get("projectId") || 0);

  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [projectId, setProjectId] = useState<number>(projectIdParam);
  const [review, setReview] = useState<ReviewData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [severityFilter, setSeverityFilter] = useState<string>("all");

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
    fetchReview(projectId)
      .then(setReview)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [projectId]);

  const filteredFindings =
    review?.findings.filter(
      (f) => severityFilter === "all" || f.severity === severityFilter,
    ) ?? [];

  const counts = review?.findings.reduce(
    (acc, f) => ({ ...acc, [f.severity]: (acc[f.severity] ?? 0) + 1 }),
    {} as Record<string, number>,
  ) ?? {};

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-mint-400">Code review</p>
          <h2 className="mt-2 text-3xl font-semibold text-white">Review findings</h2>
          <p className="mt-1 text-slate-400">
            Security concerns, bugs, and code quality findings from the Reviewer agent.
          </p>
        </div>
        <select
          value={projectId}
          onChange={(e) => setProjectId(Number(e.target.value))}
          className="rounded-xl border border-white/10 bg-ink-900 px-3 py-2 text-sm text-white outline-none"
        >
          <option value={0}>Select project…</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
          {error}
        </div>
      )}

      {!projectId ? (
        <EmptyState title="Select a project" body="Choose a project to view its code review results." />
      ) : loading ? (
        <p className="text-slate-400">Loading review…</p>
      ) : !review || review.findings.length === 0 ? (
        <EmptyState
          title="No review results yet"
          body="Run the AI workflow to generate code review findings."
        />
      ) : (
        <div className="space-y-6">
          {/* Summary cards */}
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-white/5 bg-ink-800/70 p-5">
              <QualityMeter score={review.quality_score} />
            </div>
            <div
              className={`rounded-2xl border p-5 ${
                review.approved
                  ? "border-mint-500/30 bg-mint-500/5"
                  : "border-rose-500/30 bg-rose-500/5"
              }`}
            >
              <div className="flex items-center gap-2">
                {review.approved ? (
                  <ShieldCheck size={16} className="text-mint-400" />
                ) : (
                  <ShieldAlert size={16} className="text-rose-400" />
                )}
                <span className="text-sm text-slate-300">Approval status</span>
              </div>
              <p
                className={`mt-2 text-xl font-bold ${
                  review.approved ? "text-mint-400" : "text-rose-400"
                }`}
              >
                {review.approved ? "Approved" : "Needs fixes"}
              </p>
            </div>
            <div className="rounded-2xl border border-white/5 bg-ink-800/70 p-5">
              <p className="text-sm text-slate-400">Total findings</p>
              <p className="mt-2 text-3xl font-bold text-white">{review.findings.length}</p>
            </div>
            <div className="rounded-2xl border border-white/5 bg-ink-800/70 p-5">
              <p className="text-sm text-slate-400">Critical issues</p>
              <p className={`mt-2 text-3xl font-bold ${review.has_critical ? "text-rose-400" : "text-mint-400"}`}>
                {counts.critical ?? 0}
              </p>
            </div>
          </div>

          {/* Summary text */}
          <div className="rounded-2xl border border-white/5 bg-ink-800/70 p-5">
            <h3 className="text-sm font-semibold text-slate-300">Review summary</h3>
            <p className="mt-2 text-sm text-slate-400">{review.summary}</p>
          </div>

          {/* Findings */}
          <div>
            {/* Severity filter */}
            <div className="mb-4 flex flex-wrap items-center gap-2">
              {["all", "critical", "high", "medium", "low", "info"].map((s) => (
                <button
                  key={s}
                  onClick={() => setSeverityFilter(s)}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                    severityFilter === s
                      ? "bg-mint-500 text-ink-950"
                      : "border border-white/10 text-slate-400 hover:text-white"
                  }`}
                >
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                  {s !== "all" && counts[s] ? ` (${counts[s]})` : ""}
                </button>
              ))}
            </div>

            <div className="space-y-3">
              {filteredFindings.length === 0 ? (
                <p className="text-sm text-slate-500">No findings at this severity level.</p>
              ) : (
                filteredFindings.map((f) => <FindingCard key={f.id} finding={f} />)
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
