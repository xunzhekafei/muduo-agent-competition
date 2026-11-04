"""Agent 工具测试 —— 13 个工具的实现与注册表（离线跑，不调 LLM）"""

from __future__ import annotations

import re
import unittest

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

import app.db.models  # noqa: F401
from app.agent.schemas import TOOL_DEFINITIONS, TOOL_NAMES
from app.agent.tools import TOOL_IMPLS, run_tool
from app.db import Base
from app.modules.memory.models import MemoryCardModel
from app.modules.notes.models import NoteModel


class AgentToolsTestCase(unittest.TestCase):
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

    # ---- 造数据 ----

    def _add_note(self, title: str = "测试笔记", mastery: int | None = None) -> NoteModel:
        note = NoteModel(owner_id=self.user_id, title=title, mastery=mastery)
        self.db.add(note)
        self.db.commit()
        return note

    def _add_card(self, front: str = "问", back: str = "答") -> MemoryCardModel:
        card = MemoryCardModel(owner_id=self.user_id, front=front, back=back)
        self.db.add(card)
        self.db.commit()
        return card

    def _call(self, name: str, **args) -> str:
        return run_tool(name, args, db=self.db, user_id=self.user_id)


class TestRegistry(AgentToolsTestCase):
    def test_schema_and_impls_aligned(self) -> None:
        """TOOL_DEFINITIONS 与 TOOL_IMPLS 必须一一对应（14 个）。"""
        self.assertEqual(len(TOOL_DEFINITIONS), 14)
        self.assertEqual(set(TOOL_NAMES), set(TOOL_IMPLS))

    def test_unknown_tool_message(self) -> None:
        output = self._call("no_such_tool")
        self.assertIn("不存在", output)

    def test_unknown_args_filtered(self) -> None:
        """模型多传的参数应被过滤而不是报 TypeError。"""
        output = self._call("list_courses", hallucinated_arg="x")
        self.assertNotIn("TypeError", output)


class TestFeynmanTools(AgentToolsTestCase):
    def test_full_flow(self) -> None:
        note = self._add_note("操作系统笔记")
        created = self._call(
            "run_feynman",
            concept_name="进程与线程",
            explanation="进程是资源分配的单位，线程是调度的单位",
            note_id=note.id,
        )
        self.assertIn("费曼会话已开始", created)
        match = re.search(r"sessionId=(\w+)", created)
        self.assertIsNotNone(match)
        session_id = match.group(1)

        asked = self._call(
            "feynman_add_question", session_id=session_id, question="为什么线程切换比进程快？"
        )
        self.assertIn("追问已记录", asked)

        evaluated = self._call(
            "evaluate_feynman",
            session_id=session_id,
            score=85,
            feedback="框架正确，但没讲清切换开销的来源",
            follow_up_questions=["解释进程切换时 TLB 失效的代价"],
        )
        self.assertIn("score=85/100", evaluated)
        self.assertIn("TLB", evaluated)

    def test_missing_explanation_is_tool_error(self) -> None:
        output = self._call("run_feynman", concept_name="X", explanation="")
        self.assertIn("工具执行失败", output)


class TestThinkingTools(AgentToolsTestCase):
    def test_ask_question(self) -> None:
        note = self._add_note()
        output = self._call(
            "ask_thinking_question",
            note_id=note.id,
            goal="弄清虚拟内存存在的原因",
            question="如果内存无限大还需要虚拟内存吗？",
        )
        self.assertIn("思考会话已开始", output)
        self.assertIn("socratic", output)

    def test_invalid_prompt_type(self) -> None:
        note = self._add_note()
        output = self._call(
            "ask_thinking_question",
            note_id=note.id,
            goal="g",
            question="q",
            prompt_type="wrong_type",
        )
        self.assertIn("工具执行失败", output)

    def test_missing_note_id(self) -> None:
        output = self._call(
            "ask_thinking_question", note_id="", goal="g", question="q"
        )
        self.assertIn("工具执行失败", output)


class TestReviewTools(AgentToolsTestCase):
    def test_schedule_review_updates_card(self) -> None:
        card = self._add_card()
        output = self._call("schedule_review", card_id=card.id, grade="good")
        self.assertIn("已记录复习", output)
        self.assertIn("下次到期", output)
        self.db.refresh(card)
        self.assertGreater(card.interval_days, 0)

    def test_again_grade_resets_interval(self) -> None:
        card = self._add_card()
        card.interval_days = 10
        self.db.commit()
        self._call("schedule_review", card_id=card.id, grade="again")
        self.db.refresh(card)
        self.assertLessEqual(card.interval_days, 1)

    def test_invalid_grade(self) -> None:
        card = self._add_card()
        output = self._call("schedule_review", card_id=card.id, grade="meh")
        self.assertIn("工具执行失败", output)


class TestMasteryTool(AgentToolsTestCase):
    def test_weak_first_and_summary(self) -> None:
        self._add_note("薄弱的课", mastery=20)
        self._add_note("熟练的课", mastery=90)
        self._add_note("没标注的课")
        output = self._call("get_mastery")
        self.assertLess(output.index("薄弱的课"), output.index("熟练的课"))
        self.assertIn("薄弱笔记 2 篇", output)

    def test_empty(self) -> None:
        output = self._call("get_mastery")
        self.assertIn("还没有任何笔记", output)


if __name__ == "__main__":
    unittest.main()
