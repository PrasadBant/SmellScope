"""Contract error model and standard error codes conforming to Shared Contract v1.0 Section 2.2."""
from typing import Any, Optional

# Contract v1.0 Section 2.2 Error Codes
E_SCHEMA = "E_SCHEMA"
E_LABEL_COLUMN = "E_LABEL_COLUMN"
E_BENIGN_LABEL_MISSING = "E_BENIGN_LABEL_MISSING"
E_CLASS_TOO_SMALL = "E_CLASS_TOO_SMALL"
E_SPLIT_INVALID = "E_SPLIT_INVALID"
E_TEST_LEAK = "E_TEST_LEAK"
E_CONFIG = "E_CONFIG"
E_MEASURE_FAILED = "E_MEASURE_FAILED"
E_RULE_UNAVAILABLE = "E_RULE_UNAVAILABLE"
E_RSM_BLOCK = "E_RSM_BLOCK"
E_RSM_WARN_UNACKED = "E_RSM_WARN_UNACKED"
E_ROLLBACK_MISMATCH = "E_ROLLBACK_MISMATCH"
E_FILE = "E_FILE"
E_INTERNAL = "E_INTERNAL"


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
