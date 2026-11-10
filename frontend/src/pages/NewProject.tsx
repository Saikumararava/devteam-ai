import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createProject, startWorkflow } from "../services/api";

const EMPTY = {
  name: "",
  description: "",
  tech_preferences: "Python, FastAPI, SQLite",
  functional_requirements: "",
  expected_output: "Runnable local project with tests and README",
};

export function NewProject() {
  const navigate = useNavigate();
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      // 1. Create the project record in DB
      const project = await createProject(form);
      // 2. Immediately trigger the LangGraph workflow
      await startWorkflow(project.id);
      // 3. Navigate to agent workspace to watch live progress
      navigate(`/workspace?projectId=${project.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start project");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-8">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-mint-400">New brief</p>
        <h2 className="mt-2 text-3xl font-semibold text-white">Start a software project</h2>
        <p className="mt-2 text-slate-400">
          Describe what you want to build. Five AI agents will plan, code, review, test, and document
          it using the local <span className="font-mono text-mint-400">qwen2.5-coder:1.5b</span> model.
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-5">
        {/* Project name */}
        <label className="block">
          <span className="text-sm font-medium text-slate-300">Project name</span>
          <input
            required
            value={form.name}
            placeholder="Warehouse inventory API"
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="mt-2 w-full rounded-xl border border-white/10 bg-ink-900 px-4 py-3 text-white outline-none ring-mint-500/40 placeholder:text-slate-600 focus:ring"
          />
        </label>

        {/* Description */}
        <label className="block">
          <span className="text-sm font-medium text-slate-300">Project description</span>
          <textarea
            rows={3}
            value={form.description}
            placeholder="A small FastAPI service that tracks stock levels."
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="mt-2 w-full rounded-xl border border-white/10 bg-ink-900 px-4 py-3 text-white outline-none ring-mint-500/40 placeholder:text-slate-600 focus:ring"
          />
        </label>

        {/* Tech preferences */}
        <label className="block">
          <span className="text-sm font-medium text-slate-300">Technology preferences</span>
          <input
            value={form.tech_preferences}
            placeholder="Python, FastAPI, SQLite"
            onChange={(e) => setForm({ ...form, tech_preferences: e.target.value })}
            className="mt-2 w-full rounded-xl border border-white/10 bg-ink-900 px-4 py-3 text-white outline-none ring-mint-500/40 placeholder:text-slate-600 focus:ring"
          />
        </label>

        {/* Requirements */}
        <label className="block">
          <span className="text-sm font-medium text-slate-300">
            Functional requirements <span className="text-rose-400">*</span>
          </span>
          <textarea
            required
            rows={7}
            value={form.functional_requirements}
            placeholder={
              "List the features the generated project must have:\n" +
              "- Create, read, update, delete inventory items\n" +
              "- Items have name, SKU, quantity, price\n" +
              "- REST API with JSON responses\n" +
              "- Input validation and error handling\n" +
              "- Pytest test suite"
            }
            onChange={(e) => setForm({ ...form, functional_requirements: e.target.value })}
            className="mt-2 w-full rounded-xl border border-white/10 bg-ink-900 px-4 py-3 text-white outline-none ring-mint-500/40 placeholder:text-slate-600 focus:ring"
          />
        </label>

        {/* Expected output */}
        <label className="block">
          <span className="text-sm font-medium text-slate-300">Expected output</span>
          <textarea
            rows={2}
            value={form.expected_output}
            placeholder="Runnable FastAPI app, pytest suite, README"
            onChange={(e) => setForm({ ...form, expected_output: e.target.value })}
            className="mt-2 w-full rounded-xl border border-white/10 bg-ink-900 px-4 py-3 text-white outline-none ring-mint-500/40 placeholder:text-slate-600 focus:ring"
          />
        </label>

        {error && (
          <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
            {error}
          </div>
        )}

        <div className="flex items-center gap-4 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="rounded-xl bg-mint-500 px-6 py-3 text-sm font-semibold text-ink-950 transition hover:bg-mint-400 disabled:opacity-60"
          >
            {saving ? "Starting agents…" : "Launch AI workflow →"}
          </button>
          <p className="text-xs text-slate-500">
            All five agents run sequentially on your local CPU. This may take a few minutes.
          </p>
        </div>
      </form>
    </div>
  );
}
