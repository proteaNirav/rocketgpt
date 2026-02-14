from __future__ import annotations

from typing import Any, Dict, List, Tuple
from ..semantic_normalizer import canonicalize_execution
from ..semantic_diff import semantic_diff



def _safe_get(d: Dict[str, Any], path: List[str]) -> Any:
    cur: Any = d
    for k in path:
        if not isinstance(cur, dict) or k not in cur:
            return None
        cur = cur[k]
    return cur


def _event_count(doc: Dict[str, Any]) -> int | None:
    ev = doc.get("events")
    if isinstance(ev, list):
        return len(ev)
    return None


def compare_ledgers(
    execution_ledger: Dict[str, Any],
    decision_ledger: Dict[str, Any],
) -> Tuple[bool, List[str], str]:
    """
    Minimal deterministic comparison for Phase-E3-D.

    Returns:
      mismatched: bool
      mismatch_fields: list[str]
      notes: str
    """
    mismatch_fields: List[str] = []

    # Common fields used in our ledgers (best-effort)
    exec_schema = execution_ledger.get("schema_version")
    dec_schema = decision_ledger.get("schema_version")
    if exec_schema is not None or dec_schema is not None:
        if exec_schema != dec_schema:
            mismatch_fields.append("schema_version")

    exec_id = execution_ledger.get("execution_id")
    dec_exec_id = decision_ledger.get("execution_id")
    if exec_id is not None or dec_exec_id is not None:
        if exec_id != dec_exec_id:
            mismatch_fields.append("execution_id")

    exec_events = _event_count(execution_ledger)
    dec_events = _event_count(decision_ledger)
    if exec_events is not None or dec_events is not None:
        if exec_events != dec_events:
            mismatch_fields.append("events.count")

    notes = "minimal_compare(schema_version, execution_id, events.count)"
    return (len(mismatch_fields) > 0), mismatch_fields, notes

def compare_ledgers_semantic(
    execution_ledger: Dict[str, Any],
    decision_ledger: Dict[str, Any],
) -> Tuple[bool, List[str], str, Dict[str, Any]]:
    """
    Semantic comparison (Judge v2 foundation):
    - Canonicalize both ledgers into CSM
    - Run deterministic semantic diff
    - Return mismatch + structured details

    Returns:
      mismatched: bool
      mismatch_fields: list[str]  (drift classes)
      notes: str
      details: dict (full semantic diff details)
    """
    csm_a = canonicalize_execution(execution_ledger)
    csm_b = canonicalize_execution(decision_ledger)

    res = semantic_diff(csm_a, csm_b)

    mismatch_fields = list(res.drift_classes)  # drift classes as fields
    notes = f"semantic_diff(equivalent={res.equivalent}, confidence={res.confidence:.2f})"

    # Judge v2 considers mismatched == not equivalent OR critical
    mismatched = (not res.equivalent) or bool(res.critical)

    details = {
        "equivalent": res.equivalent,
        "confidence": res.confidence,
        "critical": res.critical,
        "drift_classes": list(res.drift_classes),
        "summary": res.summary,
        "details": res.details,
        "fingerprints": {
            "a": (csm_a.get("meta") or {}).get("execution_fingerprint_sha256"),
            "b": (csm_b.get("meta") or {}).get("execution_fingerprint_sha256"),
        },
    }

    return mismatched, mismatch_fields, notes, details
