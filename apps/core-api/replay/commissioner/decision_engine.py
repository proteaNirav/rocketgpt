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


def _eval_check(name: str, value: TriState, deny_if_missing_inputs: bool) -> List[str]:
    """
    Returns a list of denial reasons for this check (empty => ok).
    """
    if value == "PASS":
        return []
    if value == "FAIL":
        return [f"{name}:FAIL"]
    # UNKNOWN
    if deny_if_missing_inputs:
        return [f"{name}:UNKNOWN"]
    return []


def decide(
    inputs: CommissionerInputs,
    deny_if_missing_inputs: bool = True,
    must_have: List[str] | None = None,
) -> CommissionerResult:
    """
    STRICT gate (Stage-3+).

    Contract behavior:
    - Any must-have FAIL => DENY
    - Any must-have UNKNOWN => DENY if deny_if_missing_inputs=True
    - Otherwise => ALLOW

    Note: must_have controls which fields are enforced.
    """
    if must_have is None:
        must_have = [
            "ledger_hash_chain_valid",
            "artifact_hashes_valid",
            "schema_versions_compatible",
            "tenant_org_scope_valid",
            "user_permission_valid",
            "redaction_policy_satisfied",
        ]

    mapping = {
        "ledger_hash_chain_valid": inputs.ledger_hash_chain_valid,
        "artifact_hashes_valid": inputs.artifact_hashes_valid,
        "schema_versions_compatible": inputs.schema_versions_compatible,
        "tenant_org_scope_valid": inputs.tenant_org_scope_valid,
        "user_permission_valid": inputs.user_permission_valid,
        "redaction_policy_satisfied": inputs.redaction_policy_satisfied,
    }

    denial_reasons: List[str] = []

    for name in must_have:
        if name not in mapping:
            # Defensive: unknown requirement name should deny (strict)
            denial_reasons.append(f"{name}:REQUIREMENT_NOT_RECOGNIZED")
            continue
        denial_reasons.extend(_eval_check(name, mapping[name], deny_if_missing_inputs))

    if denial_reasons:
        return CommissionerResult(decision="DENY", denial_reasons=denial_reasons)

    return CommissionerResult(decision="ALLOW", denial_reasons=[])
