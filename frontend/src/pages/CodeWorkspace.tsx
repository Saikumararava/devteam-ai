import { Download, File, FileCode2, Folder, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { EmptyState } from "../components/EmptyState";
import { downloadProjectZip, fetchFileContent, fetchProjectFiles, fetchProjects } from "../services/api";
import type { GeneratedFile, ProjectSummary } from "../types";

const LANG_COLORS: Record<string, string> = {
  python: "text-blue-400",
  javascript: "text-yellow-400",
  typescript: "text-blue-300",
  tsx: "text-cyan-400",
  jsx: "text-cyan-400",
  html: "text-orange-400",
  css: "text-pink-400",
  json: "text-green-400",
  markdown: "text-slate-300",
  yaml: "text-purple-400",
  toml: "text-red-400",
  bash: "text-green-300",
  text: "text-slate-400",
  sql: "text-amber-400",
};

function FileIcon({ lang }: { lang: string }) {
  const cls = LANG_COLORS[lang] ?? "text-slate-400";
  return <FileCode2 size={14} className={cls} />;
}

function buildTree(files: GeneratedFile[]): Map<string, GeneratedFile[]> {
  const dirs = new Map<string, GeneratedFile[]>();
  for (const f of files) {
    const parts = f.relative_path.split("/");
    const dir = parts.length > 1 ? parts.slice(0, -1).join("/") : "(root)";
    if (!dirs.has(dir)) dirs.set(dir, []);
    dirs.get(dir)!.push(f);
  }
  return dirs;
}

export function CodeWorkspace() {
  const [params] = useSearchParams();
  const projectIdParam = Number(params.get("projectId") || 0);

  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [projectId, setProjectId] = useState<number>(projectIdParam);
  const [files, setFiles] = useState<GeneratedFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<GeneratedFile | null>(null);
  const [fileContent, setFileContent] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [contentLoading, setContentLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDownload() {
    if (!projectId) return;
    setDownloading(true);
    try {
      const curProject = projects.find((p) => p.id === projectId);
      await downloadProjectZip(projectId, curProject?.name);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to download ZIP");
    } finally {
      setDownloading(false);
    }
  }

  useEffect(() => {
    fetchProjects().then(setProjects).catch(() => {});
  }, []);

  useEffect(() => {
    if (!projectId) return;
    setLoading(true);
    fetchProjectFiles(projectId)
      .then((data) => {
        setFiles(data.files);
        setSelectedFile(null);
        setFileContent("");
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [projectId]);

  async function selectFile(file: GeneratedFile) {
    setSelectedFile(file);
    setContentLoading(true);
    try {
      const { content } = await fetchFileContent(projectId, file.relative_path);
      setFileContent(content);
    } catch (err) {
      setFileContent("// Could not load file content");
    } finally {
      setContentLoading(false);
    }
  }

  const tree = buildTree(files);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-mint-400">Generated code</p>
          <h2 className="mt-2 text-3xl font-semibold text-white">Code workspace</h2>
          <p className="mt-1 text-slate-400">Browse and inspect the files produced by the Developer agent.</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Project selector */}
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
          {projectId > 0 && files.length > 0 && (
            <button
              onClick={handleDownload}
              disabled={downloading}
              className="flex items-center gap-2 rounded-xl border border-mint-500/30 bg-mint-500/10 px-3 py-2 text-sm text-mint-300 transition hover:bg-mint-500/20 disabled:opacity-50"
            >
              {downloading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
              {downloading ? "Preparing ZIP…" : "Download ZIP"}
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
          {error}
        </div>
      )}

      {!projectId ? (
        <EmptyState title="Select a project" body="Choose a project from the dropdown to view generated files." />
      ) : loading ? (
        <p className="text-slate-400">Loading files…</p>
      ) : files.length === 0 ? (
        <EmptyState
          title="No files generated yet"
          body="Run the AI workflow from the Agent workspace to generate source files."
        />
      ) : (
        <div className="grid h-[70vh] gap-4 lg:grid-cols-[280px_1fr]">
          {/* File tree */}
          <aside className="overflow-y-auto rounded-2xl border border-white/5 bg-ink-800/70 p-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-500">
              Files ({files.length})
            </p>
            {Array.from(tree.entries()).map(([dir, dirFiles]) => (
              <div key={dir} className="mb-3">
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <Folder size={12} />
                  {dir}
                </div>
                <div className="mt-1 ml-3 space-y-0.5">
                  {dirFiles.map((f) => {
                    const name = f.relative_path.split("/").pop()!;
                    return (
                      <button
                        key={f.relative_path}
                        onClick={() => selectFile(f)}
                        className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs transition ${
                          selectedFile?.relative_path === f.relative_path
                            ? "bg-mint-500/15 text-mint-300"
                            : "text-slate-300 hover:bg-white/5"
                        }`}
                      >
                        <FileIcon lang={f.language} />
                        <span className="truncate">{name}</span>
                        <span className="ml-auto text-slate-600">
                          {f.size_bytes < 1024
                            ? `${f.size_bytes}B`
                            : `${(f.size_bytes / 1024).toFixed(1)}KB`}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </aside>

          {/* Code viewer */}
          <div className="overflow-hidden rounded-2xl border border-white/5 bg-ink-800/70">
            {!selectedFile ? (
              <div className="flex h-full items-center justify-center text-slate-500">
                <div className="text-center">
                  <File size={32} className="mx-auto mb-3 opacity-30" />
                  <p className="text-sm">Select a file to view its contents</p>
                </div>
              </div>
            ) : (
              <div className="flex h-full flex-col">
                {/* File tab */}
                <div className="flex items-center gap-3 border-b border-white/5 px-4 py-3">
                  <FileIcon lang={selectedFile.language} />
                  <span className="text-sm text-slate-200">{selectedFile.relative_path}</span>
                  <span className="ml-auto rounded-full bg-ink-700 px-2 py-0.5 text-xs text-slate-400">
                    {selectedFile.language}
                  </span>
                </div>
                {/* Content */}
                <div className="flex-1 overflow-auto">
                  {contentLoading ? (
                    <div className="p-6 text-sm text-slate-400">Loading…</div>
                  ) : (
                    <pre className="p-4 font-mono text-xs leading-6 text-slate-200 whitespace-pre-wrap break-words">
                      {fileContent}
                    </pre>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
