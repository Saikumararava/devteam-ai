from pathlib import Path

from app.config import get_settings

FORBIDDEN_SEGMENTS = {"..", ".", ""}


class UnsafePathError(ValueError):
    pass


def validate_relative_path(relative_path: str) -> Path:
    """Reject absolute paths, drive letters, and parent traversal."""
    raw = relative_path.replace("\\", "/").strip()
    if not raw or raw.startswith("/") or ":" in raw:
        raise UnsafePathError("Absolute or drive-qualified paths are not allowed.")
    parts = Path(raw).parts
    if any(part in FORBIDDEN_SEGMENTS for part in parts):
        raise UnsafePathError("Path traversal is not allowed.")
    return Path(*parts)


def safe_join(base: Path, relative_path: str) -> Path:
    """
    Join base and relative_path, raising UnsafePathError if the result
    escapes the base directory.

    This is the primary path-safety guard used by file_manager.
    """
    safe_rel = validate_relative_path(relative_path)
    resolved = (base / safe_rel).resolve()
    resolved_base = base.resolve()
    # Must be inside base
    try:
        resolved.relative_to(resolved_base)
    except ValueError:
        raise UnsafePathError(f"Path '{relative_path}' escapes the sandbox directory.")
    return resolved


def safe_project_dir(project_id: int) -> Path:
    root = get_settings().generated_root.resolve()
    target = (root / str(project_id)).resolve()
    if root not in target.parents and target != root:
        raise UnsafePathError("Generated files must stay inside generated_projects.")
    return target
