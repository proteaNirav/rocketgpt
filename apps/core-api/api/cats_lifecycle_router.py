from __future__ import annotations

import re
import sqlite3
from typing import Any, Dict, Optional

from fastapi import APIRouter, Header, HTTPException, Query
from pydantic import BaseModel, Field

from api.cats_ledger import append_cats_event
from api.cats_store import (
    create_cat,
    create_version,
    get_cat,
    get_connection_error_detail,
    get_status,
    is_unique_violation,
    list_cats,
    list_versions,
    transition_cat,
    update_cat,
)

router = APIRouter(prefix="/api/cats", tags=["cats-lifecycle"])

VALID_STATUSES = {"Draft", "Review", "Approved", "Rejected", "Deprecated", "Archived"}
ALLOWED_EDIT_STATUSES = {"Draft", "Review"}
ALLOWED_PUBLISH_STATUSES = {"Draft", "Approved"}  # Chosen policy for v1.
TRANSITIONS = {
    "Draft": {"Review", "Archived"},
    "Review": {"Draft", "Approved", "Rejected"},
    "Approved": {"Deprecated", "Archived"},
    "Rejected": {"Draft", "Archived"},
    "Deprecated": {"Approved", "Archived"},
    "Archived": set(),
}
SEMVER_RE = re.compile(r"^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:[-+][0-9A-Za-z-.]+)?$")


class CreateCatBody(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    description: Optional[str] = Field(default=None, max_length=5000)


class UpdateCatBody(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    description: Optional[str] = Field(default=None, max_length=5000)


class PublishVersionBody(BaseModel):
    version: str = Field(min_length=1, max_length=64)
    manifestJson: Dict[str, Any] = Field(default_factory=dict)
    rulebookJson: Dict[str, Any] = Field(default_factory=dict)
    commandBundleRef: str = Field(min_length=1, max_length=500)


class TransitionBody(BaseModel):
    targetStatus: str = Field(min_length=1, max_length=64)


def _org_user(owner_org_id: Optional[str], owner_user_id: Optional[str]) -> tuple[str, str]:
    return (owner_org_id or "org_demo"), (owner_user_id or "usr_demo")


def _append_event(event_type: str, owner_org_id: str, owner_user_id: str, payload: Dict[str, Any]) -> bool:
    return append_cats_event(
        {
            "event_type": event_type,
            "org_id": owner_org_id,
            "user_id": owner_user_id,
            "payload": payload,
        }
    )


@router.get("")
def get_cats(
    page: int = Query(default=1, ge=1),
    pageSize: int = Query(default=20, ge=1, le=200),
    x_org_id: Optional[str] = Header(default=None),
    x_user_id: Optional[str] = Header(default=None),
) -> Dict[str, Any]:
    owner_org_id, _ = _org_user(x_org_id, x_user_id)
    try:
        return list_cats(owner_org_id, page, pageSize)
    except sqlite3.Error as exc:
        raise HTTPException(status_code=500, detail=get_connection_error_detail(exc)) from exc


@router.post("", status_code=201)
def post_cats(
    body: CreateCatBody,
    x_org_id: Optional[str] = Header(default=None),
    x_user_id: Optional[str] = Header(default=None),
) -> Dict[str, Any]:
    owner_org_id, owner_user_id = _org_user(x_org_id, x_user_id)
    try:
        created = create_cat(
            owner_org_id=owner_org_id,
            owner_user_id=owner_user_id,
            name=body.name.strip(),
            description=(body.description or "").strip() or None,
            status="Draft",
        )
    except sqlite3.IntegrityError as exc:
        if is_unique_violation(exc):
            raise HTTPException(status_code=409, detail="CAT name must be unique per tenant.") from exc
        raise HTTPException(status_code=400, detail=get_connection_error_detail(exc)) from exc
    except sqlite3.Error as exc:
        raise HTTPException(status_code=500, detail=get_connection_error_detail(exc)) from exc

    ledger_written = _append_event(
        "cats.created",
        owner_org_id,
        owner_user_id,
        {"catId": created["catId"], "name": created["name"], "status": created["status"]},
    )
    return {**created, "ledgerWritten": ledger_written}


@router.get("/{cat_id}")
def get_cat_by_id(
    cat_id: str,
    x_org_id: Optional[str] = Header(default=None),
    x_user_id: Optional[str] = Header(default=None),
) -> Dict[str, Any]:
    owner_org_id, _ = _org_user(x_org_id, x_user_id)
    cat = get_cat(owner_org_id, cat_id)
    if cat is None:
        raise HTTPException(status_code=404, detail="CAT not found.")
    return cat


@router.put("/{cat_id}")
def put_cat(
    cat_id: str,
    body: UpdateCatBody,
    x_org_id: Optional[str] = Header(default=None),
    x_user_id: Optional[str] = Header(default=None),
) -> Dict[str, Any]:
    owner_org_id, owner_user_id = _org_user(x_org_id, x_user_id)
    status = get_status(owner_org_id, cat_id)
    if status is None:
        raise HTTPException(status_code=404, detail="CAT not found.")
    if status not in ALLOWED_EDIT_STATUSES:
        raise HTTPException(status_code=409, detail="Metadata edits are only allowed in Draft/Review.")

    try:
        updated = update_cat(
            owner_org_id=owner_org_id,
            cat_id=cat_id,
            name=body.name.strip(),
            description=(body.description or "").strip() or None,
        )
    except sqlite3.IntegrityError as exc:
        if is_unique_violation(exc):
            raise HTTPException(status_code=409, detail="CAT name must be unique per tenant.") from exc
        raise HTTPException(status_code=400, detail=get_connection_error_detail(exc)) from exc
    except sqlite3.Error as exc:
        raise HTTPException(status_code=500, detail=get_connection_error_detail(exc)) from exc
    if updated is None:
        raise HTTPException(status_code=404, detail="CAT not found.")

    ledger_written = _append_event(
        "cats.updated",
        owner_org_id,
        owner_user_id,
        {"catId": updated["catId"], "name": updated["name"], "status": updated["status"]},
    )
    return {**updated, "ledgerWritten": ledger_written}


@router.post("/{cat_id}/versions", status_code=201)
def post_version(
    cat_id: str,
    body: PublishVersionBody,
    x_org_id: Optional[str] = Header(default=None),
    x_user_id: Optional[str] = Header(default=None),
) -> Dict[str, Any]:
    owner_org_id, owner_user_id = _org_user(x_org_id, x_user_id)
    status = get_status(owner_org_id, cat_id)
    if status is None:
        raise HTTPException(status_code=404, detail="CAT not found.")
    if status not in ALLOWED_PUBLISH_STATUSES:
        raise HTTPException(
            status_code=409,
            detail="Version publish allowed only when CAT is Draft or Approved.",
        )
    if not SEMVER_RE.match(body.version.strip()):
        raise HTTPException(status_code=422, detail="Version must be a semantic version string.")

    try:
        version = create_version(
            owner_org_id=owner_org_id,
            cat_id=cat_id,
            version=body.version.strip(),
            manifest_json=body.manifestJson,
            rulebook_json=body.rulebookJson,
            command_bundle_ref=body.commandBundleRef.strip(),
        )
    except sqlite3.IntegrityError as exc:
        if is_unique_violation(exc):
            raise HTTPException(status_code=409, detail="Version already exists for this CAT.") from exc
        raise HTTPException(status_code=400, detail=get_connection_error_detail(exc)) from exc
    except sqlite3.Error as exc:
        raise HTTPException(status_code=500, detail=get_connection_error_detail(exc)) from exc

    if version is None:
        raise HTTPException(status_code=404, detail="CAT not found.")
    ledger_written = _append_event(
        "cats.version_published",
        owner_org_id,
        owner_user_id,
        {"catId": cat_id, "catVersionId": version["catVersionId"], "version": version["version"]},
    )
    return {**version, "ledgerWritten": ledger_written}


@router.get("/{cat_id}/versions")
def get_versions(
    cat_id: str,
    x_org_id: Optional[str] = Header(default=None),
    x_user_id: Optional[str] = Header(default=None),
) -> Dict[str, Any]:
    owner_org_id, _ = _org_user(x_org_id, x_user_id)
    versions = list_versions(owner_org_id, cat_id)
    if versions is None:
        raise HTTPException(status_code=404, detail="CAT not found.")
    return {"items": versions}


@router.post("/{cat_id}/transition")
def post_transition(
    cat_id: str,
    body: TransitionBody,
    x_org_id: Optional[str] = Header(default=None),
    x_user_id: Optional[str] = Header(default=None),
) -> Dict[str, Any]:
    owner_org_id, owner_user_id = _org_user(x_org_id, x_user_id)
    current_status = get_status(owner_org_id, cat_id)
    if current_status is None:
        raise HTTPException(status_code=404, detail="CAT not found.")

    target = body.targetStatus.strip()
    if target not in VALID_STATUSES:
        raise HTTPException(status_code=422, detail=f"Invalid targetStatus. Allowed: {sorted(VALID_STATUSES)}")
    allowed_targets = TRANSITIONS.get(current_status, set())
    if target not in allowed_targets:
        raise HTTPException(
            status_code=409,
            detail=f"Transition not allowed: {current_status} -> {target}. Allowed: {sorted(allowed_targets)}",
        )

    try:
        updated = transition_cat(owner_org_id, cat_id, target)
    except sqlite3.Error as exc:
        raise HTTPException(status_code=500, detail=get_connection_error_detail(exc)) from exc
    if updated is None:
        raise HTTPException(status_code=404, detail="CAT not found.")

    ledger_written = _append_event(
        "cats.lifecycle_transitioned",
        owner_org_id,
        owner_user_id,
        {"catId": cat_id, "fromStatus": current_status, "toStatus": target},
    )
    return {**updated, "ledgerWritten": ledger_written}
