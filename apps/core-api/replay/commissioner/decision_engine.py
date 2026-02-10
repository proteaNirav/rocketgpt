from __future__ import annotations

from dataclasses import dataclass
from typing import List

from ..models import CommissionerDecision, TriState


@dataclass(frozen=True)
class CommissionerInputs:
    ledger_hash_chain_valid: TriState
    artifact_hashes_valid: TriState
    schema_versions_compatible: TriState
    tenant_org_scope_valid: TriState
    user_permission_valid: TriState
    redaction_policy_satisfied: TriState


@dataclass(frozen=True)
class CommissionerResult:
    decision: CommissionerDecision
    denial_reasons: List[str]


def decide(inputs: CommissionerInputs, deny_if_missing_inputs: bool = True) -> CommissionerResult:
    """
    Strict gate (Stage-3+).
    Placeholder: implement the exact contract rules.
    """
    return CommissionerResult(decision="DENY", denial_reasons=["not_implemented"])
