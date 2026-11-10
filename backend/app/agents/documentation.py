"""
Documentation Agent — Phase 4.

Generates README.md, API documentation, architecture overview,
and a final development report for the generated project.
"""
from __future__ import annotations

import logging
from typing import Any

from app.agents.base import call_llm, extract_json
from app.services.file_manager import write_generated_file

logger = logging.getLogger(__name__)

DOCUMENTATION_PROMPT = """\
You are a Lead Technical Writer and Principal Systems Architect.
Write comprehensive, production-grade documentation for the software project below.

PROJECT NAME: {project_name}
SUMMARY: {summary}
TECH STACK: {tech_stack}
ARCHITECTURE: {architecture}
FEATURES:
{features}
GENERATED SOURCE FILES:
{file_list}
REVIEW SUMMARY: {review_summary}
TEST METRICS: passed={passed}, failed={failed}, total={total}

PROFESSIONAL STANDARDS:
- Provide clear setup instructions with real commands.
- For API docs, include endpoint paths, HTTP methods, request bodies, and response codes.
- Explain architectural design and component interactions.

Return ONLY valid JSON (no markdown explanation) with this exact shape:
{{
  "readme": "complete production-ready README.md content in markdown with badges, setup, architecture, and examples",
  "api_docs": "comprehensive API documentation with endpoint tables, request/response JSON schemas",
  "architecture_overview": "in-depth architecture guide describing modules, data flow, and design patterns",
  "setup_instructions": "Windows PowerShell step-by-step installation, virtualenv, and execution guide",
  "report": "final development audit report summarizing build metrics, security review, and testing results"
}}
"""


def run_documentation(
    project_id: int,
    plan: dict[str, Any],
    generated_files: list[dict[str, Any]],
    review: dict[str, Any],
    tests: dict[str, Any],
) -> tuple[dict[str, Any], int]:
    """
    Generate documentation and write it into the project sandbox.

    Returns (docs_dict, duration_ms).
    """
    tech_stack = ", ".join(plan.get("tech_stack", ["Python"]))
    features = "\n".join(
        f"- {f.get('name', '')}: {f.get('description', '')}"
        for f in plan.get("features", [])[:10]
    )
    file_list = "\n".join(f["relative_path"] for f in generated_files[:30])

    prompt = DOCUMENTATION_PROMPT.format(
        project_name=plan.get("project_name", "Generated Project"),
        summary=plan.get("summary", ""),
        tech_stack=tech_stack,
        architecture=plan.get("architecture", ""),
        features=features or "(no features listed)",
        file_list=file_list or "(no files)",
        review_summary=review.get("summary", "")[:300],
        passed=tests.get("passed", 0),
        failed=tests.get("failed", 0),
        total=tests.get("total", 0),
    )

    raw_text, duration_ms = call_llm(prompt)
    docs = extract_json(raw_text)

    # Provide defaults for all keys
    docs.setdefault("readme", _default_readme(plan))
    docs.setdefault("api_docs", "N/A — no REST API defined.")
    docs.setdefault("architecture_overview", plan.get("architecture", ""))
    docs.setdefault("setup_instructions", _default_setup(plan))
    docs.setdefault("report", _default_report(plan, review, tests))

    # Persist README.md into the project sandbox
    try:
        write_generated_file(project_id, "README.md", docs["readme"])
        logger.info("Documentation agent wrote README.md")
    except (ValueError, OSError) as exc:
        logger.warning("Could not write README.md: %s", exc)

    logger.info("Documentation completed in %d ms.", duration_ms)
    return docs, duration_ms


def _default_readme(plan: dict[str, Any]) -> str:
    return f"""# {plan.get("project_name", "Generated Project")}

{plan.get("summary", "")}

## Tech Stack
{chr(10).join(f"- {t}" for t in plan.get("tech_stack", []))}

## Features
{chr(10).join(f"- {f.get('name', '')}" for f in plan.get("features", []))}

## Setup

```powershell
# Install dependencies
pip install -r requirements.txt

# Run the application
python main.py
```

## License
MIT
"""


def _default_setup(plan: dict[str, Any]) -> str:
    return f"""## Setup Instructions (Windows PowerShell)

```powershell
# 1. Create virtual environment
python -m venv .venv
.venv\\Scripts\\Activate.ps1

# 2. Install dependencies
pip install -r requirements.txt

# 3. Run the application
python main.py
```
"""


def _default_report(
    plan: dict[str, Any],
    review: dict[str, Any],
    tests: dict[str, Any],
) -> str:
    return f"""# Development Report

## Project: {plan.get("project_name", "Generated Project")}

## Summary
{plan.get("summary", "")}

## Code Review
- Quality score: {review.get("quality_score", 0)}/100
- Approved: {review.get("approved", False)}
- Findings: {len(review.get("findings", []))}

## Tests
- Passed: {tests.get("passed", 0)}
- Failed: {tests.get("failed", 0)}
- Total: {tests.get("total", 0)}

## Architecture
{plan.get("architecture", "")}
"""
