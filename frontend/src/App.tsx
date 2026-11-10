import { Navigate, Route, Routes } from "react-router-dom";
import { AppLayout } from "./layouts/AppLayout";
import { AgentWorkspace } from "./pages/AgentWorkspace";
import { CodeReview } from "./pages/CodeReview";
import { CodeWorkspace } from "./pages/CodeWorkspace";
import { Dashboard } from "./pages/Dashboard";
import { DocumentationPage } from "./pages/Documentation";
import { NewProject } from "./pages/NewProject";
import { ProjectHistory } from "./pages/ProjectHistory";
import { TestingWorkspace } from "./pages/TestingWorkspace";

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/projects/new" element={<NewProject />} />
        <Route path="/workspace" element={<AgentWorkspace />} />
        <Route path="/code" element={<CodeWorkspace />} />
        <Route path="/review" element={<CodeReview />} />
        <Route path="/tests" element={<TestingWorkspace />} />
        <Route path="/docs" element={<DocumentationPage />} />
        <Route path="/history" element={<ProjectHistory />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
