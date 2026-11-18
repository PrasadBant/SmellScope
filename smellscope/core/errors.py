"""Contract error model and standard error codes."""
from typing import Any, Optional


class SmellScopeError(Exception):
    """Base exception for all SmellScope errors adhering to contract Section 2.2."""

    def __init__(
        self,
        code: str,
        message: str,
        details: Optional[dict[str, Any]] = None,
        measure: Optional[str] = None,
        cls: Optional[str] = None,
    ):
        super().__init__(message)
        self.code = code
        self.message = message
        self.details = details or {}
        self.measure = measure
        self.cls = cls

    def to_dict(self) -> dict[str, Any]:
        """Convert error to JSON-compliant dictionary."""
        out: dict[str, Any] = {
            "code": self.code,
            "message": self.message,
            "details": self.details,
        }
        if self.measure is not None:
            out["measure"] = self.measure
        if self.cls is not None:
            out["class"] = self.cls
        return out
