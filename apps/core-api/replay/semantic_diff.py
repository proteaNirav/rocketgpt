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
    Deterministic semantic diff v1 (foundation for Judge v2).

    For now:
    - compares fingerprints when available
    - falls back to stable JSON compare of canonical execution blobs

    Next step (E3-E-B) will:
    - split into intent/decision/outcome/side-effects
    - classify drift types
    - compute richer confidence
    """
    a_fp = (((csm_a.get("meta") or {}).get("execution_fingerprint_sha256")) or "").strip()
    b_fp = (((csm_b.get("meta") or {}).get("execution_fingerprint_sha256")) or "").strip()

    if a_fp and b_fp:
        eq = (a_fp == b_fp)
        drift = () if eq else ("STRUCTURAL_DRIFT",)
        return DiffResult(
            equivalent=eq,
            confidence=1.0 if eq else 0.60,
            drift_classes=drift,
            critical=False,
            summary="Fingerprint match." if eq else "Fingerprint mismatch (base canonical form differs).",
            details={"fingerprint_a": a_fp, "fingerprint_b": b_fp},
        )

    # Fallback: stable canonical JSON compare
    a_blob = _stable(csm_a.get("execution"))
    b_blob = _stable(csm_b.get("execution"))
    eq = (a_blob == b_blob)

    drift = () if eq else ("STRUCTURAL_DRIFT",)
    return DiffResult(
        equivalent=eq,
        confidence=0.95 if eq else 0.55,
        drift_classes=drift,
        critical=False,
        summary="Stable canonical compare match." if eq else "Stable canonical compare mismatch.",
        details={"has_fingerprint": False},
    )
