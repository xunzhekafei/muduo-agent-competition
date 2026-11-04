from __future__ import annotations

import unittest

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.db import Base
from app.db.session import get_db_session
import app.db.models  # noqa: F401
from app.main import create_app
from app.modules.users.models import UserModel
from app.core.security import hash_password
from app.schemas.enums import UserRole


class AuthUsersApiTest(unittest.TestCase):
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

    def tearDown(self) -> None:
        self.app.dependency_overrides.clear()
        Base.metadata.drop_all(self.engine)
        self.engine.dispose()

    def test_login_get_update_preferences_refresh_and_logout(self) -> None:
        login_response = self.client.post(
            "/api/v1/auth/login",
            json={"email": "chai@example.com", "password": "secret123"},
        )

        self.assertEqual(login_response.status_code, 200)
        login_data = login_response.json()["data"]
        access_token = login_data["accessToken"]
        refresh_token = login_data["refreshToken"]
        self.assertEqual(login_data["tokenType"], "Bearer")
        self.assertEqual(login_data["user"]["email"], "chai@example.com")

        auth_headers = {"Authorization": f"Bearer {access_token}"}
        me_response = self.client.get("/api/v1/users/me", headers=auth_headers)
        self.assertEqual(me_response.status_code, 200)
        self.assertEqual(me_response.json()["data"]["name"], "Chai Yifan")

        update_user_response = self.client.patch(
            "/api/v1/users/me",
            json={"name": "CYF", "avatarUrl": "https://example.com/avatar.png"},
            headers=auth_headers,
        )
        self.assertEqual(update_user_response.status_code, 200)
        self.assertEqual(update_user_response.json()["data"]["name"], "CYF")
        self.assertEqual(update_user_response.json()["data"]["avatarUrl"], "https://example.com/avatar.png")

        preferences_response = self.client.patch(
            "/api/v1/users/me/preferences",
            json={
                "theme": "dark",
                "dailyReviewReminder": False,
                "reminderTime": "20:30",
                "aiGuidanceLevel": "strict",
            },
            headers=auth_headers,
        )
        self.assertEqual(preferences_response.status_code, 200)
        self.assertEqual(preferences_response.json()["data"]["theme"], "dark")
        self.assertFalse(preferences_response.json()["data"]["dailyReviewReminder"])

        refresh_response = self.client.post(
            "/api/v1/auth/refresh",
            json={"refreshToken": refresh_token},
        )
        self.assertEqual(refresh_response.status_code, 200)
        rotated_refresh_token = refresh_response.json()["data"]["refreshToken"]
        self.assertNotEqual(rotated_refresh_token, refresh_token)

        old_refresh_response = self.client.post(
            "/api/v1/auth/refresh",
            json={"refreshToken": refresh_token},
        )
        self.assertEqual(old_refresh_response.status_code, 401)

        refreshed_access_token = refresh_response.json()["data"]["accessToken"]
        logout_response = self.client.post(
            "/api/v1/auth/logout",
            headers={"Authorization": f"Bearer {refreshed_access_token}"},
        )
        self.assertEqual(logout_response.status_code, 200)
        self.assertEqual(logout_response.json(), {"data": {}})

        revoked_response = self.client.get(
            "/api/v1/users/me",
            headers={"Authorization": f"Bearer {refreshed_access_token}"},
        )
        self.assertEqual(revoked_response.status_code, 401)

    def test_login_rejects_invalid_password(self) -> None:
        response = self.client.post(
            "/api/v1/auth/login",
            json={"email": "chai@example.com", "password": "wrong"},
        )

        self.assertEqual(response.status_code, 401)
        self.assertEqual(response.json()["error"]["code"], "INVALID_CREDENTIALS")

    def test_protected_endpoint_requires_bearer_token(self) -> None:
        response = self.client.get("/api/v1/users/me")

        self.assertEqual(response.status_code, 401)
        self.assertEqual(response.json()["error"]["code"], "UNAUTHORIZED")

    def _seed_user(self) -> None:
        session = self.session_factory()
        try:
            session.add(
                UserModel(
                    name="Chai Yifan",
                    email="chai@example.com",
                    role=UserRole.STUDENT,
                    password_hash=hash_password("secret123"),
                )
            )
            session.commit()
        finally:
            session.close()


if __name__ == "__main__":
    unittest.main()
