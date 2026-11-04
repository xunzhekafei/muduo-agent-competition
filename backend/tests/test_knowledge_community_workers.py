from __future__ import annotations

import unittest

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.security import hash_password
from app.db import Base
from app.db.session import get_db_session
import app.db.models  # noqa: F401
from app.main import create_app
from app.modules.users.models import UserModel
from app.schemas.enums import UserRole
from app.workers import TaskStatus, WorkerTask, WorkerTaskType, build_default_registry


class KnowledgeCommunityApiTest(unittest.TestCase):
    def setUp(self) -> None:
        self.engine = create_engine(
            "sqlite+pysqlite:///:memory:",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        Base.metadata.create_all(self.engine)
        self.session_factory = sessionmaker(bind=self.engine, autoflush=False, expire_on_commit=False)
        self._seed_user()
        self.app = create_app()

        def override_db_session():
            session = self.session_factory()
            try:
                yield session
            finally:
                session.close()

        self.app.dependency_overrides[get_db_session] = override_db_session
        self.client = TestClient(self.app)
        self.auth_headers = self._login_headers()

    def tearDown(self) -> None:
        self.app.dependency_overrides.clear()
        Base.metadata.drop_all(self.engine)
        self.engine.dispose()

    def test_knowledge_graph_and_community_asset_flow(self) -> None:
        calculus = self.client.post(
            "/api/v1/knowledge-graph/concepts",
            json={"name": "Calculus"},
            headers=self.auth_headers,
        )
        self.assertEqual(calculus.status_code, 200)
        calculus_id = calculus.json()["data"]["id"]

        derivative = self.client.post(
            "/api/v1/knowledge-graph/concepts",
            json={"name": "Derivative"},
            headers=self.auth_headers,
        ).json()["data"]

        relation = self.client.post(
            "/api/v1/knowledge-graph/relations",
            json={
                "sourceConceptId": calculus_id,
                "targetConceptId": derivative["id"],
                "relationType": "part_of",
            },
            headers=self.auth_headers,
        )
        self.assertEqual(relation.status_code, 201)

        mastery = self.client.put(
            "/api/v1/knowledge-graph/mastery",
            json={"conceptId": derivative["id"], "level": "learning", "confidence": 0.4},
            headers=self.auth_headers,
        )
        self.assertEqual(mastery.status_code, 200)

        graph = self.client.get("/api/v1/knowledge-graph", headers=self.auth_headers)
        self.assertEqual(len(graph.json()["data"]["concepts"]), 2)
        self.assertEqual(len(graph.json()["data"]["relations"]), 1)

        asset = self.client.post(
            "/api/v1/community/assets",
            json={
                "title": "Calculus graph",
                "assetType": "knowledge_graph",
                "sourceId": calculus_id,
                "tags": ["math"],
            },
            headers=self.auth_headers,
        )
        self.assertEqual(asset.status_code, 201)
        asset_id = asset.json()["data"]["id"]

        listing = self.client.get("/api/v1/community/assets?tag=math")
        self.assertEqual(listing.status_code, 200)
        self.assertEqual(listing.json()["pagination"]["total"], 1)

        collection = self.client.post(
            f"/api/v1/community/assets/{asset_id}/collections",
            json={},
            headers=self.auth_headers,
        )
        self.assertEqual(collection.status_code, 201)

        contributions = self.client.get("/api/v1/community/contributions", headers=self.auth_headers)
        self.assertEqual(contributions.status_code, 200)
        self.assertEqual(contributions.json()["pagination"]["total"], 2)

    def _seed_user(self) -> None:
        session = self.session_factory()
        try:
            user = UserModel(
                name="Zhang Yuxuan",
                email="zhang@example.com",
                role=UserRole.STUDENT,
                password_hash=hash_password("secret123"),
            )
            session.add(user)
            session.commit()
        finally:
            session.close()

    def _login_headers(self) -> dict[str, str]:
        response = self.client.post(
            "/api/v1/auth/login",
            json={"email": "zhang@example.com", "password": "secret123"},
        )
        self.assertEqual(response.status_code, 200)
        return {"Authorization": f"Bearer {response.json()['data']['accessToken']}"}


class WorkerRegistryTest(unittest.TestCase):
    def test_default_worker_registry_runs_memory_task(self) -> None:
        registry = build_default_registry()
        task = WorkerTask(
            task_type=WorkerTaskType.MEMORY_CARD_GENERATION,
            payload={"note_id": "note_1", "blocks": ["Definition", "Example"]},
        )

        result = registry.run(task)

        self.assertEqual(result.status, TaskStatus.SUCCEEDED)
        self.assertEqual(result.data["count"], 2)

    def test_default_worker_registry_runs_resource_parse_task(self) -> None:
        registry = build_default_registry()
        task = WorkerTask(
            task_type=WorkerTaskType.RESOURCE_PARSE,
            payload={
                "resource_id": "res_1",
                "title": "Lecture 1",
                "source_text": "Matrix basics",
                "core_concepts": ["matrix"],
            },
        )

        result = registry.run(task)

        self.assertEqual(result.status, TaskStatus.SUCCEEDED)
        self.assertEqual(result.data["resource_id"], "res_1")
        self.assertEqual(result.data["chapters"][0]["title"], "Lecture 1")

    def test_worker_failure_is_returned_as_result(self) -> None:
        registry = build_default_registry()
        task = WorkerTask(
            task_type=WorkerTaskType.COMMUNITY_INDEXING,
            payload={"asset_id": "asset_1"},
        )

        result = registry.run(task)

        self.assertEqual(result.status, TaskStatus.FAILED)
        self.assertIn("title is required", result.error or "")


if __name__ == "__main__":
    unittest.main()
