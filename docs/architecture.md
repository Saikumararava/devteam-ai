# DevTeam AI — System Architecture & Workflow Reference

## 1. Orchestration Pipeline (LangGraph)

DevTeam AI uses a compiled LangGraph `StateGraph` with a typed shared state (`WorkflowState`).

```
               [ START ]
                   │
                   ▼
            [ Planner Agent ]
                   │
                   ▼
           [ Developer Agent ] ◄─────────────────┐
                   │                             │
                   ▼                             │
          [ Reviewer Agent ]                     │
                   │                             │
        (critical issues found?)                 │
           ├── Yes ──► [ increment_cycles ] ─────┤
           └── No                                │
                   │                             │
                   ▼                             │
            [ Tester Agent ]                     │
                   │                             │
         (test failures found?)                  │
           ├── Yes ──► [ increment_cycles ] ─────┘
           └── No
                   │
                   ▼
          [ Documenter Agent ]
                   │
                   ▼
                [ END ]
```

### Routing Rules & Safety Limits
- If the Code Reviewer finds findings with severity `critical`, the workflow routes to `increment_cycles` and restarts `Developer Agent` to correct the flaws.
- If the Testing Agent reports failed test cases, failure outputs and stack traces are provided to the `Developer Agent`.
- A maximum of **2 automatic correction cycles** are permitted per project run to prevent runaway loops. If issues remain after 2 cycles, the project is marked for human inspection.

---

## 2. Agent Modules

| Agent | File | Primary Responsibility | Output Format |
|---|---|---|---|
| **Planner** | `backend/app/agents/planner.py` | Understands functional requirements, determines tech stack & architecture, generates feature & task breakdown. | Validated JSON with task list |
| **Developer** | `backend/app/agents/developer.py` | Generates full source code for each task, validates path safety, writes to project directory. | Files on disk & JSON manifest |
| **Reviewer** | `backend/app/agents/reviewer.py` | Performs static & security audit of generated code, evaluates bug risks & quality scores. | JSON findings list with severity & fixes |
| **Tester** | `backend/app/agents/tester.py` | Generates pytest test files, executes them in isolated subprocess/Docker sandbox, parses output. | JSON test report & raw stdout |
| **Documenter** | `backend/app/agents/documentation.py` | Writes `README.md`, setup runbooks, architecture diagrams, and development summary. | Markdown files & project report |

---

## 3. Database Schema (SQLite)

Tables managed via SQLAlchemy ORM in `backend/app/models/project.py`:

- `projects`: Main metadata (name, description, tech preferences, status, correction cycles, timestamps).
- `requirements`: Raw user brief and structured functional requirements.
- `agent_executions`: Real-time execution status (idle, pending, running, completed, failed), current task, progress percentage, execution duration (ms).
- `agent_outputs`: Serialized outputs (payload JSON, output type, summary).
- `generated_files`: Metadata for generated files (relative path, language, size in bytes, SHA-256 checksum).
- `review_findings`: Individual review findings (severity, category, title, details, suggested fix, approval).
- `test_results`: Individual test assertion results (name, status, details, execution duration).
- `workflow_events`: Complete audit event log with timestamps.

---

## 4. Path Sandboxing & Security Safeguards

- **Sandboxed Directory:** Generated projects are quarantined strictly inside `generated_projects/<project_id>/`.
- **`safe_join()` Algorithm:** Resolves target paths and validates that `resolved.relative_to(base)` does not escape. Throws `UnsafePathError` on `..`, absolute drive paths, or root prefixes.
- **Subprocess Isolation:** Pytest runs with a stripped environment (`PATH`, `PYTHONPATH`, `PYTHONDONTWRITEBYTECODE`, temp dir), `shell=False`, and hard timeouts.
- **Docker Sandbox Option:** When `DOCKER_ENABLED=true`, tests run inside `devteam-ai-sandbox:local` with `--network none`, `--memory 512m`, `--cpus 1`, and `--security-opt no-new-privileges:true`.
