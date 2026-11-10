import { useCallback, useEffect, useState } from "react";
import { fetchProjects, fetchStats } from "../services/api";
import type { DashboardStats, ProjectSummary } from "../types";

export function useProjects() {
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const [nextProjects, nextStats] = await Promise.all([fetchProjects(), fetchStats()]);
      setProjects(nextProjects);
      setStats(nextStats);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load projects");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { projects, stats, error, loading, refresh };
}
