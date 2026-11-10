"""
Shared LLM helper for all DevTeam agents.

Directly communicates with Ollama's local REST API with automatic retries,
configurable context limits, and optional native JSON format mode.
"""
from __future__ import annotations

import json
import logging
import re
import time
from typing import Any

import httpx

from app.config import get_settings

logger = logging.getLogger(__name__)


def call_llm(
    prompt: str,
    *,
    json_mode: bool = True,
    retries: int = 2,
    timeout: float = 300.0,
) -> tuple[str, int]:
    """
    Call the local Ollama model sequentially.

    Returns (raw_text, duration_ms).
    """
    s = get_settings()
    url = f"{s.ollama_base_url.rstrip('/')}/api/generate"

    payload: dict[str, Any] = {
        "model": s.ollama_model,
        "prompt": prompt,
        "stream": False,
        "options": {
            "num_predict": s.ollama_num_predict,
            "num_ctx": s.ollama_num_ctx,
            "num_thread": s.ollama_num_threads,
            "temperature": 0.2,
        },
    }
    if json_mode:
        payload["format"] = "json"

    last_error: Exception | None = None
    for attempt in range(1 + retries):
        t0 = time.monotonic()
        try:
            with httpx.Client(timeout=timeout) as client:
                res = client.post(url, json=payload)
                res.raise_for_status()
                data = res.json()
                raw_text = data.get("response", "").strip()
                duration_ms = int((time.monotonic() - t0) * 1000)
                return raw_text, duration_ms
        except Exception as exc:  # noqa: BLE001
            last_error = exc
            logger.warning(
                "Ollama call attempt %d failed: %s (retrying in 2s)",
                attempt + 1,
                exc,
            )
            time.sleep(2.0)

    duration_ms = 0
    logger.error("All %d Ollama attempts failed: %s", retries + 1, last_error)
    raise RuntimeError(f"Ollama inference failed: {last_error}") from last_error


def extract_json(text: str) -> dict[str, Any]:
    """
    Extract JSON dictionary or list out of a raw LLM response.
    """
    if not text:
        return {}

    # 1. Try parsing directly (works 100% when format="json" is enabled)
    try:
        data = json.loads(text)
        if isinstance(data, dict):
            return data
        if isinstance(data, list):
            return {"items": data}
    except json.JSONDecodeError:
        pass

    # 2. Look for fenced markdown JSON blocks
    fenced = re.search(r"```(?:json)?\s*([\s\S]*?)```", text, re.IGNORECASE)
    if fenced:
        try:
            data = json.loads(fenced.group(1).strip())
            if isinstance(data, dict):
                return data
            if isinstance(data, list):
                return {"items": data}
        except json.JSONDecodeError:
            pass

    # 3. Find first outer curly brackets
    curly = re.search(r"\{[\s\S]*\}", text)
    if curly:
        try:
            return json.loads(curly.group(0))
        except json.JSONDecodeError:
            pass

    logger.warning("extract_json: no valid JSON found in LLM output — returning empty dict")
    return {}
