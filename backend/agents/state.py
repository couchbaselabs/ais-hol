"""Shared LangGraph state for the multi-agent graph."""

from __future__ import annotations

from typing import Any, Dict, List, Optional, Tuple, TypedDict


class AgentState(TypedDict, total=False):
    message: str
    """The original user message."""

    answer: str
    """Final answer written by whichever node handles the request."""

    routed_to: str
    """Which node produced the answer: 'router', 'math_agent', 'faq_search_agent', or 'rag_agent'."""

    faq_collection: Optional[str]
    """Couchbase collection name of the matched FAQ (Exercise 7)."""

    missing_topic: Optional[str]
    """Snake_case topic label when no FAQ matched (Exercise 7)."""

    conversation_history: Optional[List[Tuple[str, str]]]
    """Prior turns as (role, content) tuples, injected into agent prompts for memory."""

    trace_steps: Optional[List[Dict[str, Any]]]
    """Reasoning trace: route decisions, tool calls, tool results, and intermediate thoughts."""

    # agentc_langgraph.ReActAgent uses this for EdgeContent logging.
    # Must be a list[str] (span name path), not a plain string.
    previous_node: Optional[List[str]]
