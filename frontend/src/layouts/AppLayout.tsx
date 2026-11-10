import {
  Bot,
  FileCode2,
  FolderGit2,
  History,
  LayoutDashboard,
  Plus,
  ShieldCheck,
  TestTubes,
} from "lucide-react";
import { NavLink, Outlet } from "react-router-dom";
import { useModelStatus } from "../hooks/useModelStatus";
import { StatusBadge } from "../components/StatusBadge";

const NAV = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/projects/new", label: "New Project", icon: Plus },
  { to: "/workspace", label: "Agents", icon: Bot },
  { to: "/code", label: "Generated Code", icon: FileCode2 },
  { to: "/review", label: "Code Review", icon: ShieldCheck },
  { to: "/tests", label: "Testing", icon: TestTubes },
  { to: "/docs", label: "Documentation", icon: FolderGit2 },
  { to: "/history", label: "History", icon: History },
];

export function AppLayout() {
  const { status, error, loading } = useModelStatus();
  const modelLabel = loading
    ? "checking"
    : status?.connected && status.model_available
      ? "connected"
      : status?.connected
        ? "pending"
        : "offline";

  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 border-r border-white/5 bg-ink-900/90 px-4 py-6 lg:flex lg:flex-col">
        <div className="px-2">
          <p className="font-mono text-xs uppercase tracking-[0.28em] text-mint-400">Local workspace</p>
          <h1 className="mt-2 text-2xl font-semibold text-white">DevTeam AI</h1>
          <p className="mt-1 text-sm text-slate-400">Five agents. One CPU. No cloud keys.</p>
        </div>
        <nav className="mt-8 flex flex-1 flex-col gap-1">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${
                  isActive ? "bg-white/8 text-white" : "text-slate-400 hover:bg-white/5 hover:text-white"
                }`
              }
            >
              <item.icon size={16} />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="rounded-2xl border border-white/5 bg-ink-800 p-4">
          <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Ollama</p>
          <div className="mt-2 flex items-center justify-between gap-2">
            <span className="truncate font-mono text-xs text-slate-300">
              {status?.configured_model ?? "qwen2.5-coder:1.5b"}
            </span>
            <StatusBadge value={modelLabel} />
          </div>
          {error && <p className="mt-2 text-xs text-rose-300">Backend unreachable</p>}
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-white/5 px-4 py-4 lg:px-8">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Software development room</p>
            <p className="text-sm text-slate-300">Planner → Developer → Reviewer → Tester → Docs</p>
          </div>
          <StatusBadge value={modelLabel} />
        </header>
        <main className="flex-1 px-4 py-6 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
