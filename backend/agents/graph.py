"""LangGraph multi-agent graph — Exercises 6 & 7.

Nodes:
  router           — classifies the message; answers directly, or hands off
  math_agent       — handles calculation requests (Exercise 6)
  faq_search_agent — handles FAQ lookup requests (Exercise 7)

Wrapped in agentc_langgraph.GraphRunnable so every invocation is enclosed
in an agentc Span, giving full activity logging (tool calls, completions,
node edges) to .agent-activity/ and Couchbase.
"""

from __future__ import annotations

import functools

import agentc
import agentc_langgraph.graph
import langchain_core.runnables
from langgraph.graph import StateGraph

from agents.state import AgentState
from agents.router_agent import router_node
from agents.math_agent import math_agent_node
from agents.faq_search_agent import faq_search_agent_node


class AgentGraph(agentc_langgraph.graph.GraphRunnable):
    """Multi-agent graph wrapped in an agentc Span for activity logging."""

    async def acompile(self) -> StateGraph:
        catalog = self.catalog
        span = self.span

        builder = StateGraph(AgentState)

        # router_node has no catalog/span dependency — add as-is.
        builder.add_node("router", router_node)

        # math and FAQ nodes receive catalog + span via partial injection.
        builder.add_node(
            "math_agent",
            functools.partial(math_agent_node, catalog=catalog, span=span),
        )
        builder.add_node(
            "faq_search_agent",
            functools.partial(faq_search_agent_node, catalog=catalog, span=span),
        )

        builder.set_entry_point("router")

        return builder.compile()

    def compile(self) -> StateGraph:
        import asyncio
        return asyncio.get_event_loop().run_until_complete(self.acompile())


def build_graph() -> AgentGraph:
    """Instantiate the AgentGraph (creates catalog + root span)."""
    catalog = agentc.Catalog()
    return AgentGraph(catalog=catalog)


# Module-level instance — imported by main.py.
agent_graph = build_graph()
