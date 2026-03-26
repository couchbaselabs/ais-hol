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
    """Retrieve hybrid_faq_search from the Agent Catalog and bind the collection.

    TODO (Exercise 7 — Step 8):
      1. Instantiate the catalog: catalog = agentc.Catalog()
      2. Retrieve the tool: item = catalog.find(kind="tool", name="hybrid_faq_search")
      3. Create a wrapper function that pre-fills collection_name:
           def bound_search(query: str) -> list[dict]:
               return item.func(query=query, collection_name=collection_name)
      4. Return StructuredTool.from_function(
             func=bound_search,
             name="hybrid_faq_search",
             description=f"Search the '{collection_name}' FAQ ...",
         )
    """
    raise NotImplementedError("Implement _get_faq_tool() in faq_search_agent.py")


async def faq_search_agent_node(state: AgentState) -> Command:
    """Run a ReAct loop with the hybrid FAQ search tool to answer the user's question.

    TODO (Exercise 7 — Step 8):
      1. Get collection_name from state.get("faq_collection", "").
         If empty, return Command(goto="__end__", update={
             "answer": "No FAQ collection was identified for this question.",
             "routed_to": "faq_search_agent",
         })
      2. Call _get_faq_tool(collection_name) to get the tool.
      3. Create an LLM using the shared helper from router_agent:
           from agents.router_agent import _get_llm
           llm = _get_llm()
         This respects OPENAI_BASE_URL for Capella AI Model Service compatibility.
      4. Define a system prompt instructing the agent to use the FAQ tool
         and answer only from retrieved documents.
      5. Build a ReAct agent: agent = create_react_agent(llm, [tool], prompt=system_prompt)
      6. Invoke: result = await agent.ainvoke({"messages": [("user", state["message"])]})
      7. Extract the final answer: result["messages"][-1].content
      8. Return Command(goto="__end__", update={
             "answer": final_answer,
             "routed_to": "faq_search_agent",
             "faq_collection": collection_name,
         })
    """
    raise NotImplementedError("Implement faq_search_agent_node() in faq_search_agent.py")
