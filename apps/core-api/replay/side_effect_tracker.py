"""
RGPT Phase-E3-E: Side Effect Drift (Controlled Mode) — Skeleton (log-only)

Goal (Step-1):
- Provide a single place to record "side effects" during replay.
- Return a drift report object without failing execution.
- No enforcement in this step; verdict always PASS.

Later steps will:
- Read side_effects policy from replay contract
- Snapshot filesystem/table writes/network calls
- Compute drift class D0-D3
- Apply progressive enforcement (DEV warn, PROD fail)
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional


@dataclass(frozen=True)
class DriftReport:
    mode: str
    drift_class: str
    unexpected_files: List[str]
    unexpected_tables: List[str]
    network_calls_detected: bool
    runtime_mode_changed: bool
    severity_score: int
    verdict: str
    generated_at_utc: str
    notes: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "mode": self.mode,
            "drift_class": self.drift_class,
            "unexpected_files": list(self.unexpected_files),
            "unexpected_tables": list(self.unexpected_tables),
            "network_calls_detected": self.network_calls_detected,
            "runtime_mode_changed": self.runtime_mode_changed,
            "severity_score": self.severity_score,
            "verdict": self.verdict,
            "generated_at_utc": self.generated_at_utc,
            "notes": self.notes,
        }


class SideEffectTracker:
    """
    Log-only tracker (Step-1).
    Contract parsing + real detection will be added in Step-2+.
    """

    @staticmethod
    def validate(ctx: Any) -> DriftReport:
        # Best-effort mode detection without hard dependency on ctx shape.
        mode = "DEV"
        try:
            mode = str(getattr(ctx, "mode", None) or getattr(ctx, "runtime_mode", None) or "DEV").upper()
        except Exception:
            mode = "DEV"

        now = datetime.now(timezone.utc).isoformat(timespec="seconds")

        # Skeleton: no detection yet.
        return DriftReport(
            mode=mode,
            drift_class="D0",
            unexpected_files=[],
            unexpected_tables=[],
            network_calls_detected=False,
            runtime_mode_changed=False,
            severity_score=0,
            verdict="PASS",  # Step-1: always PASS (log-only)
            generated_at_utc=now,
            notes="Step-1 skeleton: detection/enforcement not enabled yet.",
        )
