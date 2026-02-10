from __future__ import annotations

from dataclasses import dataclass
from typing import List

from ..models import TriState


@dataclass(frozen=True)
class SchemaCompatResult:
    schema_versions_compatible: TriState
    errors: List[str]


def validate_schema_compatibility(execution_ledger_path: str, decision_ledger_path: str) -> SchemaCompatResult:
    """
    Placeholder.
    Later: compare schema versions embedded in ledgers vs current supported versions.
    """
    return SchemaCompatResult(schema_versions_compatible="UNKNOWN", errors=["not_implemented"])
