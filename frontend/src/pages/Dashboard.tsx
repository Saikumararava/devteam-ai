import {
  Activity,
  ArrowRight,
  Bot,
  CheckCircle2,
  FolderKanban,
  Play,
  Sparkles,
} from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { EmptyState } from "../components/EmptyState";
import { StatCard } from "../components/StatCard";
import { StatusBadge } from "../components/StatusBadge";
import { useModelStatus } from "../hooks/useModelStatus";
import { useProjects } from "../hooks/useProjects";
import { createProject, fetchActivity, startWorkflow } from "../services/api";

interface ActivityItem {
  id: number;
  project_id: number | null;
  event_type: string;
  message: string;
  created_at: string | null;
}

export function Dashboard() {
  const navigate = useNavigate();
  const { projects, stats, error, loading } = useProjects();
  const { status } = useModelStatus();

  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [quickName, setQuickName] = useState("");
  const [quickReqs, setQuickReqs] = useState("");
  const [quickStarting, setQuickStarting] = useState(false);
  const [quickError, setQuickError] = useState<string | null>(null);

  useEffect(() => {
    fetchActivity().then(setActivities).catch(() => {});
  }, []);

  async function handleQuickStart(e: FormEvent) {
    e.preventDefault();
    if (!quickName.trim() || !quickReqs.trim()) return;
    setQuickStarting(true);
    setQuickError(null);
    try {
      const proj = await createProject({
        name: quickName.trim(),
        description: "Quick started from command deck",
        tech_preferences: "Python, FastAPI",
        functional_requirements: quickReqs.trim(),
        expected_output: "Runnable app, test suite, and README",
      });
      await startWorkflow(proj.id);
      navigate(`/workspace?projectId=${proj.id}`);
    } catch (err) {
      setQuickError(err instanceof Error ? err.message : "Failed to launch quick project");
    } finally {
      setQuickStarting(false);
    }
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-mint-400">Mission Control</p>
          <h2 className="mt-1 text-3xl font-semibold text-white">Command deck</h2>
          <p className="mt-2 max-w-2xl text-slate-400">
            Autonomous multi-agent software development platform running 100% locally via Ollama.
            Planner, Developer, Reviewer, Tester, and Documentation agents coordinate through LangGraph.
          </p>
        </div>
        <Link
          to="/projects/new"
          className="flex items-center gap-2 rounded-xl bg-mint-500 px-4 py-2.5 text-sm font-semibold text-ink-950 transition hover:bg-mint-400"
        >
          <Sparkles size={16} />
          Full Project Wizard
        </Link>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {error}. Ensure the FastAPI backend is running on port 8000.
        </div>
      )}

      {/* Metrics Row */}
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total Projects"
          value={stats?.total_projects ?? (loading ? "…" : 0)}
          hint="Persisted in local SQLite database"
          icon={FolderKanban}
        />
        <StatCard
          label="Completed"
          value={stats?.completed_tasks ?? 0}
          hint="Passed review, tests & documentation"
          icon={CheckCircle2}
        />
        <StatCard
          label="Active Agents"
          value={stats?.active_agents ?? 0}
          hint="Sequential CPU runs, memory optimized"
          icon={Bot}
        />
        <StatCard
          label="Ollama Model"
          value={status?.model_available ? "Ready" : status?.connected ? "Pull needed" : "Offline"}
          hint={status?.configured_model ?? "qwen2.5-coder:1.5b"}
          icon={Activity}
        />
      </section>

      {/* Quick Launch Box */}
      <section className="rounded-2xl border border-mint-500/20 bg-ink-800/80 p-6">
        <div className="flex items-center gap-2 text-mint-400">
          <Play size={16} />
          <h3 className="font-semibold text-white">Quick-Start Project</h3>
        </div>
        <p className="mt-1 text-xs text-slate-400">
          Launch all 5 agents in one click without leaving the dashboard.
        </p>

        <form onSubmit={handleQuickStart} className="mt-4 space-y-3">
          <div className="grid gap-3 md:grid-cols-2">
            <input
              required
              value={quickName}
              onChange={(e) => setQuickName(e.target.value)}
              placeholder="Project Name (e.g. Cache Key-Value Store)"
              className="rounded-xl border border-white/10 bg-ink-900 px-3.5 py-2.5 text-xs text-white placeholder:text-slate-500 outline-none ring-mint-500/40 focus:ring"
            />
            <input
              required
              value={quickReqs}
              onChange={(e) => setQuickReqs(e.target.value)}
              placeholder="Requirements (e.g. In-memory dictionary with TTL and LRU eviction, pytest suite)"
              className="rounded-xl border border-white/10 bg-ink-900 px-3.5 py-2.5 text-xs text-white placeholder:text-slate-500 outline-none ring-mint-500/40 focus:ring"
            />
          </div>

          {quickError && <p className="text-xs text-rose-300">{quickError}</p>}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={quickStarting}
              className="flex items-center gap-2 rounded-xl bg-mint-500 px-4 py-2 text-xs font-semibold text-ink-950 transition hover:bg-mint-400 disabled:opacity-50"
            >
              {quickStarting ? "Launching workflow…" : "Execute Agents"}
              <ArrowRight size={14} />
            </button>
          </div>
        </form>
      </section>

      {/* Main Grid: Projects & Side panels */}
      <section className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        {/* Recent Projects */}
        <div className="rounded-2xl border border-white/5 bg-ink-800/70 p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-medium text-white">Recent projects</h3>
            <Link to="/history" className="text-xs text-mint-400 hover:text-mint-300">
              View all history →
            </Link>
          </div>
          {loading ? (
            <p className="text-sm text-slate-400">Loading workspace…</p>
          ) : projects.length === 0 ? (
            <EmptyState
              title="No projects yet"
              body="Use the Quick-Start box above or the Full Project Wizard to begin."
            />
          ) : (
            <div className="space-y-2.5">
              {projects.slice(0, 6).map((project) => (
                <Link
                  key={project.id}
                  to={`/workspace?projectId=${project.id}`}
                  className="flex items-center justify-between rounded-xl border border-white/5 bg-ink-900/60 px-4 py-3 transition hover:border-mint-500/30 hover:bg-ink-900/90"
                >
                  <div className="min-w-0 pr-4">
                    <p className="font-medium text-white truncate">{project.name}</p>
                    <p className="line-clamp-1 text-xs text-slate-400 mt-0.5">
                      {project.description || "No description"}
                    </p>
                  </div>
                  <StatusBadge value={project.status} />
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Right column: Model & Real Activity */}
        <div className="space-y-6">
          {/* Model Status Card */}
          <div className="rounded-2xl border border-white/5 bg-ink-800/70 p-6">
            <h3 className="text-lg font-medium text-white">Model connection</h3>
            <p className="mt-2 font-mono text-xs text-slate-300">
              {status?.base_url ?? "http://127.0.0.1:11434"}
            </p>
            <p className="mt-3 text-xs text-slate-400">
              {status?.error ??
                (status?.model_available
                  ? `Active model: ${status.configured_model} (Ready for sequential CPU execution)`
                  : `Waiting for Ollama to serve ${status?.configured_model}`)}
            </p>
            <p className="mt-3 text-[11px] leading-5 text-slate-500">
              {status?.inference_notes}
            </p>
          </div>

          {/* Workflow Activity Card */}
          <div className="rounded-2xl border border-white/5 bg-ink-800/70 p-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-white">Recent workflow activity</h3>
              <span className="font-mono text-[10px] text-mint-400">LIVE AUDIT</span>
            </div>
            {activities.length === 0 ? (
              <p className="mt-3 text-xs text-slate-500">
                Workflow events, agent handoffs, and test reports will display here as agents run.
              </p>
            ) : (
              <div className="mt-3 space-y-2 max-h-56 overflow-y-auto pr-1">
                {activities.map((act) => (
                  <div
                    key={act.id}
                    className="flex items-start gap-2 rounded-lg border border-white/5 bg-ink-900/40 p-2 font-mono text-[11px]"
                  >
                    <span className="text-mint-400 shrink-0 font-semibold">{act.event_type}</span>
                    <span className="text-slate-300 truncate">{act.message}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
