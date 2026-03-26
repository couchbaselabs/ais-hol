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
    """Retrieve math tools from the Agent Catalog."""
    catalog = agentc.Catalog()
    tool_names = ["add", "subtract", "multiply", "divide", "evaluate_expression"]
    tools = []
    for name in tool_names:
        item = catalog.find(kind="tool", name=name)
        tools.append(
            StructuredTool.from_function(
                func=item.func,
                name=item.meta.name,
                description=item.meta.description,
            )
        )
    return tools


async def math_agent_node(state: AgentState) -> Command:
    """Run a ReAct loop with math tools to answer the user's calculation."""
    tools = _get_math_tools()
    llm = ChatOpenAI(
        model="gpt-4o-mini",
        temperature=0,
        api_key=os.environ["OPENAI_API_KEY"],
    )

    agent = create_react_agent(llm, tools)
    result = await agent.ainvoke({"messages": [("user", state["message"])]})

    # The last message in the result is the final answer.
    final_answer = result["messages"][-1].content

    return Command(
        goto="__end__",
        update={"answer": final_answer, "routed_to": "math_agent"},
    )
