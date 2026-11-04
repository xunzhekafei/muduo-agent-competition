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


class AiTasksApiTest(unittest.TestCase):
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

    def test_ai_task_create_get_update_flow(self) -> None:
        course = self._create_course()
        create_response = self.client.post(
            "/api/v1/ai-tasks",
            json={
                "type": "llm_summary",
                "courseId": course["id"],
                "input": {"prompt": "Summarize chapter 1"},
            },
            headers=self.auth_headers,
        )
        self.assertEqual(create_response.status_code, 202)
        task_id = create_response.json()["data"]["taskId"]

        get_response = self.client.get(f"/api/v1/ai-tasks/{task_id}", headers=self.auth_headers)
        self.assertEqual(get_response.status_code, 200)
        task = get_response.json()["data"]
        self.assertEqual(task["type"], "llm_summary")
        self.assertEqual(task["status"], "queued")
        self.assertEqual(task["courseId"], course["id"])
        self.assertEqual(task["input"]["prompt"], "Summarize chapter 1")

        running_response = self.client.patch(
            f"/api/v1/ai-tasks/{task_id}",
            json={"status": "running", "progress": 40},
            headers=self.auth_headers,
        )
        self.assertEqual(running_response.status_code, 200)
        self.assertEqual(running_response.json()["data"]["status"], "running")
        self.assertEqual(running_response.json()["data"]["progress"], 40)
        self.assertIsNotNone(running_response.json()["data"]["startedAt"])

        succeeded_response = self.client.patch(
            f"/api/v1/ai-tasks/{task_id}",
            json={"status": "succeeded", "output": {"summary": "Chapter 1 summary"}},
            headers=self.auth_headers,
        )
        self.assertEqual(succeeded_response.status_code, 200)
        succeeded = succeeded_response.json()["data"]
        self.assertEqual(succeeded["status"], "succeeded")
        self.assertEqual(succeeded["progress"], 100)
        self.assertEqual(succeeded["output"]["summary"], "Chapter 1 summary")
        self.assertIsNotNone(succeeded["finishedAt"])

        cancel_response = self.client.post(
            f"/api/v1/ai-tasks/{task_id}/cancel",
            headers=self.auth_headers,
        )
        self.assertEqual(cancel_response.status_code, 422)

    def test_ai_task_cancel_flow(self) -> None:
        create_response = self.client.post(
            "/api/v1/ai-tasks",
            json={"type": "memory_card_generation", "input": {"noteId": "note_1"}},
            headers=self.auth_headers,
        )
        task_id = create_response.json()["data"]["taskId"]

        cancel_response = self.client.post(
            f"/api/v1/ai-tasks/{task_id}/cancel",
            headers=self.auth_headers,
        )

        self.assertEqual(cancel_response.status_code, 200)
        task = cancel_response.json()["data"]
        self.assertEqual(task["status"], "canceled")
        self.assertIsNotNone(task["canceledAt"])
        self.assertIsNotNone(task["finishedAt"])

    def test_resource_parse_task_updates_resource_status(self) -> None:
        course = self._create_course()
        resource = self.client.post(
            "/api/v1/resources",
            json={
                "courseId": course["id"],
                "name": "lecture.pdf",
                "type": "pdf",
            },
            headers=self.auth_headers,
        ).json()["data"]

        create_response = self.client.post(
            "/api/v1/ai-tasks",
            json={
                "type": "resource_parse",
                "resourceId": resource["id"],
                "input": {"resourceId": resource["id"]},
            },
            headers=self.auth_headers,
        )
        self.assertEqual(create_response.status_code, 202)
        task_id = create_response.json()["data"]["taskId"]

        parsing_resource = self.client.get(
            f"/api/v1/resources/{resource['id']}",
            headers=self.auth_headers,
        ).json()["data"]
        self.assertEqual(parsing_resource["status"], "parsing")
        self.assertEqual(parsing_resource["parseTaskId"], task_id)

        failed_response = self.client.patch(
            f"/api/v1/ai-tasks/{task_id}",
            json={
                "status": "failed",
                "errorCode": "PARSE_FAILED",
                "errorMessage": "parser timeout",
            },
            headers=self.auth_headers,
        )
        self.assertEqual(failed_response.status_code, 200)
        self.assertEqual(failed_response.json()["data"]["errorCode"], "PARSE_FAILED")

        failed_resource = self.client.get(
            f"/api/v1/resources/{resource['id']}",
            headers=self.auth_headers,
        ).json()["data"]
        self.assertEqual(failed_resource["status"], "failed")

    def test_openai_chat_completions_compatible_entry_creates_task(self) -> None:
        course = self._create_course()
        response = self.client.post(
            "/api/v1/ai/openai/chat/completions",
            json={
                "model": "gpt-4.1-mini",
                "messages": [
                    {"role": "system", "content": "You summarize notes."},
                    {"role": "user", "content": "Summarize chapter 1."},
                ],
                "temperature": 0.2,
                "max_tokens": 512,
                "metadata": {"courseId": course["id"], "taskType": "llm_summary"},
            },
            headers=self.auth_headers,
        )
        self.assertEqual(response.status_code, 202)
        task_id = response.json()["data"]["taskId"]

        task_response = self.client.get(f"/api/v1/ai-tasks/{task_id}", headers=self.auth_headers)
        self.assertEqual(task_response.status_code, 200)
        task = task_response.json()["data"]
        self.assertEqual(task["type"], "llm_summary")
        self.assertEqual(task["courseId"], course["id"])
        self.assertEqual(task["input"]["providerFormat"], "openai.chat.completions")
        self.assertEqual(task["input"]["request"]["max_tokens"], 512)

    def test_ai_tasks_require_authentication_and_owner_scope(self) -> None:
        self.assertEqual(self.client.get("/api/v1/ai-tasks/task_missing").status_code, 401)

        session = self.session_factory()
        try:
            other_task = AiTaskModel(
                owner_id=self.other_user_id,
                task_type=AiTaskType.LLM_SUMMARY,
                status=AiTaskStatus.QUEUED,
                input_payload={"prompt": "private"},
            )
            session.add(other_task)
            session.commit()
            task_id = other_task.id
        finally:
            session.close()

        response = self.client.get(f"/api/v1/ai-tasks/{task_id}", headers=self.auth_headers)
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
