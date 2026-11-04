"""知识图谱模块测试"""
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


class KnowledgeGraphApiTest(unittest.TestCase):
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

    def test_get_empty_graph(self) -> None:
        resp = self.client.get("/api/v1/knowledge-graph", headers=self.headers)
        self.assertEqual(resp.status_code, 200)
        data = resp.json()["data"]
        self.assertIn("concepts", data)
        self.assertIn("relations", data)

    def test_upsert_and_graph_concept(self) -> None:
        resp = self.client.post(
            "/api/v1/knowledge-graph/concepts",
            json={"name": "测试概念"},
            headers=self.headers,
        )
        self.assertEqual(resp.status_code, 200)
        data = resp.json()["data"]
        self.assertEqual(data["name"], "测试概念")

        graph = self.client.get("/api/v1/knowledge-graph", headers=self.headers)
        concepts = graph.json()["data"]["concepts"]
        self.assertEqual(len(concepts), 1)

    def test_knowledge_graph_requires_authentication(self) -> None:
        resp = self.client.get("/api/v1/knowledge-graph")
        self.assertEqual(resp.status_code, 401)
