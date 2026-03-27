"""Shared LangGraph state for the multi-agent graph."""

from __future__ import annotations

from typing import List, Optional, TypedDict


class AgentState(TypedDict, total=False):
    message: str
    """The original user message."""

    answer: str
    """Final answer written by whichever node handles the request."""

    routed_to: str
    """Which node produced the answer: 'router', 'math_agent', or 'faq_search_agent'."""

    faq_collection: Optional[str]
    """Couchbase collection name of the matched FAQ (Exercise 7)."""

    missing_topic: Optional[str]
    """Snake_case topic label when no FAQ matched (Exercise 7)."""

    # agentc_langgraph.ReActAgent uses this for EdgeContent logging.
    # Must be a list[str] (span name path), not a plain string.
    previous_node: Optional[List[str]]
