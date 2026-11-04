"""共享社区模块测试"""
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


class CommunityApiTest(unittest.TestCase):
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
        self.app.dependency_overrides[get_db_session] = lambda: self.session_factory()
        self.client = TestClient(self.app)
        self.token = self._login()
        self.headers = {"Authorization": f"Bearer {self.token}"}

    def _seed_user(self) -> None:
        session = self.session_factory()
        self.user = UserModel(
            id="user_test_01",
            name="Test User",
            email="test@example.com",
            password_hash=hash_password("test123456"),
            role=UserRole.STUDENT,
        )
        session.add(self.user)
        session.commit()

    def _login(self) -> str:
        resp = self.client.post(
            "/api/v1/auth/login",
            json={"email": "test@example.com", "password": "test123456"},
        )
        return resp.json()["data"]["accessToken"]

    def test_list_public_assets_returns_paginated_data(self) -> None:
        resp = self.client.get("/api/v1/community/assets", headers=self.headers)
        self.assertEqual(resp.status_code, 200)
        payload = resp.json()
        self.assertIn("data", payload)
        self.assertIn("pagination", payload)

    def test_publish_asset_requires_authentication(self) -> None:
        resp = self.client.post(
            "/api/v1/community/assets",
            json={
                "title": "Test",
                "assetType": "note",
                "sourceId": "note_001",
            },
        )
        self.assertEqual(resp.status_code, 401)

    def test_publish_and_list_asset_flow(self) -> None:
        course_resp = self.client.post(
            "/api/v1/courses",
            json={"name": "测试课程", "subject": "计算机"},
            headers=self.headers,
        )
        course_id = course_resp.json()["data"]["id"]

        note_resp = self.client.post(
            "/api/v1/notes",
            json={"title": "社区测试笔记", "courseId": course_id},
            headers=self.headers,
        )
        note_id = note_resp.json()["data"]["id"]

        resp = self.client.post(
            "/api/v1/community/assets",
            json={
                "title": "测试共享笔记",
                "assetType": "note",
                "sourceId": note_id,
                "description": "社区测试",
                "tags": ["测试"],
            },
            headers=self.headers,
        )
        self.assertEqual(resp.status_code, 201)

        list_resp = self.client.get("/api/v1/community/assets", headers=self.headers)
        self.assertEqual(list_resp.status_code, 200)
        self.assertGreaterEqual(len(list_resp.json()["data"]), 1)
