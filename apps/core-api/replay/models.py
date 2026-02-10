from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Dict, List, Literal, Optional


StageName = Literal["collector", "inspector", "commissioner", "judge", "archivist"]
StageStatus = Literal["PASS", "FAIL"]
TriState = Literal["PASS", "FAIL", "UNKNOWN"]
CommissionerDecision = Literal["ALLOW", "DENY"]


@dataclass(frozen=True)
class ReplayPaths:
    execution_ledger_path: str
    decision_ledger_path: str
    artifacts_manifest_path: str
    evidence_dir: str
    stage_reports_dir: str
    diff_report_path: str
    replay_result_path: str


@dataclass(frozen=True)
class ReplayConfig:
    target_execution_id: str
    from_event_idx: int = 0
    to_event_idx: Optional[int] = None
    mode: str = "strict_from_stage_3"


@dataclass(frozen=True)
class ReplayContext:
    config: ReplayConfig
    paths: ReplayPaths
    side_effects: Dict[str, str] = field(default_factory=dict)
    determinism: Dict[str, Any] = field(default_factory=dict)
    pipeline: Dict[str, Any] = field(default_factory=dict)
    commissioner_requirements: Dict[str, Any] = field(default_factory=dict)
