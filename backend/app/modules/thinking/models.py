from __future__ import annotations

from sqlalchemy import ForeignKey, JSON, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.db.ids import new_prefixed_id
from app.db.mixins import OwnerMixin, TimestampMixin
from app.db.types import enum_column
from app.schemas.enums import ThinkingPromptType, ThinkingSessionStatus


class ThinkingSessionModel(Base, OwnerMixin, TimestampMixin):
    __tablename__ = "thinking_sessions"

    id: Mapped[str] = mapped_column(
        String(32),
        primary_key=True,
        default=lambda: new_prefixed_id("think"),
    )
    note_id: Mapped[str] = mapped_column(
        String(32),
        ForeignKey("notes.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    goal: Mapped[str] = mapped_column(String(1000), nullable=False)
    status: Mapped[ThinkingSessionStatus] = enum_column(
        ThinkingSessionStatus,
        default=ThinkingSessionStatus.ACTIVE,
        index=True,
    )

    prompts: Mapped[list["ThinkingPromptModel"]] = relationship(
        back_populates="session",
        cascade="all, delete-orphan",
        order_by="ThinkingPromptModel.created_at",
    )
    suggestions: Mapped[list["RevisionSuggestionModel"]] = relationship(
        back_populates="session",
        cascade="all, delete-orphan",
        order_by="RevisionSuggestionModel.created_at",
    )


class ThinkingPromptModel(Base, TimestampMixin):
    __tablename__ = "thinking_prompts"

    id: Mapped[str] = mapped_column(
        String(32),
        primary_key=True,
        default=lambda: new_prefixed_id("prompt"),
    )
    session_id: Mapped[str] = mapped_column(
        String(32),
        ForeignKey("thinking_sessions.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    prompt_type: Mapped[ThinkingPromptType] = enum_column(
        ThinkingPromptType,
        "type",
        default=ThinkingPromptType.SOCRATIC,
        nullable=False,
    )
    content: Mapped[str] = mapped_column(String, nullable=False)

    session: Mapped[ThinkingSessionModel] = relationship(back_populates="prompts")


class RevisionSuggestionModel(Base, TimestampMixin):
    __tablename__ = "revision_suggestions"

    id: Mapped[str] = mapped_column(
        String(32),
        primary_key=True,
        default=lambda: new_prefixed_id("revision"),
    )
    session_id: Mapped[str] = mapped_column(
        String(32),
        ForeignKey("thinking_sessions.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    note_id: Mapped[str] = mapped_column(
        String(32),
        ForeignKey("notes.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    summary: Mapped[str] = mapped_column(String(2000), nullable=False)
    suggested_blocks: Mapped[list[str]] = mapped_column(JSON, nullable=False, default=list)

    session: Mapped[ThinkingSessionModel] = relationship(back_populates="suggestions")


__all__ = ["RevisionSuggestionModel", "ThinkingPromptModel", "ThinkingSessionModel"]
