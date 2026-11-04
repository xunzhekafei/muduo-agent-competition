from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, JSON, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.db.ids import new_prefixed_id
from app.db.mixins import OwnerMixin, TimestampMixin
from app.db.types import enum_column
from app.schemas.enums import AiTaskStatus, AiTaskType


class AiTaskModel(Base, OwnerMixin, TimestampMixin):
    __tablename__ = "ai_tasks"

    id: Mapped[str] = mapped_column(
        String(32),
        primary_key=True,
        default=lambda: new_prefixed_id("task"),
    )
    task_type: Mapped[AiTaskType] = enum_column(AiTaskType, "type", nullable=False, index=True)
    status: Mapped[AiTaskStatus] = enum_column(
        AiTaskStatus,
        default=AiTaskStatus.QUEUED,
        index=True,
    )
    progress: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    course_id: Mapped[str | None] = mapped_column(
        String(32),
        ForeignKey("courses.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    resource_id: Mapped[str | None] = mapped_column(
        String(32),
        ForeignKey("resources.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    input_payload: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)
    output_payload: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    error_code: Mapped[str | None] = mapped_column(String(120), nullable=True)
    error_message: Mapped[str | None] = mapped_column(String(2000), nullable=True)
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    canceled_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


__all__ = ["AiTaskModel"]
