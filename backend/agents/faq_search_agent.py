"""FAQ search agent node — Exercise 7.

Uses agentc_langgraph.ReActAgent to fetch the faq_search_agent prompt and
its hybrid_faq_search tool from the Agent Catalog. The tool is bound to the
collection_name from state before the ReAct loop runs.
Tool calls and completions are logged to the agentc Span via ToolNode and
the LangChain Callback.
"""

from __future__ import annotations

import functools

import agentc
import agentc_langgraph.agent
import langchain_core.runnables
import langchain_core.tools
from langgraph.types import Command

from agents.state import AgentState
from agents.router_agent import _get_llm


class FaqSearchAgent(agentc_langgraph.agent.ReActAgent):
    """ReAct agent that searches a FAQ collection using catalog-managed tools."""

    def __init__(self, catalog: agentc.Catalog, span: agentc.Span, collection_name: str):
        super().__init__(
            chat_model=_get_llm(),
            catalog=catalog,
            span=span,
            prompt_name="faq_search_agent",
        )
        # Bind collection_name into the tool so the LLM only needs to supply query.
        self.tools = [self._bind_collection(t, collection_name) for t in self.tools]

    @staticmethod
    def _bind_collection(
        tool: langchain_core.tools.BaseTool, collection_name: str
    ) -> langchain_core.tools.BaseTool:
        """Return a copy of the tool with collection_name pre-filled."""
        original_func = tool.func

        @functools.wraps(original_func)
        def bound(query: str) -> list[dict]:
            """Search the FAQ collection for content relevant to the query."""
            return original_func(query=query, collection_name=collection_name)

        return langchain_core.tools.StructuredTool.from_function(
            func=bound,
            name=tool.name,
            description=(
                f"Search the '{collection_name}' FAQ for content relevant to the query. "
                "Returns a list of document chunks with their content and relevance score."
            ),
        )

    async def _ainvoke(
        self,
        span: agentc.Span,
        state: AgentState,
        config: langchain_core.runnables.RunnableConfig,
    ) -> Command:
        agent = self.create_react_agent(span)

        history = state.get("conversation_history") or []
        messages = history + [("user", state["message"])]

        result = await agent.ainvoke(
            {"messages": messages, "is_last_step": False, "previous_node": None},
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
                "routed_to": "faq_search_agent",
                "faq_collection": state.get("faq_collection"),
                "trace_steps": existing_steps + steps,
            },
        )


async def faq_search_agent_node(state: AgentState, catalog: agentc.Catalog, span: agentc.Span) -> Command:
    """LangGraph node entry point — runs FaqSearchAgent inside a child span."""
    collection_name = state.get("faq_collection", "")
    if not collection_name:
        return Command(
            goto="__end__",
            update={
                "answer": "No FAQ collection was identified for this question.",
                "routed_to": "faq_search_agent",
            },
        )
    agent = FaqSearchAgent(catalog=catalog, span=span, collection_name=collection_name)
    with span.new(name="faq_search_agent", state=state) as child_span:
        return await agent._ainvoke(child_span, state, config=None)
