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


class NotesMemoryApiTest(unittest.TestCase):
    def setUp(self) -> None:
        self.engine = create_engine(
            "sqlite+pysqlite:///:memory:",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        Base.metadata.create_all(self.engine)
        self.session_factory = sessionmaker(bind=self.engine, autoflush=False, expire_on_commit=False)
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
        self.auth_headers = self._login_headers("zhang@example.com", "secret123")

    def tearDown(self) -> None:
        self.app.dependency_overrides.clear()
        Base.metadata.drop_all(self.engine)
        self.engine.dispose()

    def test_note_block_relation_and_memory_review_flow(self) -> None:
        source = self.client.post(
            "/api/v1/notes",
            json={"title": "Graph basics", "tags": ["Math", "Graph"]},
            headers=self.auth_headers,
        )
        self.assertEqual(source.status_code, 201)
        source_note = source.json()["data"]

        target_note = self.client.post(
            "/api/v1/notes",
            json={"title": "Linear algebra"},
            headers=self.auth_headers,
        ).json()["data"]

        block = self.client.post(
            f"/api/v1/notes/{source_note['id']}/blocks",
            json={"content": "Eigenvectors describe stable directions."},
            headers=self.auth_headers,
        )
        self.assertEqual(block.status_code, 201)
        self.assertEqual(block.json()["data"]["position"], 0)

        relation = self.client.post(
            f"/api/v1/notes/{source_note['id']}/relations",
            json={"targetNoteId": target_note["id"], "relationType": "prerequisite"},
            headers=self.auth_headers,
        )
        self.assertEqual(relation.status_code, 201)

        detail = self.client.get(f"/api/v1/notes/{source_note['id']}", headers=self.auth_headers)
        self.assertEqual(detail.status_code, 200)
        self.assertEqual(len(detail.json()["data"]["blocks"]), 1)
        self.assertEqual(len(detail.json()["data"]["relations"]), 1)

        tagged = self.client.get("/api/v1/notes?tag=math", headers=self.auth_headers)
        self.assertEqual(tagged.json()["pagination"]["total"], 1)

        card = self.client.post(
            "/api/v1/memory/cards",
            json={
                "sourceNoteId": source_note["id"],
                "front": "What does an eigenvector describe?",
                "back": "A direction preserved by a linear map.",
            },
            headers=self.auth_headers,
        )
        self.assertEqual(card.status_code, 201)
        card_id = card.json()["data"]["id"]

        due_cards = self.client.get("/api/v1/memory/cards", headers=self.auth_headers)
        self.assertEqual(due_cards.status_code, 200)
        self.assertEqual(due_cards.json()["pagination"]["total"], 1)

        review = self.client.post(
            f"/api/v1/memory/cards/{card_id}/reviews",
            json={"grade": "good"},
            headers=self.auth_headers,
        )
        self.assertEqual(review.status_code, 201)
        self.assertEqual(review.json()["data"]["intervalDays"], 2)

    def test_note_access_is_limited_to_owner(self) -> None:
        other_headers = self._login_headers("other@example.com", "secret123")
        note = self.client.post(
            "/api/v1/notes",
            json={"title": "Private"},
            headers=other_headers,
        ).json()["data"]

        response = self.client.get(f"/api/v1/notes/{note['id']}", headers=self.auth_headers)

        self.assertEqual(response.status_code, 404)

    def _seed_users(self) -> None:
        session = self.session_factory()
        try:
            users = [
                UserModel(
                    name="Zhang Yuxuan",
                    email="zhang@example.com",
                    role=UserRole.STUDENT,
                    password_hash=hash_password("secret123"),
                ),
                UserModel(
                    name="Other User",
                    email="other@example.com",
                    role=UserRole.STUDENT,
                    password_hash=hash_password("secret123"),
                ),
            ]
            session.add_all(users)
            session.commit()
        finally:
            session.close()

    def _login_headers(self, email: str, password: str) -> dict[str, str]:
        response = self.client.post("/api/v1/auth/login", json={"email": email, "password": password})
        self.assertEqual(response.status_code, 200)
        return {"Authorization": f"Bearer {response.json()['data']['accessToken']}"}


if __name__ == "__main__":
    unittest.main()
