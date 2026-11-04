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


class ThinkingFeynmanApiTest(unittest.TestCase):
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

    def test_thinking_session_prompt_suggestion_and_close(self) -> None:
        note = self._create_note()
        session_response = self.client.post(
            "/api/v1/thinking/sessions",
            json={"noteId": note["id"], "goal": "Find reasoning gaps"},
            headers=self.auth_headers,
        )
        self.assertEqual(session_response.status_code, 201)
        session_id = session_response.json()["data"]["id"]

        prompt = self.client.post(
            f"/api/v1/thinking/sessions/{session_id}/prompts",
            json={"promptType": "socratic", "content": "What assumption supports this?"},
            headers=self.auth_headers,
        )
        self.assertEqual(prompt.status_code, 201)

        suggestion = self.client.post(
            f"/api/v1/thinking/sessions/{session_id}/suggestions",
            json={"summary": "Add the missing assumption.", "suggestedBlocks": ["Continuity is required."]},
            headers=self.auth_headers,
        )
        self.assertEqual(suggestion.status_code, 201)

        completed = self.client.post(
            f"/api/v1/thinking/sessions/{session_id}/complete",
            headers=self.auth_headers,
        )
        self.assertEqual(completed.status_code, 200)
        self.assertEqual(completed.json()["data"]["status"], "completed")

        rejected = self.client.post(
            f"/api/v1/thinking/sessions/{session_id}/prompts",
            json={"content": "Too late"},
            headers=self.auth_headers,
        )
        self.assertEqual(rejected.status_code, 422)

    def test_feynman_session_question_and_evaluation_flow(self) -> None:
        note = self._create_note()
        session_response = self.client.post(
            "/api/v1/feynman/sessions",
            json={
                "noteId": note["id"],
                "conceptName": "Derivative",
                "explanation": "A derivative is local rate of change.",
            },
            headers=self.auth_headers,
        )
        self.assertEqual(session_response.status_code, 201)
        session_id = session_response.json()["data"]["id"]

        question = self.client.post(
            f"/api/v1/feynman/sessions/{session_id}/questions",
            json={"question": "Can you give a concrete example?"},
            headers=self.auth_headers,
        )
        self.assertEqual(question.status_code, 201)

        evaluation = self.client.post(
            f"/api/v1/feynman/sessions/{session_id}/evaluation",
            json={
                "score": 82,
                "feedback": "Clear enough for first pass.",
                "followUpQuestions": ["What happens at a corner?"],
            },
            headers=self.auth_headers,
        )
        self.assertEqual(evaluation.status_code, 201)

        detail = self.client.get(f"/api/v1/feynman/sessions/{session_id}", headers=self.auth_headers)
        self.assertEqual(detail.status_code, 200)
        self.assertEqual(len(detail.json()["data"]["questions"]), 1)
        self.assertEqual(detail.json()["data"]["evaluation"]["score"], 82)

    def _create_note(self) -> dict:
        response = self.client.post(
            "/api/v1/notes",
            json={"title": "Calculus note"},
            headers=self.auth_headers,
        )
        self.assertEqual(response.status_code, 201)
        return response.json()["data"]

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


if __name__ == "__main__":
    unittest.main()
