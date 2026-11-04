from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, JSON, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.db.ids import new_prefixed_id
from app.db.mixins import OwnerMixin, SoftDeleteMixin, TimestampMixin, utc_now
from app.db.types import enum_column
from app.schemas.enums import MemoryCardStatus, ReviewGrade


class MemoryCardModel(Base, OwnerMixin, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "memory_cards"

    id: Mapped[str] = mapped_column(
        String(32),
        primary_key=True,
        default=lambda: new_prefixed_id("card"),
    )
    source_note_id: Mapped[str | None] = mapped_column(
        String(32),
        ForeignKey("notes.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    front: Mapped[str] = mapped_column(String, nullable=False)
    back: Mapped[str] = mapped_column(String, nullable=False)
    tags: Mapped[list[str]] = mapped_column(JSON, nullable=False, default=list)
    status: Mapped[MemoryCardStatus] = enum_column(
        MemoryCardStatus,
        default=MemoryCardStatus.ACTIVE,
        index=True,
    )
    interval_days: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    ease_factor: Mapped[float] = mapped_column(default=2.5, nullable=False)
    due_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=utc_now,
        nullable=False,
        index=True,
    )


class ReviewRecordModel(Base, OwnerMixin, TimestampMixin):
    __tablename__ = "review_records"

    id: Mapped[str] = mapped_column(
        String(32),
        primary_key=True,
        default=lambda: new_prefixed_id("review"),
    )
    card_id: Mapped[str] = mapped_column(
        String(32),
        ForeignKey("memory_cards.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    grade: Mapped[ReviewGrade] = enum_column(ReviewGrade, nullable=False, index=True)
    reviewed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    next_due_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    interval_days: Mapped[int] = mapped_column(Integer, nullable=False)


__all__ = ["MemoryCardModel", "ReviewRecordModel"]
