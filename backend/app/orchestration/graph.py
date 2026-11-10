"""
LangGraph workflow graph — Phase 5.

Assembles the five-agent pipeline with conditional feedback loops.
"""
from __future__ import annotations

from langgraph.graph import END, START, StateGraph

from app.orchestration.nodes import (
    node_developer,
    node_documentation,
    node_increment_cycles,
    node_planner,
    node_reviewer,
    node_tester,
    route_after_reviewer,
    route_after_tester,
)
from app.orchestration.state import WorkflowState


def build_graph() -> StateGraph:
    """
    Build and compile the DevTeam AI workflow graph.

    Graph topology:
        START → planner → developer → reviewer ──────────────────→ tester → documentation → END
                                           ↑                 ↓               ↑         ↓
                                      (critical?)  increment_cycles  (failed?)  END
                                           └───────────────────────────────────┘
    """
    graph = StateGraph(WorkflowState)

    # Add agent nodes
    graph.add_node("planner", node_planner)
    graph.add_node("developer", node_developer)
    graph.add_node("reviewer", node_reviewer)
    graph.add_node("increment_cycles", node_increment_cycles)
    graph.add_node("tester", node_tester)
    graph.add_node("documenter", node_documentation)

    # Linear flow
    graph.add_edge(START, "planner")
    graph.add_edge("planner", "developer")
    graph.add_edge("developer", "reviewer")

    # Conditional: after review — retry developer or continue to tester
    graph.add_conditional_edges(
        "reviewer",
        route_after_reviewer,
        {
            "developer": "increment_cycles",
            "tester": "tester",
        },
    )

    # Retry arc from increment_cycles back to developer
    graph.add_edge("increment_cycles", "developer")

    # Conditional: after tests — retry developer or finalize
    graph.add_conditional_edges(
        "tester",
        route_after_tester,
        {
            "developer": "increment_cycles",
            "documenter": "documenter",
        },
    )

    graph.add_edge("documenter", END)

    return graph.compile()


# Singleton compiled graph (created once per process)
_COMPILED_GRAPH = None


def get_graph():
    global _COMPILED_GRAPH
    if _COMPILED_GRAPH is None:
        _COMPILED_GRAPH = build_graph()
    return _COMPILED_GRAPH
