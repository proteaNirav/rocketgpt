from __future__ import annotations

from dataclasses import dataclass
from typing import List, Literal, Optional

from ..models import TriState


@dataclass(frozen=True)
class HashChainResult:
    ledger_hash_chain_valid: TriState
    errors: List[str]


def validate_hash_chain(execution_ledger_path: str) -> HashChainResult:
    """
    Placeholder.
    Later: validate per-line hash chain of EXECUTION ledger.
    Return PASS/FAIL/UNKNOWN with detailed errors.
    """
    return HashChainResult(ledger_hash_chain_valid="UNKNOWN", errors=["not_implemented"])
