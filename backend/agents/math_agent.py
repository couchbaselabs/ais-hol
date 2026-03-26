"""Math agent node — Exercise 6.

Retrieves math tools from the Agent Catalog and runs a LangGraph ReAct loop
to evaluate the user's calculation request.
"""

from __future__ import annotations

import os

import agentc
from langchain_core.tools import StructuredTool
from langchain_openai import ChatOpenAI
from langgraph.prebuilt import create_react_agent
from langgraph.types import Command

from agents.state import AgentState


def _get_math_tools() -> list[StructuredTool]:
    """Retrieve math tools from the Agent Catalog.

    TODO (Exercise 6 — Step 6):
      1. Instantiate the catalog: catalog = agentc.Catalog()
      2. For each tool name in ["add", "subtract", "multiply", "divide", "evaluate_expression"]:
           item = catalog.find(kind="tool", name=name)
           Wrap it as a StructuredTool:
           StructuredTool.from_function(
               func=item.func,
               name=item.meta.name,
               description=item.meta.description,
           )
      3. Return the list of StructuredTool instances.

    Docs: https://docs.couchbase.com/ai/build/integrate-agent-with-catalog.html
    """
    raise NotImplementedError("Implement _get_math_tools() in math_agent.py")


async def math_agent_node(state: AgentState) -> Command:
    """Run a ReAct loop with math tools to answer the user's calculation.

    TODO (Exercise 6 — Step 6):
      1. Call _get_math_tools() to get the tools list.
      2. Create an LLM: ChatOpenAI(model="gpt-4o-mini", temperature=0, ...)
      3. Build a ReAct agent: agent = create_react_agent(llm, tools)
      4. Invoke: result = await agent.ainvoke({"messages": [("user", state["message"])]})
      5. Extract the final answer: result["messages"][-1].content
      6. Return Command(goto="__end__", update={"answer": final_answer, "routed_to": "math_agent"})
    """
    raise NotImplementedError("Implement math_agent_node() in math_agent.py")
