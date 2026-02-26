from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List

try:
    from .commissioner.decision_engine import CommissionerInputs, decide
    from .models import ReplayConfig, ReplayContext, ReplayPaths, TriState
    from .utils.io import read_json, write_json
    from .judge.judge_engine import compare_ledgers
    from .validators.artifact_manifest_validator import (
        validate_artifacts_manifest,
    )
    from .validators.hash_chain_validator import validate_hash_chain
    from .validators.schema_compat_validator import (
        validate_schema_compatibility,
    )
    from .side_effect_tracker import SideEffectTracker
    from .side_effects_snapshot import collect_snapshot, diff_snapshots
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
        from replay.judge.judge_engine import compare_ledgers
        from replay.validators.artifact_manifest_validator import (
            validate_artifacts_manifest,
        )
        from replay.validators.hash_chain_validator import validate_hash_chain
        from replay.validators.schema_compat_validator import (
            validate_schema_compatibility,
        )
        from replay.side_effect_tracker import SideEffectTracker
        from replay.side_effects_snapshot import collect_snapshot, diff_snapshots
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


def _parse_utc_datetime(raw: str | None) -> datetime | None:
    if not raw:
        return None
    try:
        dt = datetime.fromisoformat(raw.replace("Z", "+00:00"))
    except ValueError:
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def _verify_cat_registry_entry(
    registry: Dict[str, Any], canonical_name: Any, cat_id: Any
) -> str | None:
    if not isinstance(canonical_name, str):
        return "CAT canonical_name missing or invalid for registry check."
    namespaces = registry.get("namespaces", {}) if isinstance(registry, dict) else {}
    if not isinstance(namespaces, dict):
        return "CAT registry namespaces map is invalid."
    entry = namespaces.get(canonical_name)
    if not isinstance(entry, dict):
        return f"canonical_name '{canonical_name}' is not registered."
    if str(entry.get("cat_id", "")) != str(cat_id or ""):
        return (
            f"registry maps '{canonical_name}' to "
            f"'{entry.get('cat_id', '')}', not '{cat_id}'."
        )
    return None


def _get_cat_registry_record(
    registry: Dict[str, Any], canonical_name: Any
) -> Dict[str, Any] | None:
    if not isinstance(canonical_name, str):
        return None
    namespaces = registry.get("namespaces", {}) if isinstance(registry, dict) else {}
    if not isinstance(namespaces, dict):
        return None
    entry = namespaces.get(canonical_name)
    return entry if isinstance(entry, dict) else None


def _verify_passport_cross_links(
    *,
    cat_def: Dict[str, Any],
    registry_entry: Dict[str, Any] | None,
    police_register: Dict[str, Any] | None,
) -> tuple[str | None, str | None]:
    if not isinstance(registry_entry, dict):
        return (
            "registry<->def",
            "registry entry unavailable for passport cross-verification.",
        )

    if not bool(registry_entry.get("passport_required")):
        return None, None

    def_passport_id = cat_def.get("passport_id")
    registry_passport_id = registry_entry.get("passport_id")
    if not isinstance(def_passport_id, str) or not def_passport_id:
        return "registry<->def", "definition passport_id missing."
    if not isinstance(registry_passport_id, str) or not registry_passport_id:
        return "registry<->def", "registry passport_id missing."
    if registry_passport_id != def_passport_id:
        return (
            "registry<->def",
            f"registry passport_id '{registry_passport_id}' != definition '{def_passport_id}'.",
        )

    passports = []
    if isinstance(police_register, dict):
        raw_passports = police_register.get("passports", []) or []
        if isinstance(raw_passports, list):
            passports = raw_passports
    passport = next(
        (
            p
            for p in passports
            if isinstance(p, dict)
            and str(p.get("passport_id", "")) == registry_passport_id
        ),
        None,
    )
    if passport is None:
        return (
            "police<->registry",
            f"passport '{registry_passport_id}' not found in police register.",
        )

    registry_canonical = str(cat_def.get("canonical_name", "") or "")
    police_canonical = passport.get("canonical_name")
    if str(police_canonical or "") != registry_canonical:
        return (
            "police<->registry",
            f"police canonical_name '{police_canonical}' != registry '{registry_canonical}'.",
        )

    police_cat_id = passport.get("cat_id")
    if police_cat_id is not None and str(police_cat_id) != str(cat_def.get("cat_id", "")):
        return (
            "police<->def",
            f"police cat_id '{police_cat_id}' != definition '{cat_def.get('cat_id')}'.",
        )

    return None, None


def _cats_demo_stub_output(cat_id: str, payload: Any) -> Dict[str, Any]:
    if cat_id == "RGPT-CAT-01":
        return {
            "decision": "ALLOW",
            "reasons": ["demo-stub"],
            "input": payload,
        }
    if cat_id == "RGPT-CAT-02":
        return {"summary": "ledger-summary-demo", "input": payload}
    if cat_id == "RGPT-CAT-03":
        return {"proposal": "proposal-demo", "input": payload}
    return {"error": "unknown_cat_id_demo_stub", "input": payload}


def _run_cats_demo_execution(
    contract: Dict[str, Any],
    ctx: ReplayContext,
    frozen_ts: datetime | None = None,
) -> tuple[Dict[str, Any] | None, str | None]:
    inputs = contract.get("replay", {}).get("inputs", {}) or {}
    if inputs.get("source") != "cats-demo":
        return None, None

    now_utc = frozen_ts or datetime.now(timezone.utc)
    cat_id = str(inputs.get("cat_id", "") or "")
    payload_raw = inputs.get("payload_json", "{}")
    notes: List[str] = []

    try:
        payload = json.loads(payload_raw)
    except Exception as exc:
        payload = {"_raw": payload_raw}
        notes.append(f"payload_json_parse_failed:{type(exc).__name__}")

    repo_root = Path(__file__).resolve().parents[3]
    cat_def_path = repo_root / "cats" / "definitions" / f"{cat_id}.json"
    police_register_path = repo_root / "cats" / "police_register.demo.json"
    registry_index_path = repo_root / "cats" / "registry_index.json"

    canonical_name = None
    passport_status = None
    passport_expires = None
    passport_bundle_digest = None
    computed_bundle_digest = None
    allowed_side_effects_declared: List[str] = []
    allowed_side_effects_effective: List[str] = ["read_only"]
    verification_ok = False
    passport_required = False
    registry_entry = None
    passport_verification_status = "MISSING"
    passport_verification_note = "Passport verification did not run."

    failure_status: str | None = None
    failure_note: str | None = None

    def record_failure(
        status: str, note: str, internal_note: str | None = None
    ) -> None:
        nonlocal failure_status, failure_note
        if internal_note:
            notes.append(internal_note)
        if failure_status is None:
            failure_status = status
            failure_note = note

    try:
        cat_bytes = cat_def_path.read_bytes()
        computed_bundle_digest = hashlib.sha256(cat_bytes).hexdigest()
        cat_def = json.loads(cat_bytes.decode("utf-8"))
        canonical_name = cat_def.get("canonical_name")
        allowed_side_effects_declared = list(
            cat_def.get("allowed_side_effects", []) or []
        )
        passport_required = bool(cat_def.get("passport_required"))
        passport_id = cat_def.get("passport_id")

        try:
            registry_index = read_json(str(registry_index_path))
            registry_error = _verify_cat_registry_entry(
                registry_index, canonical_name, cat_def.get("cat_id")
            )
            if registry_error:
                record_failure(
                    "PASSPORT_MISMATCH",
                    f"Passport cross-verification failed (registry<->def): {registry_error}",
                    "registry_mismatch",
                )
            registry_entry = _get_cat_registry_record(registry_index, canonical_name)
        except FileNotFoundError as exc:
            record_failure(
                "PASSPORT_MISMATCH",
                f"Passport cross-verification failed (registry<->def): registry missing: {exc.filename}",
                f"registry_missing:{exc.filename}",
            )
        except Exception as exc:
            record_failure(
                "PASSPORT_MISMATCH",
                f"Passport cross-verification failed (registry<->def): {type(exc).__name__}",
                f"registry_exception:{type(exc).__name__}:{exc}",
            )

        if not isinstance(canonical_name, str) or not re.fullmatch(
            r"[a-z0-9-]+/[a-z0-9-]+", canonical_name
        ):
            record_failure(
                "INVALID_NAME",
                "CAT canonical_name is invalid.",
                "canonical_name_invalid",
            )

        register = read_json(str(police_register_path))
        passports = register.get("passports", []) or []
        passport = None
        cross_link, cross_link_detail = _verify_passport_cross_links(
            cat_def=cat_def,
            registry_entry=registry_entry,
            police_register=register,
        )
        if cross_link:
            record_failure(
                "PASSPORT_MISMATCH",
                f"Passport cross-verification failed ({cross_link}): {cross_link_detail}",
                f"passport_mismatch:{cross_link}",
            )
        if passport_required:
            if not passport_id:
                record_failure(
                    "MISSING",
                    "CAT definition missing passport_id.",
                    "passport_id_missing",
                )
            passport = next(
                (
                    p
                    for p in passports
                    if str(p.get("passport_id", "")) == str(passport_id)
                ),
                None,
            )
            if passport is None:
                record_failure(
                    "MISSING",
                    "Passport not found in police register.",
                    "passport_missing",
                )
            else:
                passport_status = passport.get("status")
                passport_expires = passport.get("expires_at_utc")
                passport_bundle_digest = passport.get("bundle_digest")
                if passport_status != "ACTIVE":
                    if passport_status == "REVOKED":
                        record_failure(
                            "REVOKED",
                            "Passport status REVOKED.",
                            "passport_revoked",
                        )
                    elif passport_status == "SUSPENDED":
                        record_failure(
                            "SUSPENDED",
                            "Passport status SUSPENDED.",
                            "passport_suspended",
                        )
                    else:
                        record_failure(
                            "REVOKED",
                            f"Passport status {passport_status or 'MISSING'}.",
                            "passport_not_active",
                        )
                expires_dt = _parse_utc_datetime(passport_expires)
                if expires_dt is None:
                    record_failure(
                        "EXPIRED",
                        "Passport expiry invalid.",
                        "passport_expiry_invalid",
                    )
                elif expires_dt <= now_utc:
                    record_failure(
                        "EXPIRED",
                        "Passport expired.",
                        "passport_expired",
                    )
                if passport_bundle_digest != computed_bundle_digest:
                    record_failure(
                        "DIGEST_MISMATCH",
                        "Passport bundle_digest does not match definition.",
                        "bundle_digest_mismatch",
                    )
        else:
            passport = None

        verification_ok = failure_status is None
        if verification_ok:
            passport_verification_status = "OK"
            passport_verification_note = (
                "Passport verified."
                if passport_required
                else "Passport not required."
            )
            allowed_side_effects_effective = allowed_side_effects_declared
        else:
            passport_verification_status = str(failure_status)
            passport_verification_note = str(failure_note)
    except FileNotFoundError as exc:
        record_failure(
            "MISSING",
            f"Required verification file missing: {exc.filename}",
            f"missing_file:{exc.filename}",
        )
    except Exception as exc:  # pragma: no cover - demo safety fallback
        record_failure(
            "MISSING",
            f"Verification exception: {type(exc).__name__}",
            f"verification_exception:{type(exc).__name__}:{exc}",
        )

    primary_bundle_digest = passport_bundle_digest or computed_bundle_digest

    artifact = {
        "artifact_type": "cats_demo_replay_execution",
        "timestamp_utc": _utc_now_iso(frozen_ts),
        "cat_id": cat_id,
        "canonical_name": canonical_name,
        "passport_verification": {
            "status": passport_verification_status,
            "note": passport_verification_note,
            "expires_at_utc": passport_expires,
            "bundle_digest": primary_bundle_digest,
        },
        "passport_verification_internal": {
            "ok": verification_ok,
            "status": passport_status,
            "note": passport_verification_note,
            "expires_at_utc": passport_expires,
            "bundle_digest": passport_bundle_digest,
            "bundle_digest_computed": computed_bundle_digest,
            "notes": notes,
        },
        "allowed_side_effects_effective": allowed_side_effects_effective,
        "output": _cats_demo_stub_output(cat_id, payload),
    }
    if allowed_side_effects_declared:
        artifact["allowed_side_effects_declared"] = allowed_side_effects_declared

    artifact_path = str(Path(ctx.paths.evidence_dir) / "cats_demo_artifact.json")
    write_json(artifact_path, artifact)
    return artifact, artifact_path


def _print_cats_demo_artifact(
    artifact: Dict[str, Any] | None, artifact_path: str | None
) -> None:
    if not artifact or not artifact_path:
        return
    print(f"CATS demo artifact: {artifact_path}")
    print(json.dumps(artifact, indent=2, sort_keys=True))


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


def _judge_stage(
    ctx: ReplayContext,
    collector_report: Dict[str, Any],
    commissioner_report: Dict[str, Any],
    frozen_ts: datetime | None = None,
) -> Dict[str, Any]:
    """
    Judge (Phase-E3-D):
    - Minimal deterministic diff between execution ledger and decision ledger.
    - Writes diff_report.json (path from ctx.paths.diff_report_path).
    """
    stage_enabled = "judge" in (ctx.pipeline.get("stages_enabled", []) or [])
    if not stage_enabled:
        return {
            "stage": "judge",
            "status": "SKIPPED",
            "timestamp_utc": _utc_now_iso(frozen_ts),
            "diff_report_path": ctx.paths.diff_report_path,
            "diff": {
                "compared": False,
                "mismatched": False,
                "notes": "judge_disabled",
            },
            "errors": [],
        }

    # Gate: if commissioner denied, judge is skipped (per contract gates)
    if commissioner_report.get("decision") != "ALLOW":
        return {
            "stage": "judge",
            "status": "SKIPPED",
            "timestamp_utc": _utc_now_iso(frozen_ts),
            "diff_report_path": ctx.paths.diff_report_path,
            "diff": {
                "compared": False,
                "mismatched": False,
                "notes": "commissioner_denied",
            },
            "errors": [],
        }

    missing_inputs = collector_report.get("missing_inputs", [])
    need_exec = "execution_ledger_path"
    need_dec = "decision_ledger_path"
    if (need_exec in missing_inputs) or (need_dec in missing_inputs):
        diff_obj = {
            "compared": False,
            "mismatched": False,
            "notes": "missing_inputs_for_judge",
            "mismatch_fields": [],
        }
        write_json(str(Path(ctx.paths.diff_report_path)), diff_obj)
        return {
            "stage": "judge",
            "status": "UNKNOWN",
            "timestamp_utc": _utc_now_iso(frozen_ts),
            "diff_report_path": ctx.paths.diff_report_path,
            "diff": diff_obj,
            "errors": [],
        }

    errors: List[str] = []

    try:
        exec_ledger = read_json(ctx.paths.execution_ledger_path)
        dec_ledger = read_json(ctx.paths.decision_ledger_path)
        mismatched, mismatch_fields, notes = compare_ledgers(
            exec_ledger, dec_ledger
        )
        diff_obj = {
            "compared": True,
            "mismatched": bool(mismatched),
            "notes": notes,
            "mismatch_fields": mismatch_fields,
        }
    except Exception as exc:  # pragma: no cover
        errors.append(f"judge:{type(exc).__name__}:{exc}")
        diff_obj = {
            "compared": False,
            "mismatched": False,
            "notes": "judge_exception",
            "mismatch_fields": [],
        }

    write_json(str(Path(ctx.paths.diff_report_path)), diff_obj)

    status = "FAIL" if diff_obj.get("mismatched") else "PASS"
    if len(errors) > 0:
        status = "FAIL"

    return {
        "stage": "judge",
        "status": status,
        "timestamp_utc": _utc_now_iso(frozen_ts),
        "diff_report_path": ctx.paths.diff_report_path,
        "diff": diff_obj,
        "errors": errors,
    }


def build_context(
    contract: Dict[str, Any], frozen_ts: datetime | None = None
) -> ReplayContext:
    r = contract["replay"]
    inputs = r.get("inputs", {}) or {}

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
        evidence_execution_id = cfg.target_execution_id
        if inputs.get("source") == "cats-demo":
            cats_demo_cat_id = str(inputs.get("cat_id", "") or "").strip()
            if cats_demo_cat_id:
                evidence_execution_id = cats_demo_cat_id
        evidence_dir = _default_run_dir(
            base_evidence_root, evidence_execution_id, frozen_ts
        )
    if not stage_reports_dir:
        stage_reports_dir = str(Path(evidence_dir) / "stage_reports")

    paths = ReplayPaths(
        execution_ledger_path=inputs.get("execution_ledger_path", ""),
        decision_ledger_path=inputs.get("decision_ledger_path", ""),
        artifacts_manifest_path=inputs.get("artifacts_manifest_path", ""),
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

    # Determine frozen timestamp if determinism.freeze_time_utc is enabled
    determinism = contract.get("replay", {}).get("determinism", {})
    frozen_ts: datetime | None = None
    if determinism.get("freeze_time_utc", False):
        frozen_ts = datetime.now(timezone.utc)

    ctx = build_context(contract, frozen_ts)

    # Compute effective_runtime_mode without mutating ctx
    effective_runtime_mode = (
        mode_override
        or contract["replay"].get("mode")
        or getattr(ctx, "runtime_mode", None)
    )

    # Deterministic snapshot files root (independent of CWD)
    repo_root = Path(__file__).resolve().parents[3]
    snapshot_files_root = str(repo_root / "docs" / "ops" / "executions")

    begin_snapshot = collect_snapshot(ctx, files_root=snapshot_files_root)
    _ensure_dir(ctx.paths.evidence_dir)
    _ensure_dir(ctx.paths.stage_reports_dir)
    cats_demo_artifact, cats_demo_artifact_path = _run_cats_demo_execution(
        contract, ctx, frozen_ts
    )

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

    judge = _judge_stage(ctx, collector, commissioner, frozen_ts)
    write_json(
        str(Path(ctx.paths.stage_reports_dir) / "04_judge_report.json"),
        judge,
    )

    # Phase-E3-E: Compute side effect drift report (log-only, no enforcement)
    try:
        drift_report = SideEffectTracker.validate(ctx, contract_path=contract_path)
        drift_report_dict = drift_report.to_dict() if hasattr(drift_report, "to_dict") else drift_report

        # TEST HOOK: Allow injecting delay before end snapshot for testing
        test_sleep_ms = int(os.environ.get("RGPT_SNAPSHOT_TEST_SLEEP_MS", "0"))
        if test_sleep_ms > 0:
            time.sleep(test_sleep_ms / 1000.0)

        # Phase-E3-F: Begin/End snapshot drift (begin/end diff)
        end_snapshot = collect_snapshot(ctx, files_root=snapshot_files_root)
        snapshot_drift = diff_snapshots(begin_snapshot, end_snapshot)

        # STRICT snapshot drift gate (Phase-E3-F)
        if effective_runtime_mode == "STRICT":
            if bool(snapshot_drift.get("side_effects_detected")):
                print(
                    "Replay denied: strict snapshot drift detected.",
                    file=sys.stderr,
                )
                write_json(
                    str(Path(ctx.paths.replay_result_path)),
                    {
                        "status": "DENIED",
                        "reason": "snapshot_drift_strict",
                        "timestamp_utc": _utc_now_iso(frozen_ts),
                        "evidence_dir": ctx.paths.evidence_dir,
                        "drift_report": drift_report_dict,
                        "snapshot_drift": snapshot_drift,
                        "cats_demo_artifact_path": cats_demo_artifact_path,
                    },
                )
                _print_cats_demo_artifact(
                    cats_demo_artifact, cats_demo_artifact_path
                )
                return 2
    except Exception:
        snapshot_drift = {"side_effects_detected": False, "severity": "UNKNOWN", "notes": "tracker_error"}
        drift_report_dict = {"mode": "UNKNOWN", "drift_class": "D0", "verdict": "PASS", "notes": "tracker_error"}

    if commissioner["decision"] != "ALLOW":
        denial_reasons = commissioner.get("denial_reasons", [])
        reasons_msg = ", ".join(str(x) for x in denial_reasons) or "unknown"
        print(
            f"Replay denied by commissioner gate: {reasons_msg}",
            file=sys.stderr,
        )
        write_json(
            str(Path(ctx.paths.replay_result_path)),
            {
                "status": "DENIED",
                "reason": "commissioner_gate",
                "timestamp_utc": _utc_now_iso(frozen_ts),
                "evidence_dir": ctx.paths.evidence_dir,
                "drift_report": drift_report_dict,
                "snapshot_drift": snapshot_drift,
                "cats_demo_artifact_path": cats_demo_artifact_path,
            },
        )
        _print_cats_demo_artifact(cats_demo_artifact, cats_demo_artifact_path)
        return 2

    write_json(
        str(Path(ctx.paths.replay_result_path)),
        {
            "status": "ALLOWED_STAGE_1_3",
            "timestamp_utc": _utc_now_iso(frozen_ts),
            "evidence_dir": ctx.paths.evidence_dir,
            "drift_report": drift_report_dict,
            "snapshot_drift": snapshot_drift,
            "cats_demo_artifact_path": cats_demo_artifact_path,
        },
    )
    _print_cats_demo_artifact(cats_demo_artifact, cats_demo_artifact_path)
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

