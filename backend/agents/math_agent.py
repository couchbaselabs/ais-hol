"""Math agent node — Exercise 6.

Uses agentc_langgraph.ReActAgent to fetch the math_agent prompt and its
associated tools from the Agent Catalog, then runs a LangGraph ReAct loop.
Tool calls and completions are logged to the agentc Span via ToolNode and
the LangChain Callback.
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

        steps = []
        for msg in result["messages"]:
            role = getattr(msg, "type", None) or msg.__class__.__name__.lower()
            content = msg.content if isinstance(msg.content, str) else str(msg.content)
            tool_calls = getattr(msg, "tool_calls", [])
            if tool_calls:
                for tc in tool_calls:
                    steps.append({
                        "type": "tool_call",
                        "tool": tc.get("name", ""),
                        "input": tc.get("args", {}),
                    })
            elif role == "tool":
                steps.append({"type": "tool_result", "content": content})
            elif role == "ai" and content and content != final_answer:
                steps.append({"type": "thought", "content": content})

        existing_steps = state.get("trace_steps") or []
        return Command(
            goto="__end__",
            update={
                "answer": final_answer,
                "routed_to": "math_agent",
                "trace_steps": existing_steps + steps,
            },
        )


async def math_agent_node(state: AgentState, catalog: agentc.Catalog, span: agentc.Span) -> Command:
    """LangGraph node entry point — runs MathAgent inside a child span."""
    agent = MathAgent(catalog=catalog, span=span)
    with span.new(name="math_agent", state=state) as child_span:
        return await agent._ainvoke(child_span, state, config=None)
