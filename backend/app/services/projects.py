from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.models.project import AgentExecution, Project, Requirement, WorkflowEvent
from app.schemas.project import AgentStatus, ProjectCreate, ProjectDetail, ProjectSummary, WorkflowEventOut

AGENT_ROSTER = [
    ("planner", "Break requirements into architecture and tasks"),
    ("developer", "Generate source files from the approved plan"),
    ("reviewer", "Inspect quality, bugs, and security issues"),
    ("tester", "Create and run isolated tests"),
    ("documentation", "Write README, API docs, and the final report"),
]


def _seed_agents(db: Session, project: Project) -> None:
    for name, task in AGENT_ROSTER:
        db.add(
            AgentExecution(
                project_id=project.id,
                agent_name=name,
                status="idle",
                current_task=task,
                progress=0,
            )
        )


def create_project(db: Session, payload: ProjectCreate) -> Project:
    project = Project(
        name=payload.name.strip(),
        description=payload.description.strip(),
        tech_preferences=payload.tech_preferences.strip(),
        expected_output=payload.expected_output.strip(),
        status="draft",
    )
    db.add(project)
    db.flush()
    db.add(
        Requirement(
            project_id=project.id,
            functional_requirements=payload.functional_requirements.strip(),
            raw_prompt=payload.functional_requirements.strip() or payload.description.strip(),
        )
    )
    _seed_agents(db, project)
    db.add(
        WorkflowEvent(
            project_id=project.id,
            event_type="project.created",
            message=f"Project '{project.name}' captured. Workflow not started yet.",
        )
    )
    db.commit()
    db.refresh(project)
    return project


def list_projects(db: Session) -> list[Project]:
    return list(db.scalars(select(Project).order_by(Project.created_at.desc())))


def get_project(db: Session, project_id: int) -> Project | None:
    return db.scalar(
        select(Project)
        .options(
            selectinload(Project.requirement),
            selectinload(Project.executions),
            selectinload(Project.events),
        )
        .where(Project.id == project_id)
    )


def to_summary(project: Project) -> ProjectSummary:
    return ProjectSummary.model_validate(project)


def to_detail(project: Project) -> ProjectDetail:
    agents = [
        AgentStatus(
            agent_name=item.agent_name,
            status=item.status,
            current_task=item.current_task,
            progress=item.progress,
            duration_ms=item.duration_ms,
        )
        for item in sorted(project.executions, key=lambda row: row.id)
    ]
    return ProjectDetail(
        id=project.id,
        name=project.name,
        description=project.description,
        status=project.status,
        created_at=project.created_at,
        updated_at=project.updated_at,
        tech_preferences=project.tech_preferences,
        expected_output=project.expected_output,
        human_approval_required=project.human_approval_required,
        correction_cycles=project.correction_cycles,
        functional_requirements=project.requirement.functional_requirements if project.requirement else "",
        agents=agents,
        events=[
            WorkflowEventOut.model_validate(event)
            for event in sorted(project.events, key=lambda row: row.id, reverse=True)[:20]
        ],
    )


def project_stats(db: Session) -> dict[str, int]:
    total = db.scalar(select(func.count(Project.id))) or 0
    completed = db.scalar(select(func.count(Project.id)).where(Project.status == "completed")) or 0
    active_agents = db.scalar(
        select(func.count(AgentExecution.id)).where(AgentExecution.status.in_(("running", "pending")))
    ) or 0
    return {
        "total_projects": total,
        "completed_tasks": completed,
        "active_agents": active_agents,
    }
