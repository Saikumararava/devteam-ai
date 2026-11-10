// All TypeScript types shared across the frontend.

export type AgentStatusName =
  | "idle"
  | "pending"
  | "running"
  | "completed"
  | "failed"
  | "waiting for approval";

export interface ModelStatus {
  connected: boolean;
  base_url: string;
  configured_model: string;
  model_available: boolean;
  available_models: string[];
  error: string | null;
  inference_notes: string;
}

export interface AgentStatus {
  agent_name: string;
  status: string;
  current_task: string;
  progress: number;
  duration_ms: number;
}

export interface WorkflowEvent {
  id: number;
  event_type: string;
  message: string;
  created_at: string | null;
}

export interface ProjectSummary {
  id: number;
  name: string;
  description: string;
  status: string;
  created_at: string | null;
  updated_at: string | null;
}

export interface ProjectDetail extends ProjectSummary {
  tech_preferences: string;
  expected_output: string;
  human_approval_required: boolean;
  correction_cycles: number;
  functional_requirements: string;
  agents: AgentStatus[];
  events: WorkflowEvent[];
}

export interface ProjectCreate {
  name: string;
  description: string;
  tech_preferences: string;
  functional_requirements: string;
  expected_output: string;
}

export interface DashboardStats {
  total_projects: number;
  completed_tasks: number;
  active_agents: number;
}

export interface GeneratedFile {
  relative_path: string;
  language: string;
  size_bytes: number;
  checksum?: string;
}

export interface ReviewFinding {
  id: number;
  severity: "critical" | "high" | "medium" | "low" | "info";
  category: string;
  title: string;
  details: string;
  suggested_fix: string;
  approved: boolean;
}

export interface ReviewData {
  project_id: number;
  summary: string;
  quality_score: number;
  approved: boolean;
  has_critical: boolean;
  findings: ReviewFinding[];
}

export interface TestResultItem {
  id: number;
  name: string;
  status: "passed" | "failed" | "skipped" | "error";
  details: string;
  duration_ms: number;
}

export interface TestsData {
  project_id: number;
  test_plan: string;
  passed: number;
  failed: number;
  skipped: number;
  total: number;
  output: string;
  summary: string;
  results: TestResultItem[];
}

export interface DocsData {
  project_id: number;
  readme: string;
  api_docs: string;
  architecture_overview: string;
  setup_instructions: string;
  report: string;
}

export interface SSEAgentUpdate {
  type: "agents" | "event" | "done" | "error" | "timeout";
  agents?: AgentStatus[];
  project_status?: string;
  event_type?: string;
  message?: string;
  id?: number;
  created_at?: string | null;
}
