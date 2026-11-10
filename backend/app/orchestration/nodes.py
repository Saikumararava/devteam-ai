"""
LangGraph workflow nodes — Phase 5.

Each node wraps one agent call and updates the shared WorkflowState.
Nodes also persist progress back to the database in real time.
"""
from __future__ import annotations

import json
import logging
from datetime import datetime, timezone
from typing import Any

from sqlalchemy.orm import Session

from app.agents.developer import run_developer
from app.agents.documentation import run_documentation
from app.agents.planner import run_planner
from app.agents.reviewer import run_reviewer
from app.agents.tester import run_tester
from app.database.session import SessionLocal
from app.models.project import (
    AgentExecution,
    AgentOutput,
    GeneratedFile,
    Project,
    ReviewFinding,
    TestResult,
    WorkflowEvent,
)
from app.orchestration.state import WorkflowState
from app.services.file_manager import list_generated_files

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# DB helpers
# ---------------------------------------------------------------------------


def _get_db() -> Session:
    return SessionLocal()


def _update_agent(
    db: Session,
    project_id: int,
    agent_name: str,
    *,
    status: str,
    task: str = "",
    progress: int = 0,
    duration_ms: int = 0,
) -> None:
    row = (
        db.query(AgentExecution)
        .filter_by(project_id=project_id, agent_name=agent_name)
        .first()
    )
    if row:
        row.status = status
        row.current_task = task
        row.progress = progress
        row.duration_ms = duration_ms
        if status == "running" and not row.started_at:
            row.started_at = datetime.now(timezone.utc)
        if status in ("completed", "failed"):
            row.finished_at = datetime.now(timezone.utc)
    db.commit()


def _add_event(db: Session, project_id: int, event_type: str, message: str) -> None:
    db.add(WorkflowEvent(project_id=project_id, event_type=event_type, message=message))
    db.commit()


def _set_project_status(db: Session, project_id: int, status: str) -> None:
    project = db.query(Project).filter_by(id=project_id).first()
    if project:
        project.status = status
        db.commit()


# ---------------------------------------------------------------------------
# Node: Planner
# ---------------------------------------------------------------------------


def node_planner(state: WorkflowState) -> WorkflowState:
    project_id = state["project_id"]
    db = _get_db()
    try:
        _update_agent(db, project_id, "planner", status="running", task="Analyzing requirements", progress=10)
        _add_event(db, project_id, "planner.start", "Planner agent started")
        _set_project_status(db, project_id, "planning")

        requirements = state.get("requirements", "")
        tech_prefs = state.get("tech_preferences", "")
        expected_output = state.get("expected_output", "")

        plan, duration_ms = run_planner(requirements, tech_prefs, expected_output)

        # Persist output
        db.add(AgentOutput(
            project_id=project_id,
            agent_name="planner",
            output_type="json",
            summary=plan.get("summary", ""),
            payload=json.dumps(plan),
        ))
        _update_agent(db, project_id, "planner", status="completed", task="Plan ready", progress=100, duration_ms=duration_ms)
        _add_event(db, project_id, "planner.complete", f"Plan created: {len(plan.get('tasks', []))} tasks")

        new_state = dict(state)
        new_state["plan"] = plan
        new_state.setdefault("history", []).append(f"Planner completed: {plan.get('summary', '')[:80]}")
        return new_state
    except Exception as exc:  # noqa: BLE001
        logger.exception("Planner node failed")
        _update_agent(db, project_id, "planner", status="failed", task=str(exc), progress=0)
        _add_event(db, project_id, "planner.failed", str(exc))
        new_state = dict(state)
        new_state.setdefault("history", []).append(f"Planner FAILED: {exc}")
        new_state["needs_human"] = True
        return new_state
    finally:
        db.close()


# ---------------------------------------------------------------------------
# Node: Developer
# ---------------------------------------------------------------------------


def node_developer(state: WorkflowState) -> WorkflowState:
    project_id = state["project_id"]
    plan = state.get("plan", {})
    db = _get_db()
    try:
        _update_agent(db, project_id, "developer", status="running", task="Generating source files", progress=10)
        _add_event(db, project_id, "developer.start", "Developer agent started")
        _set_project_status(db, project_id, "developing")

        def _dev_progress(rel_path: str, current_idx: int, total_expected: int) -> None:
            pct = min(95, int((current_idx / max(1, total_expected)) * 100))
            _update_agent(
                db,
                project_id,
                "developer",
                status="running",
                task=f"Generated {rel_path} ({current_idx}/{total_expected})",
                progress=pct,
            )
            _add_event(
                db,
                project_id,
                "developer.file",
                f"Generated {rel_path} ({current_idx}/{total_expected})",
            )

        generated_files, total_ms, count = run_developer(project_id, plan, on_progress=_dev_progress)

        # Persist file records
        for f in generated_files:
            db.add(GeneratedFile(
                project_id=project_id,
                relative_path=f["relative_path"],
                language=f.get("language", "text"),
                size_bytes=f.get("size_bytes", 0),
                checksum=f.get("checksum", ""),
            ))
        db.commit()

        db.add(AgentOutput(
            project_id=project_id,
            agent_name="developer",
            output_type="files",
            summary=f"{count} files generated",
            payload=json.dumps(generated_files),
        ))
        _update_agent(db, project_id, "developer", status="completed", task=f"{count} files written", progress=100, duration_ms=total_ms)
        _add_event(db, project_id, "developer.complete", f"{count} source files written")

        new_state = dict(state)
        new_state["generated_files"] = generated_files
        new_state.setdefault("history", []).append(f"Developer completed: {count} files")
        return new_state
    except Exception as exc:
        logger.exception("Developer node failed")
        _update_agent(db, project_id, "developer", status="failed", task=str(exc), progress=0)
        _add_event(db, project_id, "developer.failed", str(exc))
        new_state = dict(state)
        new_state.setdefault("history", []).append(f"Developer FAILED: {exc}")
        new_state["needs_human"] = True
        return new_state
    finally:
        db.close()


# ---------------------------------------------------------------------------
# Node: Reviewer
# ---------------------------------------------------------------------------


def node_reviewer(state: WorkflowState) -> WorkflowState:
    project_id = state["project_id"]
    plan = state.get("plan", {})
    db = _get_db()
    try:
        _update_agent(db, project_id, "reviewer", status="running", task="Reviewing generated code", progress=10)
        _add_event(db, project_id, "reviewer.start", "Code Reviewer agent started")
        _set_project_status(db, project_id, "reviewing")

        review, duration_ms = run_reviewer(project_id, plan)

        # Persist findings
        for finding in review.get("findings", []):
            db.add(ReviewFinding(
                project_id=project_id,
                severity=finding.get("severity", "info"),
                category=finding.get("category", "quality"),
                title=finding.get("title", ""),
                details=finding.get("details", ""),
                suggested_fix=finding.get("suggested_fix", ""),
                approved=review.get("approved", False),
            ))
        db.add(AgentOutput(
            project_id=project_id,
            agent_name="reviewer",
            output_type="json",
            summary=review.get("summary", ""),
            payload=json.dumps(review),
        ))
        _update_agent(db, project_id, "reviewer", status="completed", task=f"Score: {review.get('quality_score', 0)}/100", progress=100, duration_ms=duration_ms)
        _add_event(db, project_id, "reviewer.complete", f"Review done. Score={review.get('quality_score')}, Approved={review.get('approved')}")

        new_state = dict(state)
        new_state["review"] = review
        new_state.setdefault("history", []).append(f"Reviewer: score={review.get('quality_score')}")
        return new_state
    except Exception as exc:
        logger.exception("Reviewer node failed")
        _update_agent(db, project_id, "reviewer", status="failed", task=str(exc), progress=0)
        _add_event(db, project_id, "reviewer.failed", str(exc))
        new_state = dict(state)
        new_state.setdefault("history", []).append(f"Reviewer FAILED: {exc}")
        return new_state
    finally:
        db.close()


# ---------------------------------------------------------------------------
# Node: Tester
# ---------------------------------------------------------------------------


def node_tester(state: WorkflowState) -> WorkflowState:
    project_id = state["project_id"]
    plan = state.get("plan", {})
    generated_files = state.get("generated_files", [])
    db = _get_db()
    try:
        _update_agent(db, project_id, "tester", status="running", task="Generating and running tests", progress=10)
        _add_event(db, project_id, "tester.start", "Testing agent started")
        _set_project_status(db, project_id, "testing")

        tests, duration_ms = run_tester(project_id, plan, generated_files)

        # Persist individual results
        for result in tests.get("results", []):
            db.add(TestResult(
                project_id=project_id,
                name=result.get("name", "test"),
                status=result.get("status", "unknown"),
                details=result.get("details", ""),
                duration_ms=result.get("duration_ms", 0),
            ))
        db.add(AgentOutput(
            project_id=project_id,
            agent_name="tester",
            output_type="json",
            summary=f"Tests: {tests.get('passed', 0)} passed, {tests.get('failed', 0)} failed",
            payload=json.dumps({k: v for k, v in tests.items() if k != "results"}),
        ))
        _update_agent(
            db, project_id, "tester",
            status="completed",
            task=f"{tests.get('passed', 0)}/{tests.get('total', 0)} passed",
            progress=100,
            duration_ms=duration_ms,
        )
        _add_event(db, project_id, "tester.complete", f"Tests complete: {tests.get('passed')}/{tests.get('total')} passed")

        new_state = dict(state)
        new_state["tests"] = tests
        new_state.setdefault("history", []).append(
            f"Tester: {tests.get('passed')}/{tests.get('total')} passed"
        )
        return new_state
    except Exception as exc:
        logger.exception("Tester node failed")
        _update_agent(db, project_id, "tester", status="failed", task=str(exc), progress=0)
        _add_event(db, project_id, "tester.failed", str(exc))
        new_state = dict(state)
        new_state.setdefault("history", []).append(f"Tester FAILED: {exc}")
        return new_state
    finally:
        db.close()


# ---------------------------------------------------------------------------
# Node: Documentation
# ---------------------------------------------------------------------------


def node_documentation(state: WorkflowState) -> WorkflowState:
    project_id = state["project_id"]
    plan = state.get("plan", {})
    generated_files = state.get("generated_files", [])
    review = state.get("review", {})
    tests = state.get("tests", {})
    db = _get_db()
    try:
        _update_agent(db, project_id, "documentation", status="running", task="Writing documentation", progress=10)
        _add_event(db, project_id, "documentation.start", "Documentation agent started")
        _set_project_status(db, project_id, "documenting")

        docs, duration_ms = run_documentation(project_id, plan, generated_files, review, tests)

        db.add(AgentOutput(
            project_id=project_id,
            agent_name="documentation",
            output_type="json",
            summary="README and report generated",
            payload=json.dumps(docs),
        ))
        _update_agent(db, project_id, "documentation", status="completed", task="Docs written", progress=100, duration_ms=duration_ms)
        _add_event(db, project_id, "documentation.complete", "Documentation written — workflow complete")
        _set_project_status(db, project_id, "completed")

        new_state = dict(state)
        new_state["documentation"] = docs
        new_state.setdefault("history", []).append("Documentation complete — project finished")
        return new_state
    except Exception as exc:
        logger.exception("Documentation node failed")
        _update_agent(db, project_id, "documentation", status="failed", task=str(exc), progress=0)
        _add_event(db, project_id, "documentation.failed", str(exc))
        new_state = dict(state)
        new_state.setdefault("history", []).append(f"Documentation FAILED: {exc}")
        return new_state
    finally:
        db.close()


# ---------------------------------------------------------------------------
# Conditional routing
# ---------------------------------------------------------------------------


def route_after_reviewer(state: WorkflowState) -> str:
    """
    If review found critical issues and correction cycles remain,
    route back to developer. Otherwise continue to testing.
    """
    review = state.get("review", {})
    cycles = state.get("correction_cycles", 0)
    has_critical = review.get("has_critical", False)

    if has_critical and cycles < 2:
        return "developer"
    return "tester"


def route_after_tester(state: WorkflowState) -> str:
    """
    If tests failed and correction cycles remain, route back to developer.
    Otherwise continue to documentation.
    """
    tests = state.get("tests", {})
    cycles = state.get("correction_cycles", 0)
    failed = tests.get("failed", 0)

    if failed > 0 and cycles < 2:
        return "developer"
    return "documenter"


def node_increment_cycles(state: WorkflowState) -> WorkflowState:
    """Increment the correction cycle counter before re-running developer."""
    new_state = dict(state)
    new_state["correction_cycles"] = state.get("correction_cycles", 0) + 1
    project_id = state["project_id"]
    db = _get_db()
    try:
        project = db.query(Project).filter_by(id=project_id).first()
        if project:
            project.correction_cycles = new_state["correction_cycles"]
            db.commit()
        _add_event(db, project_id, "workflow.retry", f"Correction cycle #{new_state['correction_cycles']}")
    finally:
        db.close()
    return new_state
