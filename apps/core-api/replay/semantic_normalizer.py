# apps/core-api/replay/semantic_normalizer.py
from __future__ import annotations

import copy
import hashlib
import json
from dataclasses import dataclass
from typing import Any, Dict, List, Optional, Tuple

JsonDict = Dict[str, Any]


DEFAULT_VOLATILE_KEYS = {
    "created_at", "updated_at", "timestamp", "ts", "time",
    "run_id", "execution_id", "trace_id", "span_id",
    "request_id", "correlation_id",
    "nonce", "seed",
}

DEFAULT_VOLATILE_PATH_SNIPPETS = (
    ".timestamps.",
    ".metrics.",
    ".telemetry.",
    ".debug.",
)

@dataclass(frozen=True)
class CanonicalizeOptions:
    drop_volatile_keys: bool = True
    volatile_keys: Tuple[str, ...] = tuple(sorted(DEFAULT_VOLATILE_KEYS))
    drop_volatile_path_snippets: Tuple[str, ...] = DEFAULT_VOLATILE_PATH_SNIPPETS
    sort_lists: bool = True
    coerce_numbers: bool = False  # keep deterministic but off by default
    hash_blocks: bool = True


def _stable_json(obj: Any) -> str:
    return json.dumps(obj, ensure_ascii=False, sort_keys=True, separators=(",", ":"))


def _sha256(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def _is_volatile_path(path: str, snippets: Tuple[str, ...]) -> bool:
    return any(snip in path for snip in snippets)


def _clean(obj: Any, *, path: str, opt: CanonicalizeOptions) -> Any:
    """
    Deterministic canonicalizer:
    - removes volatile keys
    - removes volatile paths
    - sorts dict keys via stable_json (later)
    - sorts lists (optionally) in a stable way
    """
    if _is_volatile_path(path, opt.drop_volatile_path_snippets):
        return None  # removed

    if isinstance(obj, dict):
        out: JsonDict = {}
        for k in sorted(obj.keys()):
            if opt.drop_volatile_keys and k in opt.volatile_keys:
                continue
            v = _clean(obj[k], path=f"{path}.{k}", opt=opt)
            if v is None:
                continue
            out[k] = v
        return out

    if isinstance(obj, list):
        cleaned = []
        for i, item in enumerate(obj):
            v = _clean(item, path=f"{path}[{i}]", opt=opt)
            if v is None:
                continue
            cleaned.append(v)

        if opt.sort_lists:
            # Stable sort by stable JSON representation
            cleaned.sort(key=lambda x: _stable_json(x))
        return cleaned

    if opt.coerce_numbers and isinstance(obj, (int, float)):
        # Optional: represent numbers consistently
        return float(obj) if isinstance(obj, float) else int(obj)

    return obj


def canonicalize_execution(raw: JsonDict, opt: Optional[CanonicalizeOptions] = None) -> JsonDict:
    """
    Input: an execution object (timeline / replay output / inspector report bundle)
    Output: Canonical Semantic Model (CSM) as dict.

    NOTE: This is a *base* canonicalizer. You will map your real execution schema
    into these fields in the next step (E3-E-A2).
    """
    opt = opt or CanonicalizeOptions()
    src = copy.deepcopy(raw)

    base = _clean(src, path="$", opt=opt)
    if base is None:
        base = {}

    # Minimal Canonical Semantic Model shape (extend safely later)
    csm: JsonDict = {
        "meta": {
            "schema": "rgpt.csm.v1",
        },
        "execution": base,
    }

    if opt.hash_blocks:
        csm["meta"]["execution_fingerprint_sha256"] = _sha256(_stable_json(csm["execution"]))

    return csm
