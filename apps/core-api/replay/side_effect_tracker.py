"""
RGPT Phase-E3-E: Side Effect Drift (Controlled Mode)

This module provides a drift report for "side effects" during replay.

Step-1: skeleton (done)
Step-4A: progressive verdict scaffolding (DEV warn / PROD fail) + minimal file drift detection
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple
import fnmatch
import hashlib
import json


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


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def _safe_get_mode(ctx: Any) -> str:
    # Best-effort: allow ctx.mode / ctx.runtime_mode; default DEV
    for key in ("mode", "runtime_mode"):
        try:
            val = getattr(ctx, key, None)
            if val:
                return str(val).upper()
        except Exception:
            pass
    return "DEV"


def _load_contract_side_effects(ctx: Any) -> Dict[str, Any]:
    """
    Best-effort read of contract's side_effects policy.

    We try:
    - ctx.contract (dict-like)
    - ctx.contract_path (path)
    - ctx.paths.contract_path (path)
    If nothing found, return defaults.
    """
    default_policy: Dict[str, Any] = {
        "allowed_files": [],
        "blocked_files": [],
        "allow_network": False,
        "allow_runtime_mode_change": False,
        "max_unexpected_effects": 0,
        "strict": False,
        # Optional detection scope; if empty, we won't scan filesystem.
        "scan_roots": [],
    }

    # 1) ctx.contract
    try:
        c = getattr(ctx, "contract", None)
        if isinstance(c, dict):
            se = c.get("side_effects") or c.get("sideEffects") or {}
            out = {**default_policy, **(se if isinstance(se, dict) else {})}
            return out
    except Exception:
        pass

    # 2) contract path variants
    contract_path = None
    for key in ("contract_path",):
        try:
            p = getattr(ctx, key, None)
            if p:
                contract_path = str(p)
                break
        except Exception:
            pass

    if not contract_path:
        try:
            p = getattr(getattr(ctx, "paths", None), "contract_path", None)
            if p:
                contract_path = str(p)
        except Exception:
            pass

    if contract_path:
        try:
            data = json.loads(Path(contract_path).read_text(encoding="utf-8"))
            se = data.get("side_effects") or data.get("sideEffects") or {}
            out = {**default_policy, **(se if isinstance(se, dict) else {})}
            return out
        except Exception:
            # fall back to defaults
            return default_policy

    return default_policy


def _hash_file(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def _scan_files(roots: List[str]) -> Dict[str, str]:
    """
    Returns mapping of relative posix path -> sha256.
    Uses current working directory as base for relative paths.
    """
    base = Path.cwd().resolve()
    out: Dict[str, str] = {}
    for r in roots:
        root = (base / r).resolve() if not Path(r).is_absolute() else Path(r).resolve()
        if not root.exists():
            continue
        for p in root.rglob("*"):
            if p.is_file():
                rel = p.resolve().relative_to(base).as_posix()
                try:
                    out[rel] = _hash_file(p)
                except Exception:
                    # ignore unreadable files
                    continue
    return out


def _match_any(path_posix: str, patterns: List[str]) -> bool:
    for pat in patterns:
        # patterns are glob-like; match against posix relpath
        if fnmatch.fnmatch(path_posix, pat):
            return True
    return False


def _classify_and_verdict(
    mode: str,
    unexpected_count: int,
    destructive: bool,
    policy: Dict[str, Any],
) -> Tuple[str, int, str]:
    """
    Drift classes:
      D0: no drift
      D1: benign drift (within tolerance)
      D2: unauthorized but non-destructive (beyond tolerance)
      D3: destructive / policy violation
    Verdict (C model):
      DEV: D1 => WARN, D2/D3 => FAIL
      PROD: any drift => FAIL
      STAGING: treat like PROD for now (can tune later)
    """
    max_unexpected = int(policy.get("max_unexpected_effects", 0) or 0)
    strict = bool(policy.get("strict", False))

    if unexpected_count == 0 and not destructive:
        return "D0", 0, "PASS"

    if destructive:
        # destructive always hard
        return "D3", 3, "FAIL"

    # non-destructive drift
    if unexpected_count <= max_unexpected:
        drift_class = "D1"
        score = 1
    else:
        drift_class = "D2"
        score = 2

    m = (mode or "DEV").upper()
    if m in ("PROD", "PRODUCTION"):
        return drift_class, score, "FAIL"
    if m in ("STAGING", "PREPROD", "UAT"):
        # conservative by default
        if drift_class == "D1" and not strict:
            return drift_class, score, "WARN"
        return drift_class, score, "FAIL"

    # DEV (default)
    if strict:
        return drift_class, score, "FAIL"
    if drift_class == "D1":
        return drift_class, score, "WARN"
    return drift_class, score, "FAIL"


class SideEffectTracker:
    """
    Progressive-ready tracker.
    Minimal detection implemented: file drift under policy.scan_roots.

    Note: To detect drift, caller should run validate() at least once at end.
    For richer detection (before/after), a later step will add begin()/end() snapshots.
    For now, we assume a single end-of-run scan and compare against allow/deny patterns only.
    """

    @staticmethod
    def validate(ctx: Any, contract_path: str | None = None) -> DriftReport:
        mode = _safe_get_mode(ctx)
        policy = _load_contract_side_effects(ctx, contract_path)

        allowed_files = list(policy.get("allowed_files", []) or [])
        blocked_files = list(policy.get("blocked_files", []) or [])
        scan_roots = list(policy.get("scan_roots", []) or [])

        # Minimal filesystem scan (end-of-run only).
        # If scan_roots is empty, we do not scan to avoid overhead.
        unexpected_files: List[str] = []
        if scan_roots:
            files = _scan_files(scan_roots)
            for rel in sorted(files.keys()):
                # If blocked matches => unexpected
                if blocked_files and _match_any(rel, blocked_files):
                    unexpected_files.append(rel)
                    continue
                # If allowed_files present => everything else is unexpected
                if allowed_files and not _match_any(rel, allowed_files):
                    unexpected_files.append(rel)

        # Placeholders for future hooks
        unexpected_tables: List[str] = []
        network_calls_detected = False
        runtime_mode_changed = False

        destructive = False  # reserved for future (e.g., deletes outside allowlist)

        drift_class, severity_score, verdict = _classify_and_verdict(
            mode=mode,
            unexpected_count=len(unexpected_files) + len(unexpected_tables),
            destructive=destructive,
            policy=policy,
        )

        note = "progressive scaffolding: file-pattern evaluation only; no begin/end snapshot yet."
        if not scan_roots:
            note = "progressive scaffolding: detection disabled (policy.scan_roots empty)."

        return DriftReport(
            mode=mode,
            drift_class=drift_class,
            unexpected_files=unexpected_files,
            unexpected_tables=unexpected_tables,
            network_calls_detected=network_calls_detected,
            runtime_mode_changed=runtime_mode_changed,
            severity_score=severity_score,
            verdict=verdict,
            generated_at_utc=_utc_now_iso(),
            notes=note,
        )

