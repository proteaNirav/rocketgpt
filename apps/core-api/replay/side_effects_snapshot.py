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


def diff_snapshots(begin: Snapshot, end: Snapshot) -> Dict[str, Any]:
    drift = {
        "ledger_drift": begin.ledger_hash != end.ledger_hash,
        "file_drift": begin.file_hash != end.file_hash,
        "context_drift": begin.context_hash != end.context_hash,
    }

    drift["side_effects_detected"] = any(drift.values())

    if not drift["side_effects_detected"]:
        drift["severity"] = "NONE"
    elif drift["context_drift"]:
        drift["severity"] = "HIGH"
    elif drift["file_drift"]:
        drift["severity"] = "MEDIUM"
    else:
        drift["severity"] = "LOW"

    return drift
