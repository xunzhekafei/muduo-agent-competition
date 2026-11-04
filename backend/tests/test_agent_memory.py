"""Agent 长期记忆测试 —— build_learning_context 的状态摘要（离线跑）"""

from __future__ import annotations

import unittest

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

import app.db.models  # noqa: F401
from app.agent.memory import build_learning_context
from app.db import Base
from app.modules.feynman.models import FeynmanEvaluationModel, FeynmanSessionModel
from app.modules.memory.models import MemoryCardModel
from app.modules.notes.models import NoteModel
from app.modules.thinking.models import ThinkingSessionModel
from app.schemas.enums import FeynmanSessionStatus, MemoryCardStatus


class AgentMemoryTest(unittest.TestCase):
    def setUp(self) -> None:
        self.engine = create_engine(
            "sqlite+pysqlite:///:memory:",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        Base.metadata.create_all(self.engine)
        self.db = sessionmaker(
            bind=self.engine, autoflush=False, expire_on_commit=False
        )()
        self.user_id = "user_test"

    def tearDown(self) -> None:
        self.db.close()
        self.engine.dispose()

    def test_empty_user_returns_empty(self) -> None:
        self.assertEqual(build_learning_context(self.db, self.user_id), "")

    def test_context_contains_state_summary(self) -> None:
        # 两篇笔记：一篇薄弱、一篇熟练
        weak = NoteModel(owner_id=self.user_id, title="死锁问题", mastery=25)
        strong = NoteModel(owner_id=self.user_id, title="进程管理", mastery=90)
        self.db.add_all([weak, strong])
        self.db.flush()

        # 两张到期卡片
        self.db.add_all(
            [
                MemoryCardModel(owner_id=self.user_id, front="f1", back="b1"),
                MemoryCardModel(owner_id=self.user_id, front="f2", back="b2"),
            ]
        )

        # 一次费曼练习 + 评分
        session = FeynmanSessionModel(
            owner_id=self.user_id,
            concept_name="进程与线程",
            explanation="……",
            status=FeynmanSessionStatus.EVALUATED,
        )
        self.db.add(session)
        self.db.flush()
        self.db.add(
            FeynmanEvaluationModel(session_id=session.id, score=82, feedback="不错")
        )

        # 一次思考练习
        self.db.add(
            ThinkingSessionModel(
                owner_id=self.user_id, note_id=strong.id, goal="弄清调度机制"
            )
        )
        self.db.commit()

        context = build_learning_context(self.db, self.user_id)

        self.assertIn("学习者当前状态", context)
        self.assertIn("死锁问题", context)          # 薄弱笔记被点名
        self.assertIn("掌握度 25", context)
        self.assertNotIn("进程管理", context.split("薄弱")[0])  # 熟练笔记不进薄弱清单
        self.assertIn("2 张已到期待复习", context)
        self.assertIn("进程与线程", context)        # 最近费曼
        self.assertIn("评分 82", context)
        self.assertIn("弄清调度机制", context)      # 最近思考

    def test_weak_notes_capped_at_five(self) -> None:
        for i in range(8):
            self.db.add(NoteModel(owner_id=self.user_id, title=f"薄弱{i}", mastery=10))
        self.db.commit()
        context = build_learning_context(self.db, self.user_id)
        self.assertIn("薄弱0", context)
        self.assertNotIn("薄弱5", context)  # 最多列 5 篇


if __name__ == "__main__":
    unittest.main()
