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
from app.modules.ai_tasks.models import AiTaskModel
from app.modules.users.models import UserModel
from app.schemas.enums import AiTaskStatus, AiTaskType, UserRole


class ResourceWorkflowsApiTest(unittest.TestCase):
    def setUp(self) -> None:
        self.engine = create_engine(
            "sqlite+pysqlite:///:memory:",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        Base.metadata.create_all(self.engine)
        self.session_factory = sessionmaker(
            bind=self.engine,
            autoflush=False,
            expire_on_commit=False,
        )
        self._seed_users()

        self.app = create_app()

        def override_db_session():
            session = self.session_factory()
            try:
                yield session
            finally:
                session.close()

        self.app.dependency_overrides[get_db_session] = override_db_session
        self.client = TestClient(self.app)
        self.auth_headers = self._login_headers("chai@example.com", "secret123")

    def tearDown(self) -> None:
        self.app.dependency_overrides.clear()
        Base.metadata.drop_all(self.engine)
        self.engine.dispose()

    def test_resource_import_workflow_creates_resource_parse_task_and_context(self) -> None:
        course = self._create_course()

        response = self.client.post(
            "/api/v1/workflows/resource-notes/import",
            json={
                "courseId": course["id"],
                "sourceType": "markdown",
                "sourceUrl": "https://example.com/notes/lecture-3.md",
            },
            headers=self.auth_headers,
        )

        self.assertEqual(response.status_code, 202)
        job = response.json()["data"]
        self.assertEqual(job["type"], "import")
        self.assertIsNotNone(job["resourceId"])
        self.assertIsNotNone(job["taskId"])

        context_response = self.client.get(
            f"/api/v1/workflows/resource-notes/context?resourceId={job['resourceId']}",
            headers=self.auth_headers,
        )
        self.assertEqual(context_response.status_code, 200)
        context = context_response.json()["data"]
        self.assertEqual(context["user"]["id"], self.user_id)
        self.assertEqual(context["course"]["id"], course["id"])
        self.assertEqual(context["resource"]["id"], job["resourceId"])
        self.assertEqual(context["parseTask"]["id"], job["taskId"])
        self.assertIn("poll_ai_task", context["nextActions"])

    def test_complete_resource_parse_workflow_creates_note_draft_and_links_task(self) -> None:
        course = self._create_course()
        resource = self.client.post(
            "/api/v1/resources",
            json={
                "courseId": course["id"],
                "name": "lecture-4.pdf",
                "type": "pdf",
            },
            headers=self.auth_headers,
        ).json()["data"]
        parse_task = self.client.post(
            f"/api/v1/resources/{resource['id']}/parse",
            json={"options": {"mode": "draft"}},
            headers=self.auth_headers,
        ).json()["data"]

        response = self.client.post(
            f"/api/v1/workflows/resource-notes/parse-tasks/{parse_task['taskId']}/complete",
            json={
                "title": "Lecture 4",
                "coreConcepts": ["rank", "basis"],
                "rawText": "Rank and basis notes",
                "parserVersion": "mock-parser-1",
                "chapters": [
                    {
                        "position": 0,
                        "title": "Rank",
                        "content": "Rank measures independent rows or columns.",
                    },
                    {
                        "position": 1,
                        "title": "Basis",
                        "content": "A basis spans the vector space.",
                    },
                ],
            },
            headers=self.auth_headers,
        )

        self.assertEqual(response.status_code, 200)
        result = response.json()["data"]
        self.assertEqual(result["task"]["status"], "succeeded")
        self.assertEqual(result["resource"]["status"], "parsed")
        self.assertEqual(result["parsedResource"]["title"], "Lecture 4")
        self.assertEqual(result["parsedResource"]["coreConcepts"], ["rank", "basis"])
        self.assertEqual(result["noteDraft"]["status"], "draft")
        self.assertEqual(len(result["noteDraft"]["blocks"]), 4)
        self.assertEqual(result["parsedResource"]["noteDraftId"], result["noteDraft"]["id"])
        self.assertEqual(result["task"]["output"]["noteDraftId"], result["noteDraft"]["id"])

        parsed_response = self.client.get(
            f"/api/v1/resources/{resource['id']}/parsed-result",
            headers=self.auth_headers,
        )
        self.assertEqual(parsed_response.status_code, 200)
        self.assertEqual(
            parsed_response.json()["data"]["noteDraftId"],
            result["noteDraft"]["id"],
        )

        context_response = self.client.get(
            f"/api/v1/workflows/resource-notes/context?resourceId={resource['id']}",
            headers=self.auth_headers,
        )
        self.assertEqual(context_response.status_code, 200)
        context = context_response.json()["data"]
        self.assertEqual(context["parsedResource"]["resourceId"], resource["id"])
        self.assertIn("review_note_draft", context["nextActions"])

    def test_complete_parse_rejects_non_resource_parse_task(self) -> None:
        response = self.client.post(
            "/api/v1/ai-tasks",
            json={"type": "llm_summary", "input": {"prompt": "summary"}},
            headers=self.auth_headers,
        )
        task_id = response.json()["data"]["taskId"]

        complete_response = self.client.post(
            f"/api/v1/workflows/resource-notes/parse-tasks/{task_id}/complete",
            json={
                "title": "Invalid",
                "chapters": [{"title": "Chapter", "content": "Content"}],
            },
            headers=self.auth_headers,
        )

        self.assertEqual(complete_response.status_code, 422)

    def test_workflow_routes_require_authentication_and_owner_scope(self) -> None:
        self.assertEqual(self.client.get("/api/v1/workflows/resource-notes/context").status_code, 401)
        session = self.session_factory()
        try:
            other_task = AiTaskModel(
                owner_id=self.other_user_id,
                task_type=AiTaskType.RESOURCE_PARSE,
                status=AiTaskStatus.QUEUED,
                resource_id=None,
                input_payload={},
            )
            session.add(other_task)
            session.commit()
            task_id = other_task.id
        finally:
            session.close()

        response = self.client.post(
            f"/api/v1/workflows/resource-notes/parse-tasks/{task_id}/complete",
            json={
                "title": "Private",
                "chapters": [{"title": "Chapter", "content": "Content"}],
            },
            headers=self.auth_headers,
        )

        self.assertEqual(response.status_code, 404)

    def _seed_users(self) -> None:
        session = self.session_factory()
        try:
            user = UserModel(
                name="Chai Yifan",
                email="chai@example.com",
                role=UserRole.STUDENT,
                password_hash=hash_password("secret123"),
            )
            other_user = UserModel(
                name="Other User",
                email="other@example.com",
                role=UserRole.STUDENT,
                password_hash=hash_password("secret123"),
            )
            session.add_all([user, other_user])
            session.commit()
            self.user_id = user.id
            self.other_user_id = other_user.id
        finally:
            session.close()

    def _login_headers(self, email: str, password: str) -> dict[str, str]:
        response = self.client.post(
            "/api/v1/auth/login",
            json={"email": email, "password": password},
        )
        self.assertEqual(response.status_code, 200)
        return {"Authorization": f"Bearer {response.json()['data']['accessToken']}"}

    def _create_course(self) -> dict:
        response = self.client.post(
            "/api/v1/courses",
            json={"name": "Linear Algebra", "subject": "Math"},
            headers=self.auth_headers,
        )
        self.assertEqual(response.status_code, 201)
        return response.json()["data"]


if __name__ == "__main__":
    unittest.main()
