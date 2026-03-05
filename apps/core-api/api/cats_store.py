from __future__ import annotations

import hashlib
import json
import os
import sqlite3
import uuid
from datetime import datetime, timezone
from pathlib import Path
from threading import Lock
from typing import Any, Dict, List, Optional, Tuple

_SCHEMA_LOCK = Lock()
_INITIALIZED_DB: Optional[Path] = None


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
