import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Terminal,
  TestTube,
  XCircle,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { EmptyState } from "../components/EmptyState";
import { fetchProjects, fetchTests } from "../services/api";
import type { ProjectSummary, TestResultItem, TestsData } from "../types";

export function TestingWorkspace() {
  const [params] = useSearchParams();
  const projectIdParam = Number(params.get("projectId") || 0);

  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [projectId, setProjectId] = useState<number>(projectIdParam);
  const [tests, setTests] = useState<TestsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showRawOutput, setShowRawOutput] = useState(false);
  const [filter, setFilter] = useState<"all" | "passed" | "failed" | "skipped">("all");

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
    fetchTests(projectId)
      .then(setTests)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [projectId]);

  const filteredResults =
    tests?.results.filter((r) => {
      if (filter === "all") return true;
      return r.status === filter;
    }) ?? [];

  const passRate =
    tests && tests.total > 0
      ? Math.round((tests.passed / tests.total) * 100)
      : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-mint-400">QA & Test Runner</p>
          <h2 className="mt-2 text-3xl font-semibold text-white">Testing workspace</h2>
          <p className="mt-1 text-slate-400">
            Isolated execution results, test cases, and diagnostic reports from the Testing agent.
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
        <EmptyState title="Select a project" body="Choose a project to inspect test execution details." />
      ) : loading ? (
        <p className="text-slate-400">Loading test results…</p>
      ) : !tests || (tests.total === 0 && tests.results.length === 0) ? (
        <EmptyState
          title="No tests run yet"
          body="Execute the workflow in the Agent Workspace to generate pytest suites and run them safely."
        />
      ) : (
        <div className="space-y-6">
          {/* Summary metrics */}
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <div className="rounded-2xl border border-white/5 bg-ink-800/70 p-5">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs uppercase tracking-wider">Pass Rate</span>
                <TestTube size={16} className="text-mint-400" />
              </div>
              <p className="mt-2 text-3xl font-bold text-white">{passRate}%</p>
              <p className="mt-1 text-xs text-slate-500">{tests.passed} of {tests.total} passed</p>
            </div>

            <div className="rounded-2xl border border-white/5 bg-ink-800/70 p-5">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs uppercase tracking-wider">Passed</span>
                <CheckCircle2 size={16} className="text-mint-400" />
              </div>
              <p className="mt-2 text-3xl font-bold text-mint-400">{tests.passed}</p>
              <p className="mt-1 text-xs text-slate-500">Passing test cases</p>
            </div>

            <div className="rounded-2xl border border-white/5 bg-ink-800/70 p-5">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs uppercase tracking-wider">Failed</span>
                <XCircle size={16} className="text-rose-400" />
              </div>
              <p className={`mt-2 text-3xl font-bold ${tests.failed > 0 ? "text-rose-400" : "text-white"}`}>
                {tests.failed}
              </p>
              <p className="mt-1 text-xs text-slate-500">Require fixes</p>
            </div>

            <div className="rounded-2xl border border-white/5 bg-ink-800/70 p-5">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs uppercase tracking-wider">Skipped</span>
                <AlertCircle size={16} className="text-amber-400" />
              </div>
              <p className="mt-2 text-3xl font-bold text-white">{tests.skipped}</p>
              <p className="mt-1 text-xs text-slate-500">Skipped or pending</p>
            </div>

            <div className="rounded-2xl border border-white/5 bg-ink-800/70 p-5">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs uppercase tracking-wider">Total</span>
                <Clock size={16} className="text-slate-400" />
              </div>
              <p className="mt-2 text-3xl font-bold text-white">{tests.total}</p>
              <p className="mt-1 text-xs text-slate-500">Executed assertions</p>
            </div>
          </div>

          {/* Test plan notes */}
          {tests.test_plan && (
            <div className="rounded-2xl border border-white/5 bg-ink-800/70 p-5">
              <h3 className="text-sm font-semibold text-slate-300">Test strategy</h3>
              <p className="mt-2 text-sm text-slate-400">{tests.test_plan}</p>
            </div>
          )}

          {/* Action row & filter buttons */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              {(["all", "passed", "failed", "skipped"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setFilter(tab)}
                  className={`rounded-xl px-3 py-1.5 text-xs font-medium transition ${
                    filter === tab
                      ? "bg-mint-500 text-ink-950"
                      : "border border-white/10 bg-ink-900/60 text-slate-300 hover:bg-white/5"
                  }`}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                  {tab === "passed" && ` (${tests.passed})`}
                  {tab === "failed" && ` (${tests.failed})`}
                  {tab === "skipped" && ` (${tests.skipped})`}
                </button>
              ))}
            </div>

            <button
              onClick={() => setShowRawOutput(!showRawOutput)}
              className="flex items-center gap-2 rounded-xl border border-white/10 bg-ink-900/80 px-3 py-1.5 text-xs text-slate-300 transition hover:bg-white/5"
            >
              <Terminal size={14} />
              {showRawOutput ? "Hide Pytest Console" : "View Pytest Console"}
            </button>
          </div>

          {/* Pytest Console Output Viewer */}
          {showRawOutput && (
            <div className="rounded-2xl border border-white/10 bg-ink-950 p-4">
              <div className="mb-2 flex items-center justify-between border-b border-white/10 pb-2">
                <span className="font-mono text-xs text-slate-400">Subprocess stdout & stderr (safe sandbox)</span>
                <span className="rounded bg-white/5 px-2 py-0.5 font-mono text-[10px] text-slate-500">
                  exit code 0
                </span>
              </div>
              <pre className="max-h-80 overflow-auto font-mono text-xs text-slate-300 whitespace-pre-wrap">
                {tests.output || "(no raw runner output)"}
              </pre>
            </div>
          )}

          {/* Individual Test Results List */}
          <div className="space-y-3">
            {filteredResults.length === 0 ? (
              <p className="text-sm text-slate-500">No tests matching "{filter}".</p>
            ) : (
              filteredResults.map((item: TestResultItem) => (
                <div
                  key={item.id}
                  className={`rounded-xl border p-4 transition ${
                    item.status === "passed"
                      ? "border-mint-500/20 bg-mint-500/5"
                      : item.status === "failed"
                        ? "border-rose-500/20 bg-rose-500/5"
                        : "border-white/5 bg-ink-800/60"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      {item.status === "passed" ? (
                        <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-mint-400" />
                      ) : item.status === "failed" ? (
                        <XCircle size={16} className="mt-0.5 shrink-0 text-rose-400" />
                      ) : (
                        <AlertCircle size={16} className="mt-0.5 shrink-0 text-amber-400" />
                      )}
                      <div>
                        <p className="font-mono text-sm font-medium text-white">{item.name}</p>
                        {item.details && (
                          <pre className="mt-2 rounded-lg bg-ink-900/90 p-3 font-mono text-xs text-slate-300 overflow-x-auto whitespace-pre-wrap">
                            {item.details}
                          </pre>
                        )}
                      </div>
                    </div>
                    {item.duration_ms > 0 && (
                      <span className="font-mono text-xs text-slate-500 shrink-0">
                        {item.duration_ms} ms
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
