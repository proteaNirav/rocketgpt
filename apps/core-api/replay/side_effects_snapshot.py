from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Dict
import hashlib
import json
import os


@dataclass(frozen=True)
class Snapshot:
    """Deterministic snapshot of replay-relevant side-effect surfaces."""
    ledger_hash: str
    file_hash: str
    context_hash: str


def _sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def _hash_dict(data: Dict[str, Any]) -> str:
    payload = json.dumps(data, sort_keys=True, separators=(",", ":"), ensure_ascii=False).encode("utf-8")
    return _sha256_bytes(payload)


def _hash_files(root: str) -> str:
    """
    Hash file contents under a controlled directory.
    Deterministic ordering; ignores unreadable files.
    Includes relative file paths to reduce collision risk.
    """
    if not os.path.exists(root):
        return "EMPTY"

    sha = hashlib.sha256()

    for dirpath, _, filenames in os.walk(root):
        for name in sorted(filenames):
            full = os.path.join(dirpath, name)
            rel = os.path.relpath(full, root).replace("\\", "/")
            try:
                with open(full, "rb") as f:
                    content = f.read()
            except OSError:
                continue

            sha.update(rel.encode("utf-8"))
            sha.update(b"\0")
            sha.update(content)
            sha.update(b"\0")

    return sha.hexdigest()


def collect_snapshot(ctx: Any, files_root: str = "docs/ops/executions") -> Snapshot:
    """
    Collect a BEGIN/END snapshot for drift detection.
    - ledger_hash: based on ctx.ledger.export_state() if present
    - file_hash: hash of controlled execution artifacts directory
    - context_hash: small stable subset of ctx fields
    """
    ledger_state: Dict[str, Any] = {}
    ledger = getattr(ctx, "ledger", None)
    if ledger is not None and hasattr(ledger, "export_state"):
        try:
            ledger_state = ledger.export_state()  # type: ignore[assignment]
        except Exception:
            ledger_state = {"_export_state_error": True}

    context_state = {
        "runtime_mode": getattr(ctx, "runtime_mode", None),
        "policy_version": getattr(ctx, "policy_version", None),
        "contract_hash": getattr(ctx, "contract_hash", None),
    }

    return Snapshot(
        ledger_hash=_hash_dict(ledger_state),
        file_hash=_hash_files(files_root),
        context_hash=_hash_dict(context_state),
    )


def _classify_drift(ledger_drift: bool, file_drift: bool, context_drift: bool) -> Dict[str, Any]:
    """
    Drift classes:
      D0: No drift
      D1: File drift only (execution artifact surface)
      D2: Ledger drift (append-only state changed unexpectedly)
      D3: Context drift (runtime/policy/contract identity changed)  -> critical
    """
    side_effects_detected = bool(ledger_drift or file_drift or context_drift)

    if not side_effects_detected:
        return {"drift_class": "D0", "severity": "NONE", "severity_score": 0}

    if context_drift:
        return {"drift_class": "D3", "severity": "HIGH", "severity_score": 90}

    if ledger_drift:
        return {"drift_class": "D2", "severity": "HIGH", "severity_score": 70}

    # file drift only
    return {"drift_class": "D1", "severity": "MEDIUM", "severity_score": 40}


def diff_snapshots(begin: Snapshot, end: Snapshot) -> Dict[str, Any]:
    ledger_drift = begin.ledger_hash != end.ledger_hash
    file_drift = begin.file_hash != end.file_hash
    context_drift = begin.context_hash != end.context_hash

    cls = _classify_drift(ledger_drift, file_drift, context_drift)

    drift: Dict[str, Any] = {
        "ledger_drift": ledger_drift,
        "file_drift": file_drift,
        "context_drift": context_drift,
        "side_effects_detected": bool(ledger_drift or file_drift or context_drift),
        "drift_class": cls["drift_class"],
        "severity": cls["severity"],
        "severity_score": cls["severity_score"],
    }

    return drift
