from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Dict

from fastapi import APIRouter, HTTPException, Query

router = APIRouter()


def _repo_root() -> Path:
    root = Path(__file__).resolve()
    for _ in range(3):
        root = root.parent
    return root


def _cats_root() -> Path:
    return _repo_root() / "cats"


def _read_json(path: Path) -> Any:
    try:
        payload = path.read_text(encoding="utf-8")
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=f"Missing file: {path.name}") from exc
    except OSError as exc:
        raise HTTPException(status_code=500, detail="Failed to read registry data.") from exc

    try:
        return json.loads(payload)
    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=500, detail="Invalid registry JSON.") from exc


def _validate_cat_id(cat_id: str) -> None:
    if not cat_id or ".." in cat_id or "/" in cat_id or "\\" in cat_id:
        raise HTTPException(status_code=400, detail="Invalid cat_id.")


@router.get("/cats/registry")
def get_registry_index() -> Any:
    return _read_json(_cats_root() / "registry_index.json")


@router.get("/cats/police-register")
def get_police_register() -> Any:
    return _read_json(_cats_root() / "police_register.demo.json")


@router.get("/cats/{cat_id}/definition")
def get_cat_definition(cat_id: str) -> Any:
    _validate_cat_id(cat_id)
    definition_path = _cats_root() / "definitions" / f"{cat_id}.json"
    return _read_json(definition_path)


@router.get("/cats/{cat_id}/passport")
def get_cat_passport(cat_id: str) -> Dict[str, Any]:
    _validate_cat_id(cat_id)
    registry = _read_json(_cats_root() / "police_register.demo.json")
    passports = registry.get("passports", [])
    for passport in passports:
        if passport.get("cat_id") == cat_id:
            return passport
    raise HTTPException(status_code=404, detail="Passport not found.")


@router.get("/cats/resolve")
def resolve_cat(canonical_name: str = Query(..., min_length=1)) -> Dict[str, Any]:
    registry = _read_json(_cats_root() / "registry_index.json")
    namespaces = registry.get("namespaces", {})
    entry = namespaces.get(canonical_name)
    if not entry:
        raise HTTPException(status_code=404, detail="CAT namespace not found.")
    return {
        "cat_id": entry.get("cat_id"),
        "canonical_name": canonical_name,
        "status": entry.get("status"),
    }
