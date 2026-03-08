from __future__ import annotations

import hashlib
import json
import os
import sqlite3
import time
import uuid
from datetime import datetime, timezone
from pathlib import Path
from threading import Lock
from typing import Any, Dict, List, Optional, Tuple

_SCHEMA_LOCK = Lock()
_INITIALIZED_DB: Optional[Path] = None
_INDEX_SCHEMA_VERSION = "1"
_INDEX_TELEMETRY: Dict[str, Any] = {
    "cats_index_version": _INDEX_SCHEMA_VERSION,
    "index_refresh_ms": 0.0,
}


def _repo_root() -> Path:
    current = Path(__file__).resolve().parent
    while True:
        if (current / ".git").is_dir():
            return current
        parent = current.parent
        if parent == current:
            return Path(__file__).resolve().parents[3]
        current = parent


def _db_path() -> Path:
    configured = os.getenv("RGPT_CATS_DB_PATH", "").strip()
    if configured:
        return Path(configured)
    return _repo_root() / "apps" / "core-api" / ".data" / "cats_registry.sqlite3"


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _new_id() -> str:
    return str(uuid.uuid4())


def _ensure_schema(conn: sqlite3.Connection) -> None:
    conn.execute(
        """
        create table if not exists cats (
          cat_id text primary key,
          owner_org_id text not null,
          owner_user_id text,
          name text not null,
          description text,
          status text not null,
          created_at text not null,
          updated_at text not null
        );
        """
    )
    conn.execute("create unique index if not exists uq_cats_org_name on cats (owner_org_id, name);")
    conn.execute(
        """
        create table if not exists cats_versions (
          cat_version_id text primary key,
          cat_id text not null,
          version text not null,
          manifest_json text not null,
          rulebook_json text not null,
          command_bundle_ref text,
          status text not null,
          created_at text not null,
          foreign key (cat_id) references cats (cat_id) on delete cascade
        );
        """
    )
    conn.execute("create unique index if not exists uq_cat_version on cats_versions (cat_id, version);")
    conn.execute("create index if not exists ix_cat_versions_recent on cats_versions (cat_id, created_at desc);")
    conn.execute(
        """
        create table if not exists cats_permissions (
          permission_id text primary key,
          cat_version_id text not null,
          permission_key text not null,
          scope text not null,
          created_at text not null,
          foreign key (cat_version_id) references cats_versions (cat_version_id) on delete cascade
        );
        """
    )
    conn.execute(
        """
        create table if not exists cats_fingerprints (
          fingerprint_id text primary key,
          cat_version_id text not null,
          algo text not null,
          digest text not null,
          signed_by text,
          created_at text not null,
          foreign key (cat_version_id) references cats_versions (cat_version_id) on delete cascade
        );
        """
    )
    conn.execute("create unique index if not exists uq_cats_fingerprint_catver on cats_fingerprints (cat_version_id);")
    conn.execute(
        """
        create table if not exists cats_metrics (
          metric_id text primary key,
          cat_version_id text not null,
          success_count integer not null default 0,
          fail_count integer not null default 0,
          avg_exec_ms real,
          last_run_at text,
          created_at text not null,
          updated_at text not null,
          foreign key (cat_version_id) references cats_versions (cat_version_id) on delete cascade
        );
        """
    )
    conn.execute(
        """
        create table if not exists cats_capability_index (
          cat_id text not null,
          version text not null,
          tags_json text not null,
          inputs_sig text,
          outputs_sig text,
          avg_latency real,
          success_rate real,
          trust_tier text not null,
          updated_at text not null,
          manifest_ref text,
          rulebook_ref text,
          primary key (cat_id, version),
          foreign key (cat_id, version) references cats_versions (cat_id, version) on delete cascade
        );
        """
    )
    conn.execute("create index if not exists ix_cats_cap_idx_trust_tier on cats_capability_index (trust_tier);")
    conn.execute(
        """
        create table if not exists cats_capability_index_tags (
          cat_id text not null,
          version text not null,
          tag text not null,
          primary key (cat_id, version, tag),
          foreign key (cat_id, version) references cats_capability_index (cat_id, version) on delete cascade
        );
        """
    )
    conn.execute("create index if not exists ix_cats_cap_idx_tag on cats_capability_index_tags (tag);")
    conn.commit()


def _connect() -> sqlite3.Connection:
    global _INITIALIZED_DB
    path = _db_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(path)
    conn.row_factory = sqlite3.Row
    with _SCHEMA_LOCK:
        if _INITIALIZED_DB != path:
            _ensure_schema(conn)
            _INITIALIZED_DB = path
    conn.execute("pragma foreign_keys = on;")
    return conn


def _parse_json(raw: str) -> Any:
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        return {}


def _cat_row_to_dict(row: sqlite3.Row) -> Dict[str, Any]:
    return {
        "catId": row["cat_id"],
        "ownerOrgId": row["owner_org_id"],
        "ownerUserId": row["owner_user_id"],
        "name": row["name"],
        "description": row["description"],
        "status": row["status"],
        "createdAt": row["created_at"],
        "updatedAt": row["updated_at"],
    }


def _version_row_to_dict(row: sqlite3.Row) -> Dict[str, Any]:
    return {
        "catVersionId": row["cat_version_id"],
        "catId": row["cat_id"],
        "version": row["version"],
        "manifestJson": _parse_json(row["manifest_json"]),
        "rulebookJson": _parse_json(row["rulebook_json"]),
        "commandBundleRef": row["command_bundle_ref"],
        "status": row["status"],
        "createdAt": row["created_at"],
    }


def _compute_sig(payload: Any) -> Optional[str]:
    if payload is None:
        return None
    if isinstance(payload, str):
        cleaned = payload.strip()
        return cleaned or None
    try:
        raw = json.dumps(payload, separators=(",", ":"), sort_keys=True, ensure_ascii=False)
    except TypeError:
        return None
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


def _compute_success_rate(success_count: int, fail_count: int) -> Optional[float]:
    total = int(success_count) + int(fail_count)
    if total <= 0:
        return None
    return float(success_count) / float(total)


def _normalize_tags(manifest_json: Dict[str, Any], rulebook_json: Dict[str, Any]) -> List[str]:
    raw_tags: List[Any] = []
    manifest_tags = manifest_json.get("tags")
    if isinstance(manifest_tags, list):
        raw_tags.extend(manifest_tags)
    rulebook_tags = rulebook_json.get("tags")
    if isinstance(rulebook_tags, list):
        raw_tags.extend(rulebook_tags)

    cleaned = []
    seen = set()
    for tag in raw_tags:
        if not isinstance(tag, str):
            continue
        value = tag.strip().lower()
        if not value or value in seen:
            continue
        seen.add(value)
        cleaned.append(value)
    return cleaned


def _extract_trust_tier(manifest_json: Dict[str, Any], rulebook_json: Dict[str, Any]) -> str:
    value = manifest_json.get("trustTier")
    if not isinstance(value, str) or not value.strip():
        value = manifest_json.get("trust_tier")
    if not isinstance(value, str) or not value.strip():
        value = rulebook_json.get("trustTier")
    if not isinstance(value, str) or not value.strip():
        value = rulebook_json.get("trust_tier")
    if not isinstance(value, str):
        return "standard"
    return value.strip().lower()


def _index_row_to_dict(row: sqlite3.Row) -> Dict[str, Any]:
    return {
        "catId": row["cat_id"],
        "version": row["version"],
        "tags": _parse_json(row["tags_json"]),
        "inputsSig": row["inputs_sig"],
        "outputsSig": row["outputs_sig"],
        "avgLatency": row["avg_latency"],
        "successRate": row["success_rate"],
        "trustTier": row["trust_tier"],
        "updatedAt": row["updated_at"],
        "manifestRef": row["manifest_ref"],
        "rulebookRef": row["rulebook_ref"],
    }


def _upsert_capability_index(
    conn: sqlite3.Connection,
    cat_version_id: str,
    cat_id: str,
    version: str,
    manifest_json: Dict[str, Any],
    rulebook_json: Dict[str, Any],
) -> Dict[str, Any]:
    started = time.perf_counter()
    metric_row = conn.execute(
        """
        select success_count, fail_count, avg_exec_ms
        from cats_metrics
        where cat_version_id = ?
        """,
        (cat_version_id,),
    ).fetchone()
    success_count = 0 if metric_row is None else int(metric_row["success_count"])
    fail_count = 0 if metric_row is None else int(metric_row["fail_count"])
    avg_latency = None if metric_row is None else metric_row["avg_exec_ms"]
    success_rate = _compute_success_rate(success_count, fail_count)
    tags = _normalize_tags(manifest_json, rulebook_json)
    tags_json = json.dumps(tags, separators=(",", ":"), ensure_ascii=False)
    inputs_sig = _compute_sig(manifest_json.get("inputsSig") or manifest_json.get("inputs_schema"))
    outputs_sig = _compute_sig(manifest_json.get("outputsSig") or manifest_json.get("outputs_schema"))
    trust_tier = _extract_trust_tier(manifest_json, rulebook_json)
    now = _now_iso()
    manifest_ref = f"cat-version://{cat_version_id}/manifest"
    rulebook_ref = f"cat-version://{cat_version_id}/rulebook"

    conn.execute(
        """
        insert into cats_capability_index
          (cat_id, version, tags_json, inputs_sig, outputs_sig, avg_latency, success_rate, trust_tier, updated_at, manifest_ref, rulebook_ref)
        values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        on conflict(cat_id, version) do update set
          tags_json = excluded.tags_json,
          inputs_sig = excluded.inputs_sig,
          outputs_sig = excluded.outputs_sig,
          avg_latency = excluded.avg_latency,
          success_rate = excluded.success_rate,
          trust_tier = excluded.trust_tier,
          updated_at = excluded.updated_at,
          manifest_ref = excluded.manifest_ref,
          rulebook_ref = excluded.rulebook_ref
        """,
        (cat_id, version, tags_json, inputs_sig, outputs_sig, avg_latency, success_rate, trust_tier, now, manifest_ref, rulebook_ref),
    )
    conn.execute(
        """
        delete from cats_capability_index_tags
        where cat_id = ? and version = ?
        """,
        (cat_id, version),
    )
    if tags:
        conn.executemany(
            """
            insert into cats_capability_index_tags (cat_id, version, tag)
            values (?, ?, ?)
            """,
            [(cat_id, version, tag) for tag in tags],
        )
    refreshed = conn.execute(
        """
        select *
        from cats_capability_index
        where cat_id = ? and version = ?
        """,
        (cat_id, version),
    ).fetchone()
    elapsed_ms = (time.perf_counter() - started) * 1000.0
    _INDEX_TELEMETRY["index_refresh_ms"] = round(elapsed_ms, 3)
    _INDEX_TELEMETRY["cats_index_version"] = _INDEX_SCHEMA_VERSION
    if refreshed is None:
        raise RuntimeError("capability index upsert failed")
    return _index_row_to_dict(refreshed)


def list_cats(owner_org_id: str, page: int, page_size: int) -> Dict[str, Any]:
    offset = (page - 1) * page_size
    with _connect() as conn:
        total = conn.execute("select count(1) as c from cats where owner_org_id = ?", (owner_org_id,)).fetchone()["c"]
        rows = conn.execute(
            """
            select * from cats
            where owner_org_id = ?
            order by created_at desc
            limit ? offset ?
            """,
            (owner_org_id, page_size, offset),
        ).fetchall()
    return {
        "page": page,
        "pageSize": page_size,
        "total": int(total),
        "items": [_cat_row_to_dict(row) for row in rows],
    }


def create_cat(owner_org_id: str, owner_user_id: str, name: str, description: Optional[str], status: str) -> Dict[str, Any]:
    now = _now_iso()
    cat_id = _new_id()
    with _connect() as conn:
        conn.execute(
            """
            insert into cats (cat_id, owner_org_id, owner_user_id, name, description, status, created_at, updated_at)
            values (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (cat_id, owner_org_id, owner_user_id, name, description, status, now, now),
        )
        row = conn.execute("select * from cats where cat_id = ?", (cat_id,)).fetchone()
    if row is None:
        raise RuntimeError("cat creation failed")
    return _cat_row_to_dict(row)


def get_cat(owner_org_id: str, cat_id: str) -> Optional[Dict[str, Any]]:
    with _connect() as conn:
        row = conn.execute("select * from cats where owner_org_id = ? and cat_id = ?", (owner_org_id, cat_id)).fetchone()
    return None if row is None else _cat_row_to_dict(row)


def update_cat(owner_org_id: str, cat_id: str, name: str, description: Optional[str]) -> Optional[Dict[str, Any]]:
    now = _now_iso()
    with _connect() as conn:
        conn.execute(
            """
            update cats
            set name = ?, description = ?, updated_at = ?
            where owner_org_id = ? and cat_id = ?
            """,
            (name, description, now, owner_org_id, cat_id),
        )
        row = conn.execute("select * from cats where owner_org_id = ? and cat_id = ?", (owner_org_id, cat_id)).fetchone()
    return None if row is None else _cat_row_to_dict(row)


def transition_cat(owner_org_id: str, cat_id: str, target_status: str) -> Optional[Dict[str, Any]]:
    now = _now_iso()
    with _connect() as conn:
        conn.execute(
            """
            update cats
            set status = ?, updated_at = ?
            where owner_org_id = ? and cat_id = ?
            """,
            (target_status, now, owner_org_id, cat_id),
        )
        row = conn.execute("select * from cats where owner_org_id = ? and cat_id = ?", (owner_org_id, cat_id)).fetchone()
    return None if row is None else _cat_row_to_dict(row)


def create_version(
    owner_org_id: str,
    cat_id: str,
    version: str,
    manifest_json: Dict[str, Any],
    rulebook_json: Dict[str, Any],
    command_bundle_ref: str,
) -> Optional[Dict[str, Any]]:
    cat = get_cat(owner_org_id, cat_id)
    if cat is None:
        return None

    now = _now_iso()
    cat_version_id = _new_id()
    manifest_raw = json.dumps(manifest_json, separators=(",", ":"), ensure_ascii=False)
    rulebook_raw = json.dumps(rulebook_json, separators=(",", ":"), ensure_ascii=False)
    digest = hashlib.sha256(f"{manifest_raw}|{rulebook_raw}|{command_bundle_ref}".encode("utf-8")).hexdigest()

    with _connect() as conn:
        conn.execute(
            """
            insert into cats_versions
              (cat_version_id, cat_id, version, manifest_json, rulebook_json, command_bundle_ref, status, created_at)
            values (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (cat_version_id, cat_id, version, manifest_raw, rulebook_raw, command_bundle_ref, "Published", now),
        )
        conn.execute(
            """
            insert into cats_fingerprints (fingerprint_id, cat_version_id, algo, digest, signed_by, created_at)
            values (?, ?, ?, ?, ?, ?)
            """,
            (_new_id(), cat_version_id, "sha256", digest, None, now),
        )
        conn.execute(
            """
            insert into cats_metrics
              (metric_id, cat_version_id, success_count, fail_count, avg_exec_ms, last_run_at, created_at, updated_at)
            values (?, ?, 0, 0, null, null, ?, ?)
            """,
            (_new_id(), cat_version_id, now, now),
        )
        _upsert_capability_index(
            conn=conn,
            cat_version_id=cat_version_id,
            cat_id=cat_id,
            version=version,
            manifest_json=manifest_json,
            rulebook_json=rulebook_json,
        )
        row = conn.execute("select * from cats_versions where cat_version_id = ?", (cat_version_id,)).fetchone()
    if row is None:
        raise RuntimeError("version creation failed")
    return _version_row_to_dict(row)


def list_versions(owner_org_id: str, cat_id: str) -> Optional[List[Dict[str, Any]]]:
    cat = get_cat(owner_org_id, cat_id)
    if cat is None:
        return None
    with _connect() as conn:
        rows = conn.execute(
            """
            select * from cats_versions
            where cat_id = ?
            order by created_at desc
            """,
            (cat_id,),
        ).fetchall()
    return [_version_row_to_dict(row) for row in rows]


def is_unique_violation(exc: Exception) -> bool:
    if not isinstance(exc, sqlite3.IntegrityError):
        return False
    message = str(exc).lower()
    return "unique constraint failed" in message


def get_status(owner_org_id: str, cat_id: str) -> Optional[str]:
    cat = get_cat(owner_org_id, cat_id)
    if cat is None:
        return None
    return str(cat["status"])


def get_connection_error_detail(exc: Exception) -> str:
    return str(exc)


def refresh_capability_index(owner_org_id: str, cat_id: str, version: str) -> Optional[Dict[str, Any]]:
    with _connect() as conn:
        row = conn.execute(
            """
            select cv.cat_version_id, cv.cat_id, cv.version, cv.manifest_json, cv.rulebook_json
            from cats_versions cv
            join cats c on c.cat_id = cv.cat_id
            where c.owner_org_id = ? and cv.cat_id = ? and cv.version = ?
            """,
            (owner_org_id, cat_id, version),
        ).fetchone()
        if row is None:
            return None
        return _upsert_capability_index(
            conn=conn,
            cat_version_id=row["cat_version_id"],
            cat_id=row["cat_id"],
            version=row["version"],
            manifest_json=_parse_json(row["manifest_json"]),
            rulebook_json=_parse_json(row["rulebook_json"]),
        )


def get_capability_index(owner_org_id: str, cat_id: str, version: str) -> Optional[Dict[str, Any]]:
    with _connect() as conn:
        row = conn.execute(
            """
            select i.*
            from cats_capability_index i
            join cats c on c.cat_id = i.cat_id
            where c.owner_org_id = ? and i.cat_id = ? and i.version = ?
            """,
            (owner_org_id, cat_id, version),
        ).fetchone()
    return None if row is None else _index_row_to_dict(row)


def search_capability_index(
    owner_org_id: str,
    tags: Optional[List[str]] = None,
    trust_tier: Optional[str] = None,
    limit: int = 20,
) -> List[Dict[str, Any]]:
    normalized_tags: List[str] = []
    for tag in tags or []:
        if not isinstance(tag, str):
            continue
        cleaned = tag.strip().lower()
        if cleaned and cleaned not in normalized_tags:
            normalized_tags.append(cleaned)
    trust = trust_tier.strip().lower() if isinstance(trust_tier, str) and trust_tier.strip() else None
    safe_limit = max(1, min(200, int(limit)))

    with _connect() as conn:
        if normalized_tags:
            placeholders = ",".join("?" for _ in normalized_tags)
            params: Tuple[Any, ...] = (owner_org_id, *normalized_tags)
            query = f"""
                select i.*
                from cats_capability_index i
                join cats c on c.cat_id = i.cat_id
                join cats_capability_index_tags t
                  on t.cat_id = i.cat_id and t.version = i.version
                where c.owner_org_id = ?
                  and t.tag in ({placeholders})
            """
            if trust:
                query += " and i.trust_tier = ?"
                params = (*params, trust)
            query += """
                group by i.cat_id, i.version
                having count(distinct t.tag) = ?
                order by coalesce(i.success_rate, 0.0) desc, coalesce(i.avg_latency, 1e18) asc, i.updated_at desc
                limit ?
            """
            params = (*params, len(normalized_tags), safe_limit)
            rows = conn.execute(query, params).fetchall()
        else:
            if trust:
                rows = conn.execute(
                    """
                    select i.*
                    from cats_capability_index i
                    join cats c on c.cat_id = i.cat_id
                    where c.owner_org_id = ? and i.trust_tier = ?
                    order by coalesce(i.success_rate, 0.0) desc, coalesce(i.avg_latency, 1e18) asc, i.updated_at desc
                    limit ?
                    """,
                    (owner_org_id, trust, safe_limit),
                ).fetchall()
            else:
                rows = conn.execute(
                    """
                    select i.*
                    from cats_capability_index i
                    join cats c on c.cat_id = i.cat_id
                    where c.owner_org_id = ?
                    order by coalesce(i.success_rate, 0.0) desc, coalesce(i.avg_latency, 1e18) asc, i.updated_at desc
                    limit ?
                    """,
                    (owner_org_id, safe_limit),
                ).fetchall()
    return [_index_row_to_dict(row) for row in rows]


def route_cat_by_capability(
    owner_org_id: str,
    tags: Optional[List[str]] = None,
    trust_tier: Optional[str] = None,
) -> Optional[Dict[str, Any]]:
    matches = search_capability_index(owner_org_id=owner_org_id, tags=tags, trust_tier=trust_tier, limit=1)
    if not matches:
        return None
    return matches[0]


def get_capability_index_telemetry() -> Dict[str, Any]:
    return {
        "cats_index_version": _INDEX_TELEMETRY["cats_index_version"],
        "index_refresh_ms": _INDEX_TELEMETRY["index_refresh_ms"],
    }
