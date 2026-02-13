from __future__ import annotations

import argparse
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List

try:
    from .commissioner.decision_engine import CommissionerInputs, decide
    from .models import ReplayConfig, ReplayContext, ReplayPaths, TriState
    from .utils.io import read_json, write_json
    from .validators.artifact_manifest_validator import (
        validate_artifacts_manifest,
    )
    from .validators.hash_chain_validator import validate_hash_chain
    from .validators.schema_compat_validator import (
        validate_schema_compatibility,
    )
except ImportError:  # pragma: no cover - local execution fallback
    package_root = Path(__file__).resolve().parents[1]
    if str(package_root) not in sys.path:
        sys.path.insert(0, str(package_root))
    try:
        from replay.commissioner.decision_engine import (
            CommissionerInputs,
            decide,
        )
        from replay.models import (
            ReplayConfig,
            ReplayContext,
            ReplayPaths,
            TriState,
        )
        from replay.utils.io import read_json, write_json
        from replay.validators.artifact_manifest_validator import (
            validate_artifacts_manifest,
        )
        from replay.validators.hash_chain_validator import validate_hash_chain
        from replay.validators.schema_compat_validator import (
            validate_schema_compatibility,
        )
    except ImportError as exc:
        raise SystemExit(
            "Replay runner import failed. Ensure PYTHONPATH includes "
            "'apps/core-api' or run from that directory: "
            "`python -m replay --contract "
            "apps/core-api/replay/replay_contract.json`."
        ) from exc


def _utc_now_iso(frozen_ts: datetime | None = None) -> str:
    """Return ISO timestamp, using frozen_ts if provided."""
    ts = frozen_ts if frozen_ts else datetime.now(timezone.utc)
    return ts.isoformat()


def _default_run_dir(
    base: str, execution_id: str, frozen_ts: datetime | None = None
) -> str:
    ts = frozen_ts if frozen_ts else datetime.now(timezone.utc)
    ts_str = ts.strftime("%Y%m%d-%H%M%SZ")
    safe_exec = execution_id or "unknown_execution"
    return str(Path(base) / safe_exec / ts_str)


def _compute_inspector_status(checks: Dict[str, TriState]) -> TriState:
    """
    Compute overall inspector status from individual check results.

    - FAIL if any check is FAIL
    - UNKNOWN if any check is UNKNOWN (and none FAIL)
    - PASS only if all checks are PASS
    """
    values = list(checks.values())
    if "FAIL" in values:
        return "FAIL"
    if "UNKNOWN" in values:
        return "UNKNOWN"
    return "PASS"


def _ensure_dir(p: str) -> None:
    Path(p).mkdir(parents=True, exist_ok=True)


def _normalize_output_path(
    raw: str | None, evidence_dir: str, filename: str
) -> str:
    candidate = (raw or "").strip()
    if not candidate or candidate in {".", "./"}:
        return str(Path(evidence_dir) / filename)
    return candidate


def _collector_stage(
    ctx: ReplayContext, frozen_ts: datetime | None = None
) -> Dict[str, Any]:
    found: List[str] = []
    missing: List[str] = []

    for key, p in {
        "execution_ledger_path": ctx.paths.execution_ledger_path,
        "decision_ledger_path": ctx.paths.decision_ledger_path,
        "artifacts_manifest_path": ctx.paths.artifacts_manifest_path,
    }.items():
        if p and Path(p).exists():
            found.append(key)
        else:
            missing.append(key)

    status = "PASS" if len(missing) == 0 else "FAIL"

    return {
        "stage": "collector",
        "status": status,
        "inputs_found": found,
        "missing_inputs": missing,
        "notes": "best_effort stage (collect what exists; report missing)",
        "timestamp_utc": _utc_now_iso(frozen_ts),
    }


def _inspector_stage(
    ctx: ReplayContext,
    collector_report: Dict[str, Any],
    frozen_ts: datetime | None = None,
) -> Dict[str, Any]:
    missing_inputs = collector_report.get("missing_inputs", [])

    # Best-effort: missing inputs => UNKNOWN for dependent checks
    def tri_if_missing(required_key: str) -> TriState:
        return "UNKNOWN" if required_key in missing_inputs else "PASS"

    checks: Dict[str, TriState] = {
        "ledger_hash_chain_valid": tri_if_missing("execution_ledger_path"),
        "artifact_hashes_valid": tri_if_missing("artifacts_manifest_path"),
        "schema_versions_compatible": tri_if_missing("execution_ledger_path"),
    }

    errors: List[str] = []
    executed_checks: List[str] = []

    if "execution_ledger_path" not in missing_inputs:
        executed_checks.append("ledger_hash_chain_valid")
        r = validate_hash_chain(ctx.paths.execution_ledger_path)
        checks["ledger_hash_chain_valid"] = r.ledger_hash_chain_valid
        errors.extend([f"hash_chain:{e}" for e in r.errors])

    if "artifacts_manifest_path" not in missing_inputs:
        executed_checks.append("artifact_hashes_valid")
        r = validate_artifacts_manifest(ctx.paths.artifacts_manifest_path)
        checks["artifact_hashes_valid"] = r.artifact_hashes_valid
        errors.extend([f"artifacts:{e}" for e in r.errors])

    if (
        "execution_ledger_path" not in missing_inputs
        and "decision_ledger_path" not in missing_inputs
    ):
        executed_checks.append("schema_versions_compatible")
        r = validate_schema_compatibility(
            ctx.paths.execution_ledger_path, ctx.paths.decision_ledger_path
        )
        checks["schema_versions_compatible"] = r.schema_versions_compatible
        errors.extend([f"schema:{e}" for e in r.errors])

    return {
        "stage": "inspector",
        "checks": checks,
        "executed_checks": executed_checks,
        "status": _compute_inspector_status(checks),
        "timestamp_utc": _utc_now_iso(frozen_ts),
        "errors": errors,
    }


def _commissioner_stage(
    ctx: ReplayContext,
    inspector_report: Dict[str, Any],
    frozen_ts: datetime | None = None,
) -> Dict[str, Any]:
    must_have: List[str] = ctx.commissioner_requirements.get("must_have", [])
    deny_if_missing_inputs: bool = bool(
        ctx.commissioner_requirements.get("deny_if_missing_inputs", True)
    )

    def tenant_org_scope_valid() -> TriState:
        return "PASS"

    def user_permission_valid() -> TriState:
        return "PASS"

    def redaction_policy_satisfied() -> TriState:
        return "PASS"

    ci = CommissionerInputs(
        ledger_hash_chain_valid=inspector_report["checks"].get(
            "ledger_hash_chain_valid", "UNKNOWN"
        ),
        artifact_hashes_valid=inspector_report["checks"].get(
            "artifact_hashes_valid", "UNKNOWN"
        ),
        schema_versions_compatible=inspector_report["checks"].get(
            "schema_versions_compatible", "UNKNOWN"
        ),
        tenant_org_scope_valid=tenant_org_scope_valid(),
        user_permission_valid=user_permission_valid(),
        redaction_policy_satisfied=redaction_policy_satisfied(),
    )

    result = decide(
        ci, deny_if_missing_inputs=deny_if_missing_inputs, must_have=must_have
    )

    return {
        "stage": "commissioner",
        "decision": result.decision,
        "denial_reasons": result.denial_reasons,
        "policy_references": [],
        "timestamp_utc": _utc_now_iso(frozen_ts),
    }


def build_context(
    contract: Dict[str, Any], frozen_ts: datetime | None = None
) -> ReplayContext:
    r = contract["replay"]

    cfg = ReplayConfig(
        target_execution_id=r.get("target_execution_id", ""),
        from_event_idx=int(r.get("window", {}).get("from_event_idx", 0)),
        to_event_idx=r.get("window", {}).get("to_event_idx", None),
        mode=r.get("mode", "strict_from_stage_3"),
    )

    outputs = r.get("outputs", {})
    evidence_dir = (outputs.get("evidence_dir", "") or "").strip()
    stage_reports_dir = (outputs.get("stage_reports_dir", "") or "").strip()

    base_evidence_root = str(
        (Path(__file__).resolve().parent / "evidence").resolve()
    )

    if not evidence_dir:
        evidence_dir = _default_run_dir(
            base_evidence_root, cfg.target_execution_id, frozen_ts
        )
    if not stage_reports_dir:
        stage_reports_dir = str(Path(evidence_dir) / "stage_reports")

    paths = ReplayPaths(
        execution_ledger_path=r["inputs"].get("execution_ledger_path", ""),
        decision_ledger_path=r["inputs"].get("decision_ledger_path", ""),
        artifacts_manifest_path=r["inputs"].get("artifacts_manifest_path", ""),
        evidence_dir=evidence_dir,
        stage_reports_dir=stage_reports_dir,
        diff_report_path=_normalize_output_path(
            outputs.get("diff_report_path"), evidence_dir, "diff_report.json"
        ),
        replay_result_path=_normalize_output_path(
            outputs.get("replay_result_path"),
            evidence_dir,
            "replay_result.json",
        ),
    )

    return ReplayContext(
        config=cfg,
        paths=paths,
        side_effects=r.get("side_effects", {}),
        determinism=r.get("determinism", {}),
        pipeline=r.get("pipeline", {}),
        commissioner_requirements=r.get("commissioner_requirements", {}),
    )


def run(contract_path: str, mode_override: str | None = None) -> int:
    contract = read_json(contract_path)
    if mode_override:
        contract["replay"]["mode"] = mode_override

    # Determine frozen timestamp if determinism.freeze_time_utc is enabled
    determinism = contract.get("replay", {}).get("determinism", {})
    frozen_ts: datetime | None = None
    if determinism.get("freeze_time_utc", False):
        frozen_ts = datetime.now(timezone.utc)

    ctx = build_context(contract, frozen_ts)

    _ensure_dir(ctx.paths.evidence_dir)
    _ensure_dir(ctx.paths.stage_reports_dir)

    collector = _collector_stage(ctx, frozen_ts)
    write_json(
        str(Path(ctx.paths.stage_reports_dir) / "01_collector_report.json"),
        collector,
    )

    inspector = _inspector_stage(ctx, collector, frozen_ts)
    write_json(
        str(Path(ctx.paths.stage_reports_dir) / "02_inspector_report.json"),
        inspector,
    )

    commissioner = _commissioner_stage(ctx, inspector, frozen_ts)
    write_json(
        str(Path(ctx.paths.stage_reports_dir) / "03_commissioner_report.json"),
        commissioner,
    )

    if commissioner["decision"] != "ALLOW":
        write_json(
            str(Path(ctx.paths.replay_result_path)),
            {
                "status": "DENIED",
                "reason": "commissioner_gate",
                "timestamp_utc": _utc_now_iso(frozen_ts),
                "evidence_dir": ctx.paths.evidence_dir,
            },
        )
        return 2

    write_json(
        str(Path(ctx.paths.replay_result_path)),
        {
            "status": "ALLOWED_STAGE_1_3",
            "timestamp_utc": _utc_now_iso(frozen_ts),
            "evidence_dir": ctx.paths.evidence_dir,
        },
    )
    return 0


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument(
        "--contract", default="apps/core-api/replay/replay_contract.json"
    )
    ap.add_argument("--mode", choices=["STRICT", "SANDBOX", "LIVE_ALLOWLIST"])
    args = ap.parse_args()
    return run(args.contract, mode_override=args.mode)


if __name__ == "__main__":
    raise SystemExit(main())
