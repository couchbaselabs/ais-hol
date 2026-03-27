"""Math agent node — Exercise 6.

Uses agentc_langgraph.ReActAgent to fetch the math_agent prompt and its
associated tools from the Agent Catalog, then runs a LangGraph ReAct loop.
Activity (tool calls, completions, edges) is logged to the agentc Span.
"""

from __future__ import annotations

import agentc
import agentc_langgraph.agent
import langchain_core.runnables
from langgraph.types import Command

from agents.state import AgentState
from agents.router_agent import _get_llm


class MathAgent(agentc_langgraph.agent.ReActAgent):
    """ReAct agent that evaluates math expressions using catalog-managed tools."""

    def __init__(self, catalog: agentc.Catalog, span: agentc.Span):
        super().__init__(
            chat_model=_get_llm(),
            catalog=catalog,
            span=span,
            prompt_name="math_agent",
        )

    async def _ainvoke(
        self,
        span: agentc.Span,
        state: AgentState,
        config: langchain_core.runnables.RunnableConfig,
    ) -> Command:
        agent = self.create_react_agent(span)
        result = await agent.ainvoke(
            {"messages": [("user", state["message"])], "is_last_step": False, "previous_node": None},
            config=config,
        )
        final_answer = result["messages"][-1].content
        return Command(
            goto="__end__",
            update={"answer": final_answer, "routed_to": "math_agent"},
        )


async def math_agent_node(state: AgentState, catalog: agentc.Catalog, span: agentc.Span) -> Command:
    """LangGraph node entry point — delegates to MathAgent."""
    return await MathAgent(catalog=catalog, span=span).ainvoke(state)
