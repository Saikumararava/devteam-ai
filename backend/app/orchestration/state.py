from typing import Any, TypedDict


class AgentSnapshot(TypedDict):
    name: str
    status: str
    current_task: str
    progress: int


class WorkflowState(TypedDict, total=False):
    project_id: int
    requirements: str
    tech_preferences: str
    expected_output: str
    plan: dict[str, Any]
    generated_files: list[dict[str, Any]]
    review: dict[str, Any]
    tests: dict[str, Any]
    documentation: dict[str, Any]
    agents: list[AgentSnapshot]
    history: list[str]
    correction_cycles: int
    needs_human: bool
