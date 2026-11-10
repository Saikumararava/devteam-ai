"""
Secure file manager for generated project files.

All paths are validated against the generated_projects sandbox root.
Path traversal attempts are rejected.
"""
from __future__ import annotations

import hashlib
import logging
import os
import zipfile
from io import BytesIO
from pathlib import Path
from typing import Iterator

from app.config import get_settings
from app.security.paths import safe_join

logger = logging.getLogger(__name__)


def project_dir(project_id: int) -> Path:
    """Return (and create) the project-specific output directory."""
    root = get_settings().generated_root
    path = root / str(project_id)
    path.mkdir(parents=True, exist_ok=True)
    return path


def write_generated_file(project_id: int, relative_path: str, content: str) -> Path:
    """
    Write a generated source file to the project sandbox directory.

    Raises ValueError if relative_path tries to escape the sandbox.
    """
    base = project_dir(project_id)
    dest = safe_join(base, relative_path)
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_text(content, encoding="utf-8")
    logger.debug("Written: %s (%d bytes)", dest, len(content))
    return dest


def read_generated_file(project_id: int, relative_path: str) -> str:
    """Read a file from the project sandbox, returning its text content."""
    base = project_dir(project_id)
    dest = safe_join(base, relative_path)
    return dest.read_text(encoding="utf-8")


def list_generated_files(project_id: int) -> list[dict[str, str]]:
    """
    Return a list of dicts describing every file in the project sandbox.
    Each dict has: relative_path, language, size_bytes.
    """
    base = project_dir(project_id)
    if not base.exists():
        return []
    result = []
    for path in sorted(base.rglob("*")):
        if path.is_file():
            rel = path.relative_to(base).as_posix()
            result.append(
                {
                    "relative_path": rel,
                    "language": _detect_language(path.suffix),
                    "size_bytes": path.stat().st_size,
                    "checksum": _sha256(path),
                }
            )
    return result


def _detect_language(suffix: str) -> str:
    mapping = {
        ".py": "python",
        ".js": "javascript",
        ".ts": "typescript",
        ".tsx": "tsx",
        ".jsx": "jsx",
        ".html": "html",
        ".css": "css",
        ".json": "json",
        ".md": "markdown",
        ".yaml": "yaml",
        ".yml": "yaml",
        ".toml": "toml",
        ".sh": "bash",
        ".txt": "text",
        ".sql": "sql",
    }
    return mapping.get(suffix.lower(), "text")


def _sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as fh:
        for chunk in iter(lambda: fh.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()[:16]


def create_zip(project_id: int) -> bytes:
    """
    Bundle every file in the project sandbox into an in-memory ZIP archive.
    Returns raw bytes ready for a streaming HTTP response.
    """
    base = project_dir(project_id)
    buf = BytesIO()
    with zipfile.ZipFile(buf, "w", compression=zipfile.ZIP_DEFLATED) as zf:
        for path in sorted(base.rglob("*")):
            if path.is_file():
                arcname = path.relative_to(base).as_posix()
                zf.write(path, arcname)
    buf.seek(0)
    return buf.read()
