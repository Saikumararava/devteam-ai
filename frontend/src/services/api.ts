import axios from "axios";
import type {
  DashboardStats,
  DocsData,
  GeneratedFile,
  ModelStatus,
  ProjectCreate,
  ProjectDetail,
  ProjectSummary,
  ReviewData,
  TestsData,
} from "../types";

export const api = axios.create({
  baseURL: "/api",
  timeout: 30000,
});

// --- Health & Model ---

export async function fetchHealth() {
  const { data } = await api.get("/health");
  return data as { status: string; service: string };
}

export async function fetchModelStatus() {
  const { data } = await api.get("/model/status");
  return data as ModelStatus;
}

// --- Projects ---

export async function fetchProjects() {
  const { data } = await api.get("/projects");
  return data as ProjectSummary[];
}

export async function fetchStats() {
  const { data } = await api.get("/projects/stats");
  return data as DashboardStats;
}

export async function fetchActivity() {
  const { data } = await api.get("/projects/activity");
  return data as Array<{
    id: number;
    project_id: number | null;
    event_type: string;
    message: string;
    created_at: string | null;
  }>;
}

export async function fetchProject(id: number) {
  const { data } = await api.get(`/projects/${id}`);
  return data as ProjectDetail;
}

export async function createProject(payload: ProjectCreate) {
  const { data } = await api.post("/projects", payload);
  return data as ProjectDetail;
}

// --- Workflow ---

export async function startWorkflow(projectId: number) {
  const { data } = await api.post(`/projects/${projectId}/start`);
  return data as { project_id: number; accepted: boolean; reason: string; status: string };
}

// --- Files ---

export async function fetchProjectFiles(projectId: number) {
  const { data } = await api.get(`/projects/${projectId}/files`);
  return data as { project_id: number; files: GeneratedFile[] };
}

export async function fetchFileContent(projectId: number, path: string) {
  const { data } = await api.get(`/projects/${projectId}/files/content`, {
    params: { path },
  });
  return data as { path: string; content: string };
}

export function getDownloadUrl(projectId: number): string {
  return `/api/projects/${projectId}/download`;
}

export async function downloadProjectZip(projectId: number, projectName?: string): Promise<void> {
  const response = await api.get(`/projects/${projectId}/download`, {
    responseType: "blob",
  });
  const blob = new Blob([response.data], { type: "application/zip" });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  const safeName = (projectName || "project").replace(/[^a-zA-Z0-9_-]/g, "_");
  link.setAttribute("download", `${safeName}_${projectId}.zip`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

// --- Review ---

export async function fetchReview(projectId: number) {
  const { data } = await api.get(`/projects/${projectId}/review`);
  return data as ReviewData;
}

// --- Tests ---

export async function fetchTests(projectId: number) {
  const { data } = await api.get(`/projects/${projectId}/tests`);
  return data as TestsData;
}

// --- Documentation ---

export async function fetchDocumentation(projectId: number) {
  const { data } = await api.get(`/projects/${projectId}/documentation`);
  return data as DocsData;
}

// --- SSE stream helper ---

export function createEventStream(
  projectId: number,
  onMessage: (data: Record<string, unknown>) => void,
  onError?: (err: Event) => void,
): EventSource {
  const es = new EventSource(`/api/projects/${projectId}/stream`);
  es.onmessage = (event) => {
    try {
      onMessage(JSON.parse(event.data));
    } catch {
      /* ignore parse errors */
    }
  };
  if (onError) es.onerror = onError;
  return es;
}
