from __future__ import annotations

import argparse
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List

from .commissioner.decision_engine import CommissionerInputs, decide
from .models import ReplayConfig, ReplayContext, ReplayPaths, TriState
from .utils.io import read_json, write_json
from .validators.artifact_manifest_validator import validate_artifacts_manifest
from .validators.hash_chain_validator import validate_hash_chain
from .validators.schema_compat_validator import validate_schema_compatibility


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _default_run_dir(base: str, execution_id: str) -> str:
    ts = datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%SZ")
    safe_exec = execution_id or "unknown_execution"
    return str(Path(base) / safe_exec / ts)


def _ensure_dir(p: str) -> None:
    Path(p).mkdir(parents=True, exist_ok=True)


def _collector_stage(ctx: ReplayContext) -> Dict[str, Any]:
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
        "timestamp_utc": _utc_now_iso(),
    }


def _inspector_stage(ctx: ReplayContext, collector_report: Dict[str, Any]) -> Dict[str, Any]:
    # Best-effort: missing inputs => UNKNOWN for dependent checks
    def tri_if_missing(required_key: str) -> TriState:
        return "UNKNOWN" if required_key in collector_report.get("missing_inputs", []) else "UNKNOWN"

    checks: Dict[str, TriState] = {
        "ledger_hash_chain_valid": tri_if_missing("execution_ledger_path"),
        "artifact_hashes_valid": tri_if_missing("artifacts_manifest_path"),
        "schema_versions_compatible": tri_if_missing("execution_ledger_path"),
    }

    errors: List[str] = []

    if "execution_ledger_path" not in collector_report.get("missing_inputs", []):
        r = validate_hash_chain(ctx.paths.execution_ledger_path)
        checks["ledger_hash_chain_valid"] = r.ledger_hash_chain_valid
        errors.extend([f"hash_chain:{e}" for e in r.errors])

    if "artifacts_manifest_path" not in collector_report.get("missing_inputs", []):
        r = validate_artifacts_manifest(ctx.paths.artifacts_manifest_path)
        checks["artifact_hashes_valid"] = r.artifact_hashes_valid
        errors.extend([f"artifacts:{e}" for e in r.errors])

    if (
        "execution_ledger_path" not in collector_report.get("missing_inputs", [])
        and "decision_ledger_path" not in collector_report.get("missing_inputs", [])
    ):
        r = validate_schema_compatibility(ctx.paths.execution_ledger_path, ctx.paths.decision_ledger_path)
        checks["schema_versions_compatible"] = r.schema_versions_compatible
        errors.extend([f"schema:{e}" for e in r.errors])

    return {
        "stage": "inspector",
        "checks": checks,
        "status": "PASS",
        "timestamp_utc": _utc_now_iso(),
        "errors": errors,
    }


def _commissioner_stage(ctx: ReplayContext, inspector_report: Dict[str, Any]) -> Dict[str, Any]:
    must_have: List[str] = ctx.commissioner_requirements.get("must_have", [])
    deny_if_missing_inputs: bool = bool(ctx.commissioner_requirements.get("deny_if_missing_inputs", True))

    # Until step-4, these are UNKNOWN => strict gate will DENY by default (expected)
    ci = CommissionerInputs(
        ledger_hash_chain_valid=inspector_report["checks"].get("ledger_hash_chain_valid", "UNKNOWN"),
        artifact_hashes_valid=inspector_report["checks"].get("artifact_hashes_valid", "UNKNOWN"),
        schema_versions_compatible=inspector_report["checks"].get("schema_versions_compatible", "UNKNOWN"),
        tenant_org_scope_valid="UNKNOWN",
        user_permission_valid="UNKNOWN",
        redaction_policy_satisfied="UNKNOWN",
    )

    result = decide(ci, deny_if_missing_inputs=deny_if_missing_inputs, must_have=must_have)

    return {
        "stage": "commissioner",
        "decision": result.decision,
        "denial_reasons": result.denial_reasons,
        "policy_references": [],
        "timestamp_utc": _utc_now_iso(),
    }


def build_context(contract: Dict[str, Any]) -> ReplayContext:
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

    base_evidence_root = str(Path("apps/core-api/replay/evidence").resolve())

    if not evidence_dir:
        evidence_dir = _default_run_dir(base_evidence_root, cfg.target_execution_id)
    if not stage_reports_dir:
        stage_reports_dir = str(Path(evidence_dir) / "stage_reports")

    paths = ReplayPaths(
        execution_ledger_path=r["inputs"].get("execution_ledger_path", ""),
        decision_ledger_path=r["inputs"].get("decision_ledger_path", ""),
        artifacts_manifest_path=r["inputs"].get("artifacts_manifest_path", ""),
        evidence_dir=evidence_dir,
        stage_reports_dir=stage_reports_dir,
        diff_report_path=outputs.get("diff_report_path", str(Path(evidence_dir) / "diff_report.json")),
        replay_result_path=outputs.get("replay_result_path", str(Path(evidence_dir) / "replay_result.json")),
    )

    return ReplayContext(
        config=cfg,
        paths=paths,
        side_effects=r.get("side_effects", {}),
        determinism=r.get("determinism", {}),
        pipeline=r.get("pipeline", {}),
        commissioner_requirements=r.get("commissioner_requirements", {}),
    )


def run(contract_path: str) -> int:
    contract = read_json(contract_path)
    ctx = build_context(contract)

    _ensure_dir(ctx.paths.evidence_dir)
    _ensure_dir(ctx.paths.stage_reports_dir)

    collector = _collector_stage(ctx)
    write_json(str(Path(ctx.paths.stage_reports_dir) / "01_collector_report.json"), collector)

    inspector = _inspector_stage(ctx, collector)
    write_json(str(Path(ctx.paths.stage_reports_dir) / "02_inspector_report.json"), inspector)

    commissioner = _commissioner_stage(ctx, inspector)
    write_json(str(Path(ctx.paths.stage_reports_dir) / "03_commissioner_report.json"), commissioner)

    if commissioner["decision"] != "ALLOW":
        write_json(
            str(Path(ctx.paths.replay_result_path)),
            {
                "status": "DENIED",
                "reason": "commissioner_gate",
                "timestamp_utc": _utc_now_iso(),
                "evidence_dir": ctx.paths.evidence_dir,
            },
        )
        return 2

    write_json(
        str(Path(ctx.paths.replay_result_path)),
        {
            "status": "ALLOWED_STAGE_1_3",
            "timestamp_utc": _utc_now_iso(),
            "evidence_dir": ctx.paths.evidence_dir,
        },
    )
    return 0


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--contract", default="apps/core-api/replay/replay_contract.json")
    args = ap.parse_args()
    return run(args.contract)


if __name__ == "__main__":
    raise SystemExit(main())
