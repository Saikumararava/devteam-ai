"""
Unit tests for agent parsing, extraction, and graph construction.
"""
from app.agents.base import extract_json
from app.orchestration.graph import build_graph


def test_extract_json_direct():
    text = '{"project_name": "Test", "tasks": []}'
    parsed = extract_json(text)
    assert parsed["project_name"] == "Test"


def test_extract_json_markdown_block():
    text = """Here is the result:
```json
{
  "summary": "AI assistant",
  "score": 95
}
```
Hope this helps!"""
    parsed = extract_json(text)
    assert parsed["summary"] == "AI assistant"
    assert parsed["score"] == 95


def test_extract_json_fallback_empty():
    text = "Sorry, I cannot produce valid JSON for this."
    parsed = extract_json(text)
    assert parsed == {}


def test_graph_topology_compilation():
    """Verify LangGraph compiles without errors."""
    graph = build_graph()
    assert graph is not None
