from __future__ import annotations

from dataclasses import dataclass
from typing import List

from ..models import TriState


@dataclass(frozen=True)
class ArtifactManifestResult:
    artifact_hashes_valid: TriState
    errors: List[str]


def validate_artifacts_manifest(artifacts_manifest_path: str) -> ArtifactManifestResult:
    """
    Placeholder.
    Later: verify every artifact exists + hash matches manifest.
    """
    return ArtifactManifestResult(artifact_hashes_valid="UNKNOWN", errors=["not_implemented"])
