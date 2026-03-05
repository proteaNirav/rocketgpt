from __future__ import annotations

import os
import shutil
import tempfile
import unittest
from pathlib import Path

from fastapi.testclient import TestClient

from main import app


class CatsLifecycleApiTests(unittest.TestCase):
    def setUp(self) -> None:
        self._tmp = tempfile.mkdtemp(prefix="cats_api_test_")
        self.db_path = Path(self._tmp) / "cats.sqlite3"
        self.ledger_path = Path(self._tmp) / "cats_governance.jsonl"
        os.environ["RGPT_CATS_DB_PATH"] = str(self.db_path)
        os.environ["RGPT_CATS_LEDGER_PATH"] = str(self.ledger_path)
        self.client = TestClient(app)
        self.headers = {"x-org-id": "org_test", "x-user-id": "usr_test"}

    def tearDown(self) -> None:
        os.environ.pop("RGPT_CATS_DB_PATH", None)
        os.environ.pop("RGPT_CATS_LEDGER_PATH", None)
        shutil.rmtree(self._tmp, ignore_errors=True)

    def test_create_publish_transition_and_list(self) -> None:
        created = self.client.post(
            "/api/cats",
            headers=self.headers,
            json={"name": "Compliance Bot", "description": "Draft CAT"},
        )
        self.assertEqual(created.status_code, 201, created.text)
        created_body = created.json()
        cat_id = created_body["catId"]
        self.assertEqual(created_body["status"], "Draft")
        self.assertTrue(created_body["ledgerWritten"])

        published = self.client.post(
            f"/api/cats/{cat_id}/versions",
            headers=self.headers,
            json={
                "version": "1.0.0",
                "manifestJson": {"entrypoint": "run"},
                "rulebookJson": {"policy": "strict"},
                "commandBundleRef": "cats/bundles/compliance-v1",
            },
        )
        self.assertEqual(published.status_code, 201, published.text)
        published_body = published.json()
        self.assertEqual(published_body["version"], "1.0.0")
        self.assertTrue(published_body["ledgerWritten"])

        versions = self.client.get(f"/api/cats/{cat_id}/versions", headers=self.headers)
        self.assertEqual(versions.status_code, 200, versions.text)
        versions_body = versions.json()
        self.assertEqual(len(versions_body["items"]), 1)

        to_review = self.client.post(
            f"/api/cats/{cat_id}/transition",
            headers=self.headers,
            json={"targetStatus": "Review"},
        )
        self.assertEqual(to_review.status_code, 200, to_review.text)
        self.assertEqual(to_review.json()["status"], "Review")
        self.assertTrue(to_review.json()["ledgerWritten"])

        listed = self.client.get("/api/cats?page=1&pageSize=10", headers=self.headers)
        self.assertEqual(listed.status_code, 200, listed.text)
        listed_body = listed.json()
        self.assertEqual(listed_body["total"], 1)
        self.assertEqual(listed_body["items"][0]["catId"], cat_id)

        self.assertTrue(self.ledger_path.exists())
        events = self.ledger_path.read_text(encoding="utf-8").strip().splitlines()
        self.assertGreaterEqual(len(events), 3)

    def test_put_rejected_when_not_draft_or_review(self) -> None:
        created = self.client.post(
            "/api/cats",
            headers=self.headers,
            json={"name": "Immutable CAT", "description": "Will be archived"},
        )
        self.assertEqual(created.status_code, 201, created.text)
        cat_id = created.json()["catId"]

        self.client.post(
            f"/api/cats/{cat_id}/transition",
            headers=self.headers,
            json={"targetStatus": "Archived"},
        )

        updated = self.client.put(
            f"/api/cats/{cat_id}",
            headers=self.headers,
            json={"name": "Renamed", "description": "nope"},
        )
        self.assertEqual(updated.status_code, 409, updated.text)
        self.assertIn("Draft/Review", updated.json()["detail"])


if __name__ == "__main__":
    unittest.main()
