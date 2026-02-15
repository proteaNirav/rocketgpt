# apps/core-api/replay/semantic_diff.py
from __future__ import annotations

import json
from dataclasses import dataclass
from typing import Any, Dict, List, Optional, Tuple

JsonDict = Dict[str, Any]


DRIFT_CLASSES = (
    "STRUCTURAL_DRIFT",
    "PARAM_DRIFT",
    "POLICY_DRIFT",
    "SIDE_EFFECT_DRIFT",
    "OUTCOME_DRIFT",
    "SECURITY_DRIFT",
    "NON_DETERMINISTIC",
    "CRITICAL_DIVERGENCE",
)

@dataclass(frozen=True)
class DiffResult:
    equivalent: bool
    confidence: float
    drift_classes: Tuple[str, ...]
    critical: bool
    summary: str
    details: JsonDict


def _stable(obj: Any) -> str:
    return json.dumps(obj, ensure_ascii=False, sort_keys=True, separators=(",", ":"))


def semantic_diff(csm_a: JsonDict, csm_b: JsonDict) -> DiffResult:
    """
    Deterministic semantic diff v2 (layered compare).

    Layers:
      1. Fingerprint check
      2. Schema comparison
      3. Event count comparison
      4. Structural key comparison
    """

    drift: List[str] = []
    details: JsonDict = {}

    # --- 1. Fingerprint Layer ---
    a_fp = (((csm_a.get("meta") or {}).get("execution_fingerprint_sha256")) or "").strip()
    b_fp = (((csm_b.get("meta") or {}).get("execution_fingerprint_sha256")) or "").strip()

    details["fingerprints"] = {"a": a_fp, "b": b_fp}

    if a_fp and b_fp and a_fp == b_fp:
        return DiffResult(
            equivalent=True,
            confidence=1.0,
            drift_classes=(),
            critical=False,
            summary="Exact semantic fingerprint match.",
            details=details,
        )

    # --- 2. Schema Layer ---
    exec_a = csm_a.get("execution") or {}
    exec_b = csm_b.get("execution") or {}

    schema_a = exec_a.get("schema_version")
    schema_b = exec_b.get("schema_version")

    if schema_a != schema_b:
        drift.append("STRUCTURAL_DRIFT")
        details["schema_mismatch"] = {"a": schema_a, "b": schema_b}

    # --- 3. Event Count Layer ---
    def _event_count(x: Dict[str, Any]) -> int | None:
        if isinstance(x.get("events"), list):
            return len(x.get("events"))
        return None

    count_a = _event_count(exec_a)
    count_b = _event_count(exec_b)

    if count_a is not None or count_b is not None:
        if count_a != count_b:
            drift.append("OUTCOME_DRIFT")
            details["event_count"] = {"a": count_a, "b": count_b}

    # --- 4. Structural Key Comparison ---
    keys_a = set(exec_a.keys())
    keys_b = set(exec_b.keys())

    if keys_a != keys_b:
        drift.append("STRUCTURAL_DRIFT")
        details["key_diff"] = {
            "only_in_a": sorted(list(keys_a - keys_b)),
            "only_in_b": sorted(list(keys_b - keys_a)),
        }

    # --- Final Evaluation ---
    equivalent = len(drift) == 0
    critical = "OUTCOME_DRIFT" in drift

    confidence = 0.90 if equivalent else 0.65

    return DiffResult(
        equivalent=equivalent,
        confidence=confidence,
        drift_classes=tuple(sorted(set(drift))),
        critical=critical,
        summary="Layered semantic diff evaluation.",
        details=details,
    )
