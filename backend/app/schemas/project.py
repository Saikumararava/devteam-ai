from datetime import datetime

from pydantic import BaseModel, Field


class ProjectCreate(BaseModel):
    name: str = Field(min_length=2, max_length=200)
    description: str = Field(default="", max_length=4000)
    tech_preferences: str = Field(default="", max_length=2000)
    functional_requirements: str = Field(default="", max_length=8000)
    expected_output: str = Field(default="", max_length=2000)


class ProjectSummary(BaseModel):
    id: int
    name: str
    description: str
    status: str
    created_at: datetime | None = None
    updated_at: datetime | None = None

    model_config = {"from_attributes": True}


class AgentStatus(BaseModel):
    agent_name: str
    status: str
    current_task: str = ""
    progress: int = 0
    duration_ms: int = 0


class WorkflowEventOut(BaseModel):
    id: int
    event_type: str
    message: str
    created_at: datetime | None = None

    model_config = {"from_attributes": True}


class ProjectDetail(ProjectSummary):
    tech_preferences: str
    expected_output: str
    human_approval_required: bool
    correction_cycles: int
    functional_requirements: str = ""
    agents: list[AgentStatus] = Field(default_factory=list)
    events: list[WorkflowEventOut] = Field(default_factory=list)
