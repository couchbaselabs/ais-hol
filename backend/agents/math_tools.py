import math
import re

import agentc
from pydantic import BaseModel


class TwoNumbers(BaseModel):
    a: float
    b: float


class Expression(BaseModel):
    expression: str


# Tokens allowed in evaluate_expression: numbers, whitespace, operators,
# parentheses, dots, and names that exist in the math module.
_MATH_NAMES = set(dir(math)) | {"abs", "round"}
_SAFE_TOKEN = re.compile(r"^(\d+\.?\d*|[+\-*/^%().,\s]|[a-zA-Z_]\w*)$")


def _safe_eval(expression: str) -> float:
    """Evaluate a mathematical expression using only math module names."""
    # Reject any token that is not a number, operator, or known math name.
    tokens = re.findall(r"[a-zA-Z_]\w*", expression)
    for token in tokens:
        if token not in _MATH_NAMES:
            raise ValueError(f"Disallowed token in expression: '{token}'")

    # Block common injection patterns regardless.
    for banned in ("import", "exec", "eval", "__", "open", "os", "sys"):
        if banned in expression:
            raise ValueError(f"Disallowed keyword in expression: '{banned}'")

    # Replace ^ with ** for natural math notation.
    expression = expression.replace("^", "**")

    allowed_globals = {name: getattr(math, name) for name in dir(math)}
    allowed_globals["__builtins__"] = {}
    allowed_globals["abs"] = abs
    allowed_globals["round"] = round

    result = eval(expression, allowed_globals)  # noqa: S307 — guarded above
    return float(result)


@agentc.tool
def add(a: float, b: float) -> float:
    """Add two numbers and return the result."""
    return a + b


@agentc.tool
def subtract(a: float, b: float) -> float:
    """Subtract b from a and return the result."""
    return a - b


@agentc.tool
def multiply(a: float, b: float) -> float:
    """Multiply two numbers and return the result."""
    return a * b


@agentc.tool
def divide(a: float, b: float) -> float:
    """Divide a by b and return the result. Raises ValueError if b is zero."""
    if b == 0:
        raise ValueError("Division by zero is not allowed.")
    return a / b


@agentc.tool
def evaluate_expression(expression: str) -> float:
    """Evaluate a mathematical expression string.

    Supports standard arithmetic operators (+, -, *, /, ^, %), parentheses,
    and any function available in Python's math module (e.g. sqrt, sin, log).
    Rejects any expression containing non-math tokens or dangerous keywords.

    Examples:
        evaluate_expression("2 + 2")          -> 4.0
        evaluate_expression("sqrt(144) + 10") -> 22.0
        evaluate_expression("2^10")           -> 1024.0
    """
    return _safe_eval(expression)
