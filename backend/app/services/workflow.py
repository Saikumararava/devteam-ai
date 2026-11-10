"""
Workflow service — runs the LangGraph pipeline in a background thread
so the FastAPI endpoint can return immediately and stream SSE events.
"""
from __future__ import annotations

import logging
import threading
from typing import Any

from sqlalchemy.orm import Session

from app.models.project import Project, Requirement
from app.orchestration.graph import get_graph
from app.orchestration.state import WorkflowState

logger = logging.getLogger(__name__)

# project_id → thread
_running: dict[int, threading.Thread] = {}


def is_running(project_id: int) -> bool:
    t = _running.get(project_id)
    return t is not None and t.is_alive()


def start_workflow(project_id: int, db: Session) -> bool:
    """
    Launch the LangGraph graph for the given project in a background thread.

    Returns True if the workflow was started, False if it's already running.
    """
    if is_running(project_id):
        logger.info("Workflow already running for project %d", project_id)
        return False

    project: Project | None = db.query(Project).filter_by(id=project_id).first()
    if project is None:
        raise ValueError(f"Project {project_id} not found")

    req: Requirement | None = project.requirement
    requirements = req.functional_requirements if req else ""
    raw_prompt = req.raw_prompt if req else ""

    initial_state: WorkflowState = {
        "project_id": project_id,
        "requirements": requirements or raw_prompt or project.description,
        "tech_preferences": project.tech_preferences,
        "expected_output": project.expected_output,
        "plan": {},
        "generated_files": [],
        "review": {},
        "tests": {},
        "documentation": {},
        "agents": [],
        "history": [],
        "correction_cycles": 0,
        "needs_human": False,
    }

    def _run() -> None:
        try:
            graph = get_graph()
            logger.info("Starting LangGraph workflow for project %d", project_id)
            graph.invoke(initial_state)
            logger.info("LangGraph workflow completed for project %d", project_id)
        except Exception as exc:  # noqa: BLE001
            logger.exception("LangGraph workflow error for project %d: %s", project_id, exc)
        finally:
            _running.pop(project_id, None)

    thread = threading.Thread(target=_run, name=f"workflow-{project_id}", daemon=True)
    _running[project_id] = thread
    thread.start()
    return True
