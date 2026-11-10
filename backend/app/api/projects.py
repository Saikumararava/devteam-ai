"""
Projects API — full implementation with SSE streaming and agent endpoints.
"""
from __future__ import annotations

import json
import time

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response, StreamingResponse
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.models.project import AgentOutput, GeneratedFile, ReviewFinding, TestResult, WorkflowEvent
from app.schemas.project import ProjectCreate, ProjectDetail, ProjectSummary
from app.services.file_manager import create_zip, list_generated_files, read_generated_file
from app.services.projects import (
    create_project,
    get_project,
    list_projects,
    project_stats,
    to_detail,
    to_summary,
)
from app.services.workflow import is_running, start_workflow

router = APIRouter(prefix="/api/projects", tags=["projects"])

# ---------------------------------------------------------------------------
# Project CRUD
# ---------------------------------------------------------------------------


@router.get("", response_model=list[ProjectSummary])
def list_all_projects(db: Session = Depends(get_db)) -> list[ProjectSummary]:
    return [to_summary(item) for item in list_projects(db)]


@router.post("", response_model=ProjectDetail, status_code=201)
def create_new_project(payload: ProjectCreate, db: Session = Depends(get_db)) -> ProjectDetail:
    project = create_project(db, payload)
    stored = get_project(db, project.id)
    if stored is None:
        raise HTTPException(status_code=500, detail="Project was created but could not be reloaded.")
    return to_detail(stored)


@router.get("/stats")
def stats(db: Session = Depends(get_db)) -> dict[str, int]:
    return project_stats(db)


@router.get("/activity")
def recent_activity(db: Session = Depends(get_db)) -> list[dict]:
    events = (
        db.query(WorkflowEvent)
        .order_by(WorkflowEvent.id.desc())
        .limit(10)
        .all()
    )
    return [
        {
            "id": e.id,
            "project_id": e.project_id,
            "event_type": e.event_type,
            "message": e.message,
            "created_at": str(e.created_at) if e.created_at else None,
        }
        for e in events
    ]


@router.get("/{project_id}", response_model=ProjectDetail)
def read_project(project_id: int, db: Session = Depends(get_db)) -> ProjectDetail:
    project = get_project(db, project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found.")
    return to_detail(project)


@router.get("/{project_id}/status", response_model=ProjectDetail)
def project_status(project_id: int, db: Session = Depends(get_db)) -> ProjectDetail:
    return read_project(project_id, db)


# ---------------------------------------------------------------------------
# Workflow control
# ---------------------------------------------------------------------------


@router.post("/{project_id}/start")
def start_project_workflow(project_id: int, db: Session = Depends(get_db)) -> dict:
    """
    Launch the LangGraph multi-agent workflow for the given project.
    Returns immediately; use the /stream endpoint for live progress.
    """
    project = get_project(db, project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found.")

    if is_running(project_id):
        return {
            "project_id": project_id,
            "accepted": False,
            "reason": "Workflow is already running for this project.",
            "status": project.status,
        }

    try:
        started = start_workflow(project_id, db)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    return {
        "project_id": project_id,
        "accepted": started,
        "reason": "Workflow started. Stream progress via GET /api/projects/{id}/stream",
        "status": "running",
    }


# ---------------------------------------------------------------------------
# SSE streaming endpoint — real-time agent progress
# ---------------------------------------------------------------------------


@router.get("/{project_id}/stream")
def stream_project_events(project_id: int, db: Session = Depends(get_db)):
    """
    Server-Sent Events endpoint.

    Clients connect here and receive live workflow event updates as they happen.
    The stream ends when the project status becomes 'completed', 'failed',
    or is no longer running.
    """
    def _event_generator():
        seen_event_ids: set[int] = set()
        max_polls = 600  # 600 × 2 s = 20 min max
        for _ in range(max_polls):
            # Fresh DB session per poll tick
            session = db
            project = get_project(session, project_id)
            if project is None:
                yield _sse({"type": "error", "message": "Project not found"})
                return

            # Emit new events
            new_events = [
                e for e in sorted(project.events, key=lambda x: x.id)
                if e.id not in seen_event_ids
            ]
            for evt in new_events:
                seen_event_ids.add(evt.id)
                yield _sse({
                    "type": "event",
                    "id": evt.id,
                    "event_type": evt.event_type,
                    "message": evt.message,
                    "created_at": str(evt.created_at) if evt.created_at else None,
                })

            # Emit current agent statuses
            detail = to_detail(project)
            yield _sse({
                "type": "agents",
                "agents": [a.model_dump() for a in detail.agents],
                "project_status": project.status,
            })

            # Stop when workflow is done
            if project.status in ("completed", "failed") and not is_running(project_id):
                yield _sse({"type": "done", "project_status": project.status})
                return

            time.sleep(2)

        yield _sse({"type": "timeout", "message": "Stream timeout reached."})

    return StreamingResponse(
        _event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


def _sse(data: dict) -> str:
    return f"data: {json.dumps(data)}\n\n"


# ---------------------------------------------------------------------------
# Agent outputs
# ---------------------------------------------------------------------------


@router.get("/{project_id}/agents")
def project_agents(project_id: int, db: Session = Depends(get_db)) -> dict:
    project = get_project(db, project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found.")
    detail = to_detail(project)
    return {"project_id": project.id, "agents": [agent.model_dump() for agent in detail.agents]}


# ---------------------------------------------------------------------------
# Generated files
# ---------------------------------------------------------------------------


@router.get("/{project_id}/files")
def project_files(project_id: int, db: Session = Depends(get_db)) -> dict:
    project = get_project(db, project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found.")
    files = list_generated_files(project_id)
    return {"project_id": project_id, "files": files}


@router.get("/{project_id}/files/content")
def file_content(project_id: int, path: str, db: Session = Depends(get_db)) -> dict:
    """Return the text content of a specific generated file."""
    project = get_project(db, project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found.")
    try:
        content = read_generated_file(project_id, path)
    except (ValueError, FileNotFoundError) as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return {"path": path, "content": content}


# ---------------------------------------------------------------------------
# Code review
# ---------------------------------------------------------------------------


@router.get("/{project_id}/review")
def project_review(project_id: int, db: Session = Depends(get_db)) -> dict:
    project = get_project(db, project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found.")

    # Get the reviewer output
    output = (
        db.query(AgentOutput)
        .filter_by(project_id=project_id, agent_name="reviewer")
        .order_by(AgentOutput.id.desc())
        .first()
    )
    findings = (
        db.query(ReviewFinding)
        .filter_by(project_id=project_id)
        .order_by(ReviewFinding.id)
        .all()
    )

    review_data: dict = {}
    if output and output.payload:
        try:
            review_data = json.loads(output.payload)
        except json.JSONDecodeError:
            pass

    return {
        "project_id": project_id,
        "summary": review_data.get("summary", output.summary if output else ""),
        "quality_score": review_data.get("quality_score", 0),
        "approved": review_data.get("approved", False),
        "has_critical": review_data.get("has_critical", False),
        "findings": [
            {
                "id": f.id,
                "severity": f.severity,
                "category": f.category,
                "title": f.title,
                "details": f.details,
                "suggested_fix": f.suggested_fix,
                "approved": f.approved,
            }
            for f in findings
        ],
    }


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------


@router.get("/{project_id}/tests")
def project_tests(project_id: int, db: Session = Depends(get_db)) -> dict:
    project = get_project(db, project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found.")

    output = (
        db.query(AgentOutput)
        .filter_by(project_id=project_id, agent_name="tester")
        .order_by(AgentOutput.id.desc())
        .first()
    )
    results = (
        db.query(TestResult)
        .filter_by(project_id=project_id)
        .order_by(TestResult.id)
        .all()
    )

    tester_data: dict = {}
    if output and output.payload:
        try:
            tester_data = json.loads(output.payload)
        except json.JSONDecodeError:
            pass

    return {
        "project_id": project_id,
        "test_plan": tester_data.get("test_plan", ""),
        "passed": tester_data.get("passed", 0),
        "failed": tester_data.get("failed", 0),
        "skipped": tester_data.get("skipped", 0),
        "total": tester_data.get("total", 0),
        "output": tester_data.get("output", ""),
        "summary": output.summary if output else "No tests run yet.",
        "results": [
            {
                "id": r.id,
                "name": r.name,
                "status": r.status,
                "details": r.details,
                "duration_ms": r.duration_ms,
            }
            for r in results
        ],
    }


# ---------------------------------------------------------------------------
# Documentation
# ---------------------------------------------------------------------------


@router.get("/{project_id}/documentation")
def project_docs(project_id: int, db: Session = Depends(get_db)) -> dict:
    project = get_project(db, project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found.")

    output = (
        db.query(AgentOutput)
        .filter_by(project_id=project_id, agent_name="documentation")
        .order_by(AgentOutput.id.desc())
        .first()
    )
    docs_data: dict = {}
    if output and output.payload:
        try:
            docs_data = json.loads(output.payload)
        except json.JSONDecodeError:
            pass

    return {
        "project_id": project_id,
        "readme": docs_data.get("readme", ""),
        "api_docs": docs_data.get("api_docs", ""),
        "architecture_overview": docs_data.get("architecture_overview", ""),
        "setup_instructions": docs_data.get("setup_instructions", ""),
        "report": docs_data.get("report", ""),
    }


# ---------------------------------------------------------------------------
# ZIP download
# ---------------------------------------------------------------------------


@router.get("/{project_id}/download")
def project_download(project_id: int, db: Session = Depends(get_db)) -> Response:
    project = get_project(db, project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found.")

    files = list_generated_files(project_id)
    if not files:
        raise HTTPException(
            status_code=409,
            detail="No files have been generated yet. Run the workflow first.",
        )

    zip_bytes = create_zip(project_id)
    safe_name = "".join(c if c.isalnum() or c in "-_" else "_" for c in project.name)
    filename = f"{safe_name}_{project_id}.zip"

    return Response(
        content=zip_bytes,
        media_type="application/zip",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
