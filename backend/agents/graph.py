"""LangGraph multi-agent graph — Exercises 6 & 7.

Nodes:
  router           — classifies the message; answers directly, or hands off
  math_agent       — handles calculation requests (Exercise 6)
  faq_search_agent — handles FAQ lookup requests (Exercise 7)

Entry point: router
"""

from __future__ import annotations

from langgraph.graph import StateGraph

from agents.state import AgentState
from agents.router_agent import router_node
from agents.math_agent import math_agent_node
from agents.faq_search_agent import faq_search_agent_node


def build_graph():
    """Build and compile the multi-agent StateGraph.

    TODO (Exercise 6 — Step 7):
      1. Create a builder: builder = StateGraph(AgentState)
      2. Add nodes:
           builder.add_node("router", router_node)
           builder.add_node("math_agent", math_agent_node)
      3. Set the entry point: builder.set_entry_point("router")
      4. Return builder.compile()

    TODO (Exercise 7 — Step 10):
      5. Also add: builder.add_node("faq_search_agent", faq_search_agent_node)
         (Routing is driven by Command(goto=...) in each node — no explicit
         conditional edges are needed.)
    """
    raise NotImplementedError("Implement build_graph() in graph.py")


# Module-level compiled graph — imported by main.py.
agent_graph = build_graph()
