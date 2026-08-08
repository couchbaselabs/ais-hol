"""RAG agent node — searches MDN documentation via vector search.

Uses agentc_langgraph.ReActAgent with the rag_search tool from the Agent
Catalog. Answers web development questions grounded in retrieved documents.
"""

from __future__ import annotations

import agentc
import agentc_langgraph.agent
import langchain_core.runnables
from langgraph.types import Command

from agents.state import AgentState
from agents.router_agent import _get_llm


class RagAgent(agentc_langgraph.agent.ReActAgent):
    """ReAct agent that answers questions using MDN documentation retrieval."""

    def __init__(self, catalog: agentc.Catalog, span: agentc.Span):
        super().__init__(
            chat_model=_get_llm(),
            catalog=catalog,
            span=span,
            prompt_name="rag_agent",
        )

    async def _ainvoke(
        self,
        span: agentc.Span,
        state: AgentState,
        config: langchain_core.runnables.RunnableConfig,
    ) -> Command:
        agent = self.create_react_agent(span)

        # Build input — include conversation history if present
        history = state.get("conversation_history") or []
        messages = history + [("user", state["message"])]

        result = await agent.ainvoke(
            {"messages": messages, "is_last_step": False, "previous_node": None},
            config=config,
        )
        final_answer = result["messages"][-1].content

        # Collect reasoning trace: tool calls and intermediate AI messages
        steps = []
        for msg in result["messages"]:
            role = getattr(msg, "type", None) or msg.__class__.__name__.lower()
            if role in ("ai", "tool"):
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
                elif content and content != final_answer:
                    steps.append({"type": "thought", "content": content})

        existing_steps = state.get("trace_steps") or []
        return Command(
            goto="__end__",
            update={
                "answer": final_answer,
                "routed_to": "rag_agent",
                "faq_collection": None,
                "missing_topic": None,
                "trace_steps": existing_steps + steps,
            },
        )


async def rag_agent_node(state: AgentState, catalog: agentc.Catalog, span: agentc.Span) -> Command:
    """LangGraph node entry point — runs RagAgent inside a child span."""
    agent = RagAgent(catalog=catalog, span=span)
    with span.new(name="rag_agent", state=state) as child_span:
        return await agent._ainvoke(child_span, state, config=None)
