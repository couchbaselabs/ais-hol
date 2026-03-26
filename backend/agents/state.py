"""Shared LangGraph state for the multi-agent graph."""

from __future__ import annotations

from typing import TypedDict


class AgentState(TypedDict, total=False):
    message: str
    """The original user message."""

    answer: str
    """Final answer written by whichever node handles the request."""

    routed_to: str
    """Which node produced the answer: 'router', 'math_agent', or 'faq_search_agent'."""

    faq_collection: str | None
    """Couchbase collection name of the matched FAQ (Exercise 7)."""

    missing_topic: str | None
    """Snake_case topic label when no FAQ matched (Exercise 7)."""
