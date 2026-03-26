"""FAQ search agent node — Exercise 7.

Retrieves the hybrid_faq_search tool from the Agent Catalog and runs a
LangGraph ReAct loop to answer the user's question from the matched FAQ
collection.
"""

from __future__ import annotations

import os

import agentc
from langchain_core.tools import StructuredTool
from langchain_openai import ChatOpenAI
from langgraph.prebuilt import create_react_agent
from langgraph.types import Command

from agents.state import AgentState


def _get_faq_tool(collection_name: str) -> StructuredTool:
    """Retrieve hybrid_faq_search from the Agent Catalog and bind the collection."""
    catalog = agentc.Catalog()
    item = catalog.find(kind="tool", name="hybrid_faq_search")

    # Wrap the tool so the collection_name is pre-filled from state.
    original_func = item.func

    def bound_search(query: str) -> list[dict]:
        """Search the FAQ collection for content relevant to the query."""
        return original_func(query=query, collection_name=collection_name)

    return StructuredTool.from_function(
        func=bound_search,
        name="hybrid_faq_search",
        description=(
            f"Search the '{collection_name}' FAQ for content relevant to the user's question. "
            "Returns a list of document chunks with their content and relevance score."
        ),
    )


async def faq_search_agent_node(state: AgentState) -> Command:
    """Run a ReAct loop with the hybrid FAQ search tool to answer the user's question."""
    collection_name = state.get("faq_collection", "")
    if not collection_name:
        return Command(
            goto="__end__",
            update={
                "answer": "No FAQ collection was identified for this question.",
                "routed_to": "faq_search_agent",
            },
        )

    tool = _get_faq_tool(collection_name)
    llm = ChatOpenAI(
        model="gpt-4o-mini",
        temperature=0,
        api_key=os.environ["OPENAI_API_KEY"],
    )

    system_prompt = (
        "You are a helpful assistant that answers questions using FAQ documentation. "
        "Use the hybrid_faq_search tool to find relevant content, then synthesise a "
        "clear, accurate answer based only on what the documents say. "
        "If the documents do not contain enough information, say so explicitly."
    )

    agent = create_react_agent(llm, [tool], prompt=system_prompt)
    result = await agent.ainvoke({"messages": [("user", state["message"])]})

    final_answer = result["messages"][-1].content

    return Command(
        goto="__end__",
        update={
            "answer": final_answer,
            "routed_to": "faq_search_agent",
            "faq_collection": collection_name,
        },
    )
