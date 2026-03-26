"""Router agent node for the multi-agent LangGraph.

Exercise 6: classifies the user message and either answers directly or
            hands off to the math agent.
Exercise 7: additionally embeds the question, queries the FAQ catalog for
            the best-matching FAQ collection, and hands off to the FAQ
            search agent when a match is found. Returns an informative
            message when no FAQ covers the topic.
"""

from __future__ import annotations

import os
from typing import Literal

from langchain_openai import ChatOpenAI
from langgraph.types import Command
from pydantic import BaseModel

from agents.state import AgentState


# ---------------------------------------------------------------------------
# Structured output schema
# ---------------------------------------------------------------------------

class RouterDecision(BaseModel):
    """LLM classification of the user message."""

    route: Literal["direct", "math", "faq"]
    """
    - direct: router can answer from general knowledge
    - math:   question requires a calculation
    - faq:    question requires looking up specific documentation
    """
    answer: str | None = None
    """Populated when route == 'direct'."""
    missing_topic: str | None = None
    """Short description of the topic needed when no FAQ matches (set by router node, not LLM)."""


_SYSTEM_PROMPT = """\
You are a routing assistant. Classify the user message into one of three categories:

- "direct"  — you can answer confidently from general knowledge (e.g. geography, definitions, common facts)
- "math"    — the message asks for a numerical calculation, arithmetic, or mathematical evaluation
- "faq"     — the message asks a specific question that likely requires looking up internal documentation,
              policies, manuals, or domain-specific FAQs

Rules:
- If route is "direct", also provide a concise answer in the `answer` field.
- If route is "math" or "faq", leave `answer` null.
- Never guess at FAQ content — always route to "faq" when in doubt about domain-specific facts.
"""


def _get_llm() -> ChatOpenAI:
    return ChatOpenAI(
        model="gpt-4o-mini",
        temperature=0,
        api_key=os.environ["OPENAI_API_KEY"],
    )


# ---------------------------------------------------------------------------
# Router node
# ---------------------------------------------------------------------------

async def router_node(state: AgentState) -> Command:
    """Classify the message and route to the appropriate agent or answer directly."""
    from services.faq_catalog_service import find_best_faq
    from services.openai_service import get_embedding

    message = state["message"]

    # Embed the question once — reused for FAQ catalog lookup.
    embedding = await get_embedding(message)

    # Ask the LLM to classify.
    llm = _get_llm().with_structured_output(RouterDecision)
    decision: RouterDecision = await llm.ainvoke([
        {"role": "system", "content": _SYSTEM_PROMPT},
        {"role": "user", "content": message},
    ])

    if decision.route == "direct":
        return Command(
            goto="__end__",
            update={
                "answer": decision.answer or "",
                "routed_to": "router",
                "faq_collection": None,
                "missing_topic": None,
            },
        )

    if decision.route == "math":
        return Command(
            goto="math_agent",
            update={
                "routed_to": "math_agent",
                "faq_collection": None,
                "missing_topic": None,
            },
        )

    # route == "faq" — check if a matching FAQ collection exists.
    best_faq = await find_best_faq(embedding)

    if best_faq is not None:
        return Command(
            goto="faq_search_agent",
            update={
                "routed_to": "faq_search_agent",
                "faq_collection": best_faq["collection_name"],
                "missing_topic": None,
            },
        )

    # No matching FAQ — infer the missing topic from the message and respond directly.
    topic_llm = _get_llm()
    topic_response = await topic_llm.ainvoke([
        {
            "role": "system",
            "content": (
                "In 3-5 words, name the topic or domain this question is about. "
                "Use snake_case. Examples: hr_policy, product_manual, onboarding_guide."
            ),
        },
        {"role": "user", "content": message},
    ])
    missing_topic = topic_response.content.strip().lower().replace(" ", "_")

    informative_message = (
        f"I don't have a FAQ document that covers this topic yet. "
        f"To answer questions about **{missing_topic.replace('_', ' ')}**, "
        f"please ingest a relevant PDF into a Couchbase collection named `{missing_topic}` "
        f"and register it with `register_faq()`."
    )

    return Command(
        goto="__end__",
        update={
            "answer": informative_message,
            "routed_to": "router",
            "faq_collection": None,
            "missing_topic": missing_topic,
        },
    )
