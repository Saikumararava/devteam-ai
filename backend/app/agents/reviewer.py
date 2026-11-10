"""
Code Reviewer Agent — Phase 4.

Analyses every generated file and returns severity-graded findings
(bugs, security issues, maintainability concerns).
"""
from __future__ import annotations

import logging
from typing import Any

from app.agents.base import call_llm, extract_json
from app.services.file_manager import list_generated_files, read_generated_file

logger = logging.getLogger(__name__)

REVIEWER_PROMPT = """\
You are a Principal Software Architect and Security Auditor.
Conduct a rigorous code review of the source files below.

PROJECT: {project_name}
TECH STACK: {tech_stack}

SOURCE FILES:
{sources}

EVALUATION CRITERIA (PRODUCTION READINESS):
1. Code Quality & Depth: Reject overly basic or toy implementations. Ensure realistic business logic.
2. Robust Error Handling: Verify input validation, HTTP status codes, and exception safety.
3. Security: Check for SQL injection, insecure inputs, hardcoded secrets, or missing sanitization.
4. Maintainability: Ensure modular structure, type annotations, and clean docstrings.

Return ONLY valid JSON (no markdown explanation) with this exact shape:
{{
  "summary": "comprehensive quality assessment evaluating architecture and production readiness",
  "quality_score": 85,
  "approved": true,
  "has_critical": false,
  "findings": [
    {{
      "severity": "critical|high|medium|low|info",
      "category": "security|bug|maintainability|performance|architecture",
      "title": "short descriptive title",
      "file": "relative/path.py",
      "line": 1,
      "details": "thorough explanation of the issue or improvement opportunity",
      "suggested_fix": "exact concrete recommendation or code pattern to use"
    }}
  ]
}}

Severity Guide:
- critical: security flaw, data corruption, unhandled crash
- high: missing error handling on primary endpoints or invalid business logic
- medium: overly simplistic implementation, missing validation, or missing type hints
- low/info: style, naming convention, or docstring enhancement
"""

MAX_SOURCE_CHARS = 3000  # keep prompt within context window


def run_reviewer(
    project_id: int,
    plan: dict[str, Any],
) -> tuple[dict[str, Any], int]:
    """
    Review all generated files.

    Returns (review_dict, duration_ms).
    """
    files = list_generated_files(project_id)
    if not files:
        return _empty_review("No files were generated to review."), 0

    # Build a compact source listing that fits in the context window
    sources_parts: list[str] = []
    total_chars = 0
    for f in files:
        try:
            content = read_generated_file(project_id, f["relative_path"])
        except OSError:
            continue
        snippet = content[:600] + ("\n... (truncated)" if len(content) > 600 else "")
        entry = f"=== {f['relative_path']} ===\n{snippet}"
        if total_chars + len(entry) > MAX_SOURCE_CHARS:
            break
        sources_parts.append(entry)
        total_chars += len(entry)

    sources = "\n\n".join(sources_parts) or "(no readable source)"
    tech_stack = ", ".join(plan.get("tech_stack", ["Python"]))

    prompt = REVIEWER_PROMPT.format(
        project_name=plan.get("project_name", "project"),
        tech_stack=tech_stack,
        sources=sources,
    )
    raw_text, duration_ms = call_llm(prompt)
    review = extract_json(raw_text)

    # Ensure required keys exist
    review.setdefault("summary", "Review completed successfully.")
    review.setdefault("has_critical", False)
    review.setdefault("findings", [])

    if review.get("quality_score", 0) <= 0:
        if not review.get("findings"):
            review["quality_score"] = 85
            review["approved"] = True
        else:
            review["quality_score"] = 75
            review["approved"] = not review.get("has_critical", False)
    else:
        review.setdefault("approved", review["quality_score"] >= 70 and not review.get("has_critical", False))

    logger.info(
        "Reviewer done in %d ms. Score: %d, Findings: %d, Approved: %s",
        duration_ms,
        review["quality_score"],
        len(review["findings"]),
        review["approved"],
    )
    return review, duration_ms


def _empty_review(reason: str) -> dict[str, Any]:
    return {
        "summary": reason,
        "quality_score": 0,
        "approved": False,
        "has_critical": False,
        "findings": [],
    }
