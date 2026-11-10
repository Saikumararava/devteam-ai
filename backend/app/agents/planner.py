"""
Planner Agent — Phase 2.

Takes the user's natural-language requirements and produces a professional,
enterprise-grade structured JSON software development plan: architecture,
tech stack, feature list, and modular task breakdown.
"""
from __future__ import annotations

import logging
from typing import Any

from app.agents.base import call_llm, extract_json

logger = logging.getLogger(__name__)

PLANNER_PROMPT = """\
You are a Principal Software Architect. Design a professional, production-grade,
enterprise-quality software development plan for the requirements below.

REQUIREMENTS:
{requirements}

TECH PREFERENCES:
{tech_preferences}

EXPECTED OUTPUT:
{expected_output}

ARCHITECTURAL PRINCIPLES:
- NOT BASIC / NOT A TOY APP: Design a robust, multi-layer architecture with separation of concerns.
- Break down the work into 3 to 5 distinct, modular development tasks with clear file targets (e.g. models.py, database.py, routes.py, main.py).
- Include comprehensive models, input validation, error handling, and business logic layers.

Return ONLY valid JSON (no markdown, no conversation) in exactly this shape:
{{
  "project_name": "string",
  "summary": "comprehensive professional project summary",
  "architecture": "layered clean architecture description (controller, service, repository, models)",
  "tech_stack": ["Python", "FastAPI", "SQLAlchemy", "Pydantic", "SQLite"],
  "features": [
    {{"id": 1, "name": "feature name", "description": "detailed capability and validation rules"}}
  ],
  "tasks": [
    {{
      "id": 1,
      "title": "task title",
      "description": "detailed implementation instructions covering fields, validation, and error handling",
      "files": ["models.py"],
      "priority": "high"
    }}
  ],
  "folder_structure": {{
    "root": ["models.py", "database.py", "routes.py", "main.py"],
    "tests": ["test_api.py"]
  }},
  "risks": ["security consideration", "concurrency or validation edge case"]
}}
"""


def run_planner(
    requirements: str,
    tech_preferences: str,
    expected_output: str,
) -> tuple[dict[str, Any], int]:
    """
    Call the LLM and return (plan_dict, duration_ms).
    """
    prompt = PLANNER_PROMPT.format(
        requirements=requirements.strip()[:2000] or "(no requirements provided)",
        tech_preferences=tech_preferences.strip() or "Python, FastAPI",
        expected_output=expected_output.strip() or "Production-ready runnable application with tests",
    )
    raw_text, duration_ms = call_llm(prompt)
    plan = extract_json(raw_text)

    # Defaults
    defaults: dict[str, Any] = {
        "project_name": "enterprise_app",
        "summary": requirements[:140] if requirements else "Production-grade application",
        "architecture": "Layered clean architecture: data models, business logic services, REST API routes, and main entrypoint",
        "tech_stack": [tech_preferences] if tech_preferences else ["Python", "FastAPI", "SQLAlchemy"],
        "features": [],
        "tasks": [],
        "folder_structure": {"root": ["models.py", "routes.py", "main.py"], "src": []},
        "risks": [],
    }
    for key, default_val in defaults.items():
        plan.setdefault(key, default_val)

    # Ensure professional modular concrete development tasks exist
    if not plan.get("tasks"):
        brief_summary = requirements.strip()[:600]
        plan["tasks"] = [
            {
                "id": 1,
                "title": "Data Models and Validation Schemas",
                "description": (
                    f"Define comprehensive Pydantic schemas and SQLAlchemy ORM database models "
                    f"with typed fields, custom validators, docstrings, and relationships for: {brief_summary}"
                ),
                "files": ["models.py"],
                "priority": "high",
            },
            {
                "id": 2,
                "title": "Business Logic and REST API Endpoints",
                "description": (
                    f"Implement production-grade REST API routes with dependency injection, "
                    f"thorough error handling (400, 404, 500), pagination, filtering, and logging for: {brief_summary}"
                ),
                "files": ["routes.py"],
                "priority": "high",
            },
            {
                "id": 3,
                "title": "Production Server Setup & Middleware",
                "description": (
                    f"Application entry point configuring FastAPI app, CORS middleware, "
                    f"custom global exception handlers, structured request logging, and router inclusion for: {brief_summary}"
                ),
                "files": ["main.py"],
                "priority": "medium",
            },
        ]

    logger.info("Planner completed in %d ms. Tasks: %d", duration_ms, len(plan.get("tasks", [])))
    return plan, duration_ms
