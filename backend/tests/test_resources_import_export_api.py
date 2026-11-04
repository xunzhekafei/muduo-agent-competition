from __future__ import annotations

import unittest

from fastapi.testclient import TestClient
from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.security import hash_password
from app.db import Base
from app.db.session import get_db_session
import app.db.models  # noqa: F401
from app.main import create_app
from app.modules.ai_tasks.models import AiTaskModel
from app.modules.courses.models import CourseModel
from app.modules.resources.models import (
    ParsedResourceChapterModel,
    ParsedResourceModel,
    ResourceModel,
)
from app.modules.users.models import UserModel
from app.schemas.enums import ResourceStatus, ResourceType, UserRole


class ResourcesImportExportApiTest(unittest.TestCase):
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

    def test_resource_metadata_parse_task_and_parsed_result_flow(self) -> None:
        course = self._create_course()
        space = self.client.post(
            f"/api/v1/courses/{course['id']}/learning-spaces",
            json={"name": "Chapter 1"},
            headers=self.auth_headers,
        ).json()["data"]

        create_response = self.client.post(
            "/api/v1/resources",
            json={
                "courseId": course["id"],
                "learningSpaceId": space["id"],
                "name": "lecture-1.pdf",
                "type": "pdf",
                "sizeBytes": 2048,
                "storageKey": "uploads/lecture-1.pdf",
            },
            headers=self.auth_headers,
        )
        self.assertEqual(create_response.status_code, 201)
        resource = create_response.json()["data"]
        resource_id = resource["id"]
        self.assertEqual(resource["status"], "uploaded")
        self.assertEqual(resource["learningSpaceId"], space["id"])

        list_response = self.client.get(
            f"/api/v1/resources?courseId={course['id']}&learningSpaceId={space['id']}",
            headers=self.auth_headers,
        )
        self.assertEqual(list_response.status_code, 200)
        self.assertEqual(list_response.json()["pagination"]["total"], 1)

        parse_response = self.client.post(
            f"/api/v1/resources/{resource_id}/parse",
            json={"targetNoteId": "note_draft_1", "options": {"mode": "outline"}},
            headers=self.auth_headers,
        )
        self.assertEqual(parse_response.status_code, 202)
        task = parse_response.json()["data"]
        self.assertEqual(task["status"], "queued")

        parsed_status_response = self.client.get(
            f"/api/v1/resources/{resource_id}",
            headers=self.auth_headers,
        )
        self.assertEqual(parsed_status_response.status_code, 200)
        self.assertEqual(parsed_status_response.json()["data"]["status"], "parsing")
        self.assertEqual(parsed_status_response.json()["data"]["parseTaskId"], task["taskId"])

        session = self.session_factory()
        try:
            saved_task = session.execute(select(AiTaskModel)).scalar_one()
            self.assertEqual(saved_task.resource_id, resource_id)
            self.assertEqual(saved_task.input_payload["targetNoteId"], "note_draft_1")
            self._seed_parsed_result(session, resource_id)
        finally:
            session.close()

        result_response = self.client.get(
            f"/api/v1/resources/{resource_id}/parsed-result",
            headers=self.auth_headers,
        )
        self.assertEqual(result_response.status_code, 200)
        parsed = result_response.json()["data"]
        self.assertEqual(parsed["title"], "Lecture 1")
        self.assertEqual(parsed["coreConcepts"], ["matrix"])
        self.assertEqual(parsed["chapters"][0]["title"], "Overview")

        delete_response = self.client.delete(
            f"/api/v1/resources/{resource_id}",
            headers=self.auth_headers,
        )
        self.assertEqual(delete_response.status_code, 200)
        deleted_response = self.client.get(
            f"/api/v1/resources/{resource_id}",
            headers=self.auth_headers,
        )
        self.assertEqual(deleted_response.status_code, 404)

    def test_import_job_creates_resource_and_parse_task(self) -> None:
        course = self._create_course()

        response = self.client.post(
            "/api/v1/import-jobs",
            json={
                "courseId": course["id"],
                "sourceType": "markdown",
                "sourceUrl": "https://example.com/notes/lecture-2.md",
                "options": {"splitBy": "heading"},
            },
            headers=self.auth_headers,
        )

        self.assertEqual(response.status_code, 202)
        job = response.json()["data"]
        self.assertEqual(job["type"], "import")
        self.assertEqual(job["status"], "queued")
        self.assertEqual(job["courseId"], course["id"])
        self.assertIsNotNone(job["resourceId"])
        self.assertIsNotNone(job["taskId"])

        job_response = self.client.get(
            f"/api/v1/import-jobs/{job['id']}",
            headers=self.auth_headers,
        )
        self.assertEqual(job_response.status_code, 200)
        self.assertEqual(job_response.json()["data"]["resourceId"], job["resourceId"])

        resource_response = self.client.get(
            f"/api/v1/resources/{job['resourceId']}",
            headers=self.auth_headers,
        )
        self.assertEqual(resource_response.status_code, 200)
        self.assertEqual(resource_response.json()["data"]["status"], "parsing")

    def test_export_job_flow(self) -> None:
        response = self.client.post(
            "/api/v1/export-jobs",
            json={
                "noteIds": ["note_1", "note_2"],
                "format": "pdf",
                "options": {"includeCards": True},
            },
            headers=self.auth_headers,
        )

        self.assertEqual(response.status_code, 202)
        job = response.json()["data"]
        self.assertEqual(job["type"], "export")
        self.assertEqual(job["status"], "queued")
        self.assertEqual(job["exportFormat"], "pdf")
        self.assertEqual(job["noteIds"], ["note_1", "note_2"])

        job_response = self.client.get(
            f"/api/v1/export-jobs/{job['id']}",
            headers=self.auth_headers,
        )
        self.assertEqual(job_response.status_code, 200)
        self.assertEqual(job_response.json()["data"]["options"]["includeCards"], True)

    def test_resource_and_jobs_require_authentication(self) -> None:
        self.assertEqual(self.client.get("/api/v1/resources").status_code, 401)
        self.assertEqual(
            self.client.post(
                "/api/v1/import-jobs",
                json={"courseId": "course_1", "sourceType": "pdf"},
            ).status_code,
            401,
        )

    def test_resource_access_is_limited_to_owner(self) -> None:
        session = self.session_factory()
        try:
            course = CourseModel(
                owner_id=self.other_user_id,
                name="Private Course",
                subject="Physics",
            )
            session.add(course)
            session.flush()
            resource = ResourceModel(
                owner_id=self.other_user_id,
                course_id=course.id,
                name="private.pdf",
                resource_type=ResourceType.PDF,
                status=ResourceStatus.UPLOADED,
            )
            session.add(resource)
            session.commit()
            resource_id = resource.id
        finally:
            session.close()

        response = self.client.get(f"/api/v1/resources/{resource_id}", headers=self.auth_headers)

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

    def _seed_parsed_result(self, session, resource_id: str) -> None:
        parsed = ParsedResourceModel(
            owner_id=self.user_id,
            resource_id=resource_id,
            title="Lecture 1",
            core_concepts=["matrix"],
            note_draft_id="note_draft_1",
        )
        session.add(parsed)
        session.flush()
        session.add(
            ParsedResourceChapterModel(
                parsed_resource_id=parsed.id,
                position=0,
                title="Overview",
                content="Matrix basics",
            )
        )
        resource = session.get(ResourceModel, resource_id)
        self.assertIsNotNone(resource)
        resource.status = ResourceStatus.PARSED
        session.commit()


if __name__ == "__main__":
    unittest.main()
