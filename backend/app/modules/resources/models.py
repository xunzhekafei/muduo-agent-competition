from __future__ import annotations

from sqlalchemy import ForeignKey, Integer, JSON, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.db.ids import new_prefixed_id
from app.db.mixins import OwnerMixin, SoftDeleteMixin, TimestampMixin
from app.db.types import enum_column
from app.schemas.enums import ResourceStatus, ResourceType


class ResourceModel(Base, OwnerMixin, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "resources"

    id: Mapped[str] = mapped_column(
        String(32),
        primary_key=True,
        default=lambda: new_prefixed_id("res"),
    )
    course_id: Mapped[str] = mapped_column(
        String(32),
        ForeignKey("courses.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    learning_space_id: Mapped[str | None] = mapped_column(
        String(32),
        ForeignKey("learning_spaces.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    resource_type: Mapped[ResourceType] = enum_column(ResourceType, "type", nullable=False)
    status: Mapped[ResourceStatus] = enum_column(
        ResourceStatus,
        default=ResourceStatus.UPLOADED,
        index=True,
    )
    size_bytes: Mapped[int | None] = mapped_column(Integer, nullable=True)
    source_url: Mapped[str | None] = mapped_column(String(2000), nullable=True)
    storage_key: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    parse_task_id: Mapped[str | None] = mapped_column(String(32), nullable=True, index=True)

    parsed_result: Mapped["ParsedResourceModel | None"] = relationship(
        back_populates="resource",
        cascade="all, delete-orphan",
        uselist=False,
    )


class ParsedResourceModel(Base, OwnerMixin, TimestampMixin):
    __tablename__ = "parsed_resources"
    __table_args__ = (UniqueConstraint("resource_id", name="uq_parsed_resources_resource_id"),)

    id: Mapped[str] = mapped_column(
        String(32),
        primary_key=True,
        default=lambda: new_prefixed_id("parsed"),
    )
    resource_id: Mapped[str] = mapped_column(
        String(32),
        ForeignKey("resources.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    core_concepts: Mapped[list[str]] = mapped_column(JSON, nullable=False, default=list)
    note_draft_id: Mapped[str | None] = mapped_column(String(32), nullable=True, index=True)
    raw_text: Mapped[str | None] = mapped_column(String, nullable=True)
    parser_version: Mapped[str | None] = mapped_column(String(64), nullable=True)

    resource: Mapped[ResourceModel] = relationship(back_populates="parsed_result")
    chapters: Mapped[list["ParsedResourceChapterModel"]] = relationship(
        back_populates="parsed_resource",
        cascade="all, delete-orphan",
    )


class ParsedResourceChapterModel(Base, TimestampMixin):
    __tablename__ = "parsed_resource_chapters"

    id: Mapped[str] = mapped_column(
        String(32),
        primary_key=True,
        default=lambda: new_prefixed_id("chapter"),
    )
    parsed_resource_id: Mapped[str] = mapped_column(
        String(32),
        ForeignKey("parsed_resources.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    position: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    content: Mapped[str] = mapped_column(String, nullable=False)

    parsed_resource: Mapped[ParsedResourceModel] = relationship(back_populates="chapters")


__all__ = ["ParsedResourceChapterModel", "ParsedResourceModel", "ResourceModel"]
