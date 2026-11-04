"""知识库测试 —— 分块 / 增量索引 / 检索降级（离线跑，mock embedding）"""

from __future__ import annotations

import unittest

from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

import app.db.models  # noqa: F401
from app.db import Base
from app.modules.knowledge_base.indexer import (
    chunk_text,
    ensure_indexed,
    index_all_notes,
    index_note,
)
from app.modules.knowledge_base.models import KnowledgeChunkModel
from app.modules.knowledge_base.retriever import search_chunks
from app.modules.notes.models import NoteBlockModel, NoteModel


class KnowledgeBaseTestCase(unittest.TestCase):
    def setUp(self) -> None:
        # 强制 mock embedding：测试必须离线确定，不受 .env 里的真实 provider 影响
        from unittest.mock import patch

        from app.integrations.embedding import MockEmbeddingProvider

        patcher = patch(
            "app.integrations.registry.get_embedding_provider",
            return_value=MockEmbeddingProvider(),
        )
        patcher.start()
        self.addCleanup(patcher.stop)

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

    def _add_note(self, title: str, *blocks: str) -> NoteModel:
        note = NoteModel(owner_id=self.user_id, title=title)
        self.db.add(note)
        self.db.flush()
        for position, content in enumerate(blocks):
            self.db.add(
                NoteBlockModel(note_id=note.id, content=content, position=position)
            )
        self.db.commit()
        return note


class TestChunkText(unittest.TestCase):
    def test_empty(self) -> None:
        self.assertEqual(chunk_text(""), [])
        self.assertEqual(chunk_text("   "), [])

    def test_short_stays_whole(self) -> None:
        self.assertEqual(chunk_text("短文本"), ["短文本"])

    def test_long_is_splitted_with_overlap(self) -> None:
        text = "甲" * 1000
        chunks = chunk_text(text, size=400, overlap=60)
        self.assertEqual([len(c) for c in chunks], [400, 400, 320])  # 0-400 / 340-740 / 680-1000
        # 相邻块有重叠
        self.assertTrue(chunks[1].startswith("甲" * 340))


class TestIndexer(KnowledgeBaseTestCase):
    def test_index_note_creates_chunks(self) -> None:
        note = self._add_note("操作系统", "进程是资源分配的单位。" * 50, "线程是调度的单位。" * 50)
        result = index_note(self.db, self.user_id, note.id)
        self.assertGreaterEqual(result["chunks"], 2)
        self.assertEqual(result["title"], "操作系统")

        rows = self.db.execute(
            select(KnowledgeChunkModel).where(
                KnowledgeChunkModel.source_note_id == note.id
            )
        ).scalars().all()
        self.assertEqual(len(rows), result["chunks"])
        self.assertTrue(all(r.title == "操作系统" for r in rows))
        # mock provider：不产向量，检索层降级关键词
        self.assertTrue(all(r.embedding is None for r in rows))

    def test_ensure_indexed_skips_unchanged(self) -> None:
        self._add_note("笔记A", "内容甲")
        first = ensure_indexed(self.db, self.user_id)
        self.assertEqual(first["reindexed"], 1)
        second = ensure_indexed(self.db, self.user_id)
        self.assertEqual(second["reindexed"], 0)

    def test_ensure_indexed_reindexes_changed_note(self) -> None:
        note = self._add_note("笔记B", "原始内容")
        ensure_indexed(self.db, self.user_id)
        self.db.add(NoteBlockModel(note_id=note.id, content="新增内容", position=1))
        self.db.commit()
        result = ensure_indexed(self.db, self.user_id)
        self.assertEqual(result["reindexed"], 1)

    def test_index_all_and_missing_note(self) -> None:
        self._add_note("笔记C", "内容一")
        self._add_note("笔记D", "内容二")
        totals = index_all_notes(self.db, self.user_id)
        self.assertEqual(totals["notes"], 2)
        self.assertGreaterEqual(totals["chunks"], 2)
        missing = index_note(self.db, self.user_id, "note_nope")
        self.assertIn("不存在", missing.get("error", ""))


class TestRetriever(KnowledgeBaseTestCase):
    def test_keyword_fallback_finds_relevant_chunk(self) -> None:
        self._add_note("死锁笔记", "死锁的四个必要条件是互斥、占有且等待、不可剥夺、循环等待。")
        self._add_note("极限笔记", "极限的ε-δ定义刻画了函数趋近的过程。")
        hits = search_chunks(self.db, self.user_id, "死锁的必要条件")
        self.assertTrue(hits)
        self.assertEqual(hits[0]["title"], "死锁笔记")
        self.assertEqual(hits[0]["via"], "keyword")

    def test_empty_query_and_empty_kb(self) -> None:
        self.assertEqual(search_chunks(self.db, self.user_id, ""), [])
        self.assertEqual(search_chunks(self.db, self.user_id, "任意问题"), [])

    def test_search_knowledge_tool_output(self) -> None:
        from app.agent.tools import run_tool

        self._add_note("TCP笔记", "TCP三次握手用于建立可靠连接。")
        output = run_tool(
            "search_knowledge", {"query": "三次握手"}, db=self.db, user_id=self.user_id
        )
        self.assertIn("知识库命中", output)
        self.assertIn("TCP笔记", output)


if __name__ == "__main__":
    unittest.main()
