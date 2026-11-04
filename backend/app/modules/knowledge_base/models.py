from __future__ import annotations

from sqlalchemy import ForeignKey, Integer, JSON, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.db.ids import new_prefixed_id
from app.db.mixins import OwnerMixin, SoftDeleteMixin, TimestampMixin


class KnowledgeChunkModel(Base, OwnerMixin, TimestampMixin, SoftDeleteMixin):
    """知识块：一篇笔记切成的若干语义片段，各带一个向量。"""

    __tablename__ = "knowledge_chunks"

    id: Mapped[str] = mapped_column(
        String(32),
        primary_key=True,
        default=lambda: new_prefixed_id("kchunk"),
    )
    source_note_id: Mapped[str | None] = mapped_column(
        String(32),
        ForeignKey("notes.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )
    # 整篇笔记文本的 hash：查询时比对，变了才重索引（增量索引的依据）
    source_hash: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    # 冗余笔记标题，检索结果直接可用，不用回表
    title: Mapped[str] = mapped_column(String(255), nullable=False, default="")
    content: Mapped[str] = mapped_column(String, nullable=False)
    position: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    # 向量（embedding provider 不可用时为 None，检索降级为关键词匹配）
    embedding: Mapped[list | None] = mapped_column(JSON, nullable=True)
