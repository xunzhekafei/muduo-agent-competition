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
from app.modules.courses.models import CourseModel
from app.modules.users.models import UserModel
from app.schemas.enums import UserRole


class CoursesApiTest(unittest.TestCase):
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

    def test_course_crud_and_learning_space_flow(self) -> None:
        create_response = self.client.post(
            "/api/v1/courses",
            json={
                "name": "Linear Algebra",
                "subject": "Math",
                "description": "Vectors and matrices",
            },
            headers=self.auth_headers,
        )
        self.assertEqual(create_response.status_code, 201)
        course = create_response.json()["data"]
        course_id = course["id"]
        self.assertEqual(course["ownerId"], self.user_id)

        list_response = self.client.get("/api/v1/courses", headers=self.auth_headers)
        self.assertEqual(list_response.status_code, 200)
        self.assertEqual(list_response.json()["pagination"]["total"], 1)
        self.assertEqual(list_response.json()["data"][0]["id"], course_id)

        update_response = self.client.patch(
            f"/api/v1/courses/{course_id}",
            json={"name": "Advanced Linear Algebra"},
            headers=self.auth_headers,
        )
        self.assertEqual(update_response.status_code, 200)
        self.assertEqual(update_response.json()["data"]["name"], "Advanced Linear Algebra")

        root_space = self.client.post(
            f"/api/v1/courses/{course_id}/learning-spaces",
            json={"name": "Chapter 1", "position": 1},
            headers=self.auth_headers,
        )
        self.assertEqual(root_space.status_code, 201)
        root_space_id = root_space.json()["data"]["id"]

        child_space = self.client.post(
            f"/api/v1/courses/{course_id}/learning-spaces",
            json={
                "parentId": root_space_id,
                "name": "1.1 Vectors",
                "description": "Vector basics",
                "position": 2,
            },
            headers=self.auth_headers,
        )
        self.assertEqual(child_space.status_code, 201)
        child_space_id = child_space.json()["data"]["id"]
        self.assertEqual(child_space.json()["data"]["parentId"], root_space_id)

        spaces_response = self.client.get(
            f"/api/v1/courses/{course_id}/learning-spaces",
            headers=self.auth_headers,
        )
        self.assertEqual(spaces_response.status_code, 200)
        self.assertEqual(spaces_response.json()["pagination"]["total"], 2)
        self.assertEqual([item["name"] for item in spaces_response.json()["data"]], ["Chapter 1", "1.1 Vectors"])

        update_space_response = self.client.patch(
            f"/api/v1/courses/{course_id}/learning-spaces/{child_space_id}",
            json={"name": "1.1 Vector Spaces", "position": 3},
            headers=self.auth_headers,
        )
        self.assertEqual(update_space_response.status_code, 200)
        self.assertEqual(update_space_response.json()["data"]["name"], "1.1 Vector Spaces")
        self.assertEqual(update_space_response.json()["data"]["position"], 3)

        delete_space_response = self.client.delete(
            f"/api/v1/courses/{course_id}/learning-spaces/{child_space_id}",
            headers=self.auth_headers,
        )
        self.assertEqual(delete_space_response.status_code, 200)

        deleted_space_response = self.client.get(
            f"/api/v1/courses/{course_id}/learning-spaces/{child_space_id}",
            headers=self.auth_headers,
        )
        self.assertEqual(deleted_space_response.status_code, 404)

        delete_course_response = self.client.delete(
            f"/api/v1/courses/{course_id}",
            headers=self.auth_headers,
        )
        self.assertEqual(delete_course_response.status_code, 200)

        deleted_course_response = self.client.get(
            f"/api/v1/courses/{course_id}",
            headers=self.auth_headers,
        )
        self.assertEqual(deleted_course_response.status_code, 404)

    def test_course_access_is_limited_to_owner(self) -> None:
        session = self.session_factory()
        try:
            other_course = CourseModel(
                owner_id=self.other_user_id,
                name="Private Course",
                subject="Physics",
            )
            session.add(other_course)
            session.commit()
            course_id = other_course.id
        finally:
            session.close()

        response = self.client.get(f"/api/v1/courses/{course_id}", headers=self.auth_headers)

        self.assertEqual(response.status_code, 404)

    def test_learning_space_parent_must_belong_to_same_course(self) -> None:
        first_course = self.client.post(
            "/api/v1/courses",
            json={"name": "Course A", "subject": "Math"},
            headers=self.auth_headers,
        ).json()["data"]
        second_course = self.client.post(
            "/api/v1/courses",
            json={"name": "Course B", "subject": "Physics"},
            headers=self.auth_headers,
        ).json()["data"]
        parent_space = self.client.post(
            f"/api/v1/courses/{first_course['id']}/learning-spaces",
            json={"name": "Only A"},
            headers=self.auth_headers,
        ).json()["data"]

        response = self.client.post(
            f"/api/v1/courses/{second_course['id']}/learning-spaces",
            json={"name": "Invalid child", "parentId": parent_space["id"]},
            headers=self.auth_headers,
        )

        self.assertEqual(response.status_code, 404)

    def test_learning_space_parent_cannot_create_cycle(self) -> None:
        course = self.client.post(
            "/api/v1/courses",
            json={"name": "Course A", "subject": "Math"},
            headers=self.auth_headers,
        ).json()["data"]
        root_space = self.client.post(
            f"/api/v1/courses/{course['id']}/learning-spaces",
            json={"name": "Chapter 1"},
            headers=self.auth_headers,
        ).json()["data"]
        child_space = self.client.post(
            f"/api/v1/courses/{course['id']}/learning-spaces",
            json={"name": "1.1 Basics", "parentId": root_space["id"]},
            headers=self.auth_headers,
        ).json()["data"]

        response = self.client.patch(
            f"/api/v1/courses/{course['id']}/learning-spaces/{root_space['id']}",
            json={"parentId": child_space["id"]},
            headers=self.auth_headers,
        )

        self.assertEqual(response.status_code, 422)

    def test_courses_require_authentication(self) -> None:
        response = self.client.get("/api/v1/courses")

        self.assertEqual(response.status_code, 401)

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


if __name__ == "__main__":
    unittest.main()
