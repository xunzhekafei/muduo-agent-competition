from __future__ import annotations

from sqlalchemy import ForeignKey, Integer, JSON, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.db.ids import new_prefixed_id
from app.db.mixins import OwnerMixin, SoftDeleteMixin, TimestampMixin
from app.db.types import enum_column
from app.schemas.enums import NoteBlockType, NoteRelationType, NoteStatus


class NoteModel(Base, OwnerMixin, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "notes"

    id: Mapped[str] = mapped_column(
        String(32),
        primary_key=True,
        default=lambda: new_prefixed_id("note"),
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    course_id: Mapped[str | None] = mapped_column(
        String(32),
        ForeignKey("courses.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    learning_space_id: Mapped[str | None] = mapped_column(
        String(32),
        ForeignKey("learning_spaces.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    status: Mapped[NoteStatus] = enum_column(
        NoteStatus,
        default=NoteStatus.ACTIVE,
        index=True,
    )
    mastery: Mapped[int | None] = mapped_column(Integer, nullable=True, default=None)
    tags: Mapped[list[str]] = mapped_column(JSON, nullable=False, default=list)
    source_resource_id: Mapped[str | None] = mapped_column(
        String(32),
        ForeignKey("resources.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    note_type: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="manual",
        index=True,
        comment="笔记来源: manual|quick_text|quick_timeline|resource_import|thinking|feynman",
    )

    blocks: Mapped[list["NoteBlockModel"]] = relationship(
        back_populates="note",
        cascade="all, delete-orphan",
        order_by="NoteBlockModel.position",
    )


class NoteBlockModel(Base, TimestampMixin):
    __tablename__ = "note_blocks"

    id: Mapped[str] = mapped_column(
        String(32),
        primary_key=True,
        default=lambda: new_prefixed_id("block"),
    )
    note_id: Mapped[str] = mapped_column(
        String(32),
        ForeignKey("notes.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    block_type: Mapped[NoteBlockType] = enum_column(
        NoteBlockType,
        "type",
        default=NoteBlockType.PARAGRAPH,
        nullable=False,
    )
    content: Mapped[str] = mapped_column(String, nullable=False)
    position: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    block_metadata: Mapped[dict] = mapped_column("metadata", JSON, nullable=False, default=dict)

    note: Mapped[NoteModel] = relationship(back_populates="blocks")


class NoteRelationModel(Base, OwnerMixin, TimestampMixin):
    __tablename__ = "note_relations"

    id: Mapped[str] = mapped_column(
        String(32),
        primary_key=True,
        default=lambda: new_prefixed_id("rel"),
    )
    source_note_id: Mapped[str] = mapped_column(
        String(32),
        ForeignKey("notes.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    target_note_id: Mapped[str] = mapped_column(
        String(32),
        ForeignKey("notes.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    relation_type: Mapped[NoteRelationType] = enum_column(
        NoteRelationType,
        "type",
        default=NoteRelationType.RELATED,
        nullable=False,
        index=True,
    )
    context: Mapped[str | None] = mapped_column(String(2000), nullable=True)


__all__ = ["NoteBlockModel", "NoteModel", "NoteRelationModel"]
