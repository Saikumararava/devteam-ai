import {
  CheckCircle2,
  CircleDot,
  Clock,
  Loader2,
  RefreshCw,
  XCircle,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { EmptyState } from "../components/EmptyState";
import { StatusBadge } from "../components/StatusBadge";
import { createEventStream, fetchProject, startWorkflow } from "../services/api";
import type { AgentStatus, ProjectDetail, SSEAgentUpdate, WorkflowEvent } from "../types";

const AGENT_DESCRIPTIONS: Record<string, string> = {
  planner: "Understand the brief, choose architecture, and emit a structured JSON plan.",
  developer: "Turn approved tasks into source files inside generated_projects.",
  reviewer: "Score quality, bugs, and security concerns before tests run.",
  tester: "Write pytest cases and execute them in a sandboxed environment.",
  documentation: "Produce README, API docs, architecture notes, and a final report.",
};

const AGENT_ORDER = ["planner", "developer", "reviewer", "tester", "documentation"];

function AgentIcon({ status }: { status: string }) {
  if (status === "running") return <Loader2 size={16} className="animate-spin text-amber-400" />;
  if (status === "completed") return <CheckCircle2 size={16} className="text-mint-400" />;
  if (status === "failed") return <XCircle size={16} className="text-rose-400" />;
  if (status === "pending") return <Clock size={16} className="text-blue-400" />;
  return <CircleDot size={16} className="text-slate-500" />;
}

export function AgentWorkspace() {
  const [params] = useSearchParams();
  const projectIdParam = Number(params.get("projectId") || 0);

  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [agents, setAgents] = useState<AgentStatus[]>([]);
  const [events, setEvents] = useState<WorkflowEvent[]>([]);
  const [projectStatus, setProjectStatus] = useState<string>("draft");
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);

  const esRef = useRef<EventSource | null>(null);
  const eventsEndRef = useRef<HTMLDivElement>(null);

  // Load project data initially
  useEffect(() => {
    if (!projectIdParam) return;
    fetchProject(projectIdParam)
      .then((p) => {
        setProject(p);
        setAgents(p.agents);
        setEvents(p.events);
        setProjectStatus(p.status);
      })
      .catch((err: Error) => setError(err.message));
  }, [projectIdParam]);

  // Auto-scroll event log
  useEffect(() => {
    eventsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [events]);

  // SSE connection — start immediately if project is running
  useEffect(() => {
    if (!projectIdParam) return;
    if (!project) return;

    const isActive = ["planning", "developing", "reviewing", "testing", "documenting"].includes(
      project.status,
    );
    if (!isActive && project.status !== "running") return;

    connectStream(projectIdParam);
    return () => esRef.current?.close();
  }, [project?.status]);

  function connectStream(id: number) {
    esRef.current?.close();
    const es = createEventStream(
      id,
      (data) => {
        const msg = data as unknown as SSEAgentUpdate;
        if (msg.type === "agents" && msg.agents) {
          setAgents(msg.agents);
          if (msg.project_status) setProjectStatus(msg.project_status);
        }
        if (msg.type === "event" && msg.event_type) {
          setEvents((prev) => [
            ...prev,
            {
              id: msg.id ?? Date.now(),
              event_type: msg.event_type!,
              message: msg.message ?? "",
              created_at: msg.created_at ?? null,
            },
          ]);
        }
        if (msg.type === "done") {
          if (msg.project_status) setProjectStatus(msg.project_status);
          es.close();
          // Reload project to get final state
          fetchProject(id).then((p) => setProject(p)).catch(() => {});
        }
      },
      () => setError("Lost connection to backend."),
    );
    esRef.current = es;
  }

  async function handleStart() {
    if (!projectIdParam) return;
    setStarting(true);
    setError(null);
    try {
      await startWorkflow(projectIdParam);
      connectStream(projectIdParam);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start workflow");
    } finally {
      setStarting(false);
    }
  }

  if (!projectIdParam) {
    return (
      <EmptyState
        title="No project selected"
        body="Create a project from the New Project page to open the agent workspace."
      />
    );
  }

  const sortedAgents = AGENT_ORDER.map(
    (name) => agents.find((a) => a.agent_name === name) ?? {
      agent_name: name,
      status: "idle",
      current_task: AGENT_DESCRIPTIONS[name],
      progress: 0,
      duration_ms: 0,
    },
  );

  const isRunning = ["planning", "developing", "reviewing", "testing", "documenting"].includes(
    projectStatus,
  );
  const isDone = projectStatus === "completed";
  const isFailed = projectStatus === "failed";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-mint-400">Agent room</p>
          <h2 className="mt-2 text-3xl font-semibold text-white">
            {project?.name ?? "Loading…"}
          </h2>
          <p className="mt-1 text-slate-400">{project?.description}</p>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge value={projectStatus} />
          {isRunning && (
            <span className="flex items-center gap-2 text-sm text-amber-400">
              <Loader2 size={14} className="animate-spin" />
              Agents working…
            </span>
          )}
          <button
            onClick={handleStart}
            disabled={starting}
            className="flex items-center gap-2 rounded-xl bg-mint-500 px-4 py-2 text-sm font-semibold text-ink-950 transition hover:bg-mint-400 disabled:opacity-60"
          >
            {starting ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <RefreshCw size={14} />
            )}
            {starting
              ? "Starting…"
              : isDone
                ? "Re-run workflow"
                : isRunning
                  ? "Restart / Resume"
                  : "Run workflow"}
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
          {error}
        </div>
      )}

      {isDone && (
        <div className="rounded-xl border border-mint-500/30 bg-mint-500/10 px-4 py-3 text-sm text-mint-300">
          ✓ Workflow complete! Check the Generated Code, Review, Tests, and Documentation tabs.
        </div>
      )}

      {isFailed && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
          Workflow halted due to errors. Inspect the workflow log below or retry by clicking Run workflow.
        </div>
      )}

      {/* Agent grid */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {sortedAgents.map((agent, idx) => (
          <article
            key={agent.agent_name}
            className={`rounded-2xl border p-5 transition ${
              agent.status === "running"
                ? "border-amber-500/30 bg-amber-500/5"
                : agent.status === "completed"
                  ? "border-mint-500/20 bg-mint-500/5"
                  : agent.status === "failed"
                    ? "border-rose-500/20 bg-rose-500/5"
                    : "border-white/5 bg-ink-800/80"
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-ink-700 text-xs font-bold text-slate-300">
                  {idx + 1}
                </span>
                <h3 className="capitalize text-white">{agent.agent_name}</h3>
              </div>
              <AgentIcon status={agent.status} />
            </div>

            <p className="mt-3 text-sm text-slate-400">
              {AGENT_DESCRIPTIONS[agent.agent_name]}
            </p>

            {/* Progress bar */}
            <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-ink-700">
              <div
                className={`h-full transition-all duration-700 ${
                  agent.status === "failed"
                    ? "bg-rose-500"
                    : agent.status === "completed"
                      ? "bg-mint-500"
                      : "bg-amber-500"
                }`}
                style={{ width: `${agent.progress}%` }}
              />
            </div>

            <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-xs text-slate-400">
              <div>
                <dt>Task</dt>
                <dd className="mt-0.5 truncate text-slate-200" title={agent.current_task}>
                  {agent.current_task || "Waiting"}
                </dd>
              </div>
              <div>
                <dt>Duration</dt>
                <dd className="mt-0.5 font-mono text-slate-200">
                  {agent.duration_ms > 0
                    ? `${(agent.duration_ms / 1000).toFixed(1)}s`
                    : "—"}
                </dd>
              </div>
            </dl>
          </article>
        ))}
      </div>

      {/* Correction cycles indicator */}
      {(project?.correction_cycles ?? 0) > 0 && (
        <div className="flex items-center gap-2 rounded-xl border border-blue-500/20 bg-blue-500/5 px-4 py-3 text-sm text-blue-300">
          <RefreshCw size={14} />
          Correction cycle #{project?.correction_cycles} — developer was asked to fix issues found by reviewer / tester.
        </div>
      )}

      {/* Workflow event log */}
      <section className="rounded-2xl border border-white/5 bg-ink-800/70 p-6">
        <h3 className="mb-4 text-white">Workflow log</h3>
        {events.length === 0 ? (
          <p className="text-sm text-slate-500">
            {isRunning ? "Events will appear here as agents run…" : "No events yet. Run the workflow to see activity."}
          </p>
        ) : (
          <div className="max-h-64 space-y-2 overflow-y-auto pr-1 font-mono text-xs">
            {[...events].reverse().map((evt) => (
              <div key={evt.id} className="flex gap-3">
                <span
                  className={`shrink-0 ${
                    evt.event_type.includes("failed")
                      ? "text-rose-400"
                      : evt.event_type.includes("complete")
                        ? "text-mint-400"
                        : "text-slate-500"
                  }`}
                >
                  {evt.event_type}
                </span>
                <span className="text-slate-300">{evt.message}</span>
              </div>
            ))}
            <div ref={eventsEndRef} />
          </div>
        )}
      </section>
    </div>
  );
}
