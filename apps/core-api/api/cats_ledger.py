from __future__ import annotations

import json
import os
from datetime import datetime, timezone
from pathlib import Path
from threading import Lock
from typing import Any, Dict

_WRITE_LOCK = Lock()


def _repo_root() -> Path:
    current = Path(__file__).resolve().parent
    while True:
        if (current / ".git").is_dir():
            return current
        parent = current.parent
        if parent == current:
            return Path(__file__).resolve().parents[3]
        current = parent


def _ledger_path() -> Path:
    configured = os.getenv("RGPT_CATS_LEDGER_PATH", "").strip()
    if configured:
        return Path(configured)
    return _repo_root() / "docs" / "ops" / "ledgers" / "runtime" / "CATS_GOVERNANCE.jsonl"


def append_cats_event(event: Dict[str, Any]) -> bool:
    payload = {
        "ts": datetime.now(timezone.utc).isoformat(),
        **event,
    }
    path = _ledger_path()
    line = json.dumps(payload, separators=(",", ":"), ensure_ascii=False) + "\n"
    try:
        with _WRITE_LOCK:
            path.parent.mkdir(parents=True, exist_ok=True)
            with path.open("a", encoding="utf-8") as handle:
                handle.write(line)
        return True
    except OSError:
        return False
