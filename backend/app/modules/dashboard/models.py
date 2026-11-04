from __future__ import annotations

from datetime import date

from sqlalchemy import Date, Float, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.db.ids import new_prefixed_id
from app.db.mixins import OwnerMixin, TimestampMixin
from app.db.types import enum_column
from app.schemas.enums import DashboardTaskMode


class LearningActivityModel(Base, OwnerMixin, TimestampMixin):
    __tablename__ = "learning_activities"

    id: Mapped[str] = mapped_column(
        String(32),
        primary_key=True,
        default=lambda: new_prefixed_id("act"),
    )
    action: Mapped[str] = mapped_column(String(500), nullable=False)
    course_name: Mapped[str] = mapped_column(String(160), nullable=False)
    mode: Mapped[DashboardTaskMode] = enum_column(
        DashboardTaskMode,
        "mode",
        default=DashboardTaskMode.QUICK,
        nullable=False,
    )


class StudyLogModel(Base, OwnerMixin):
    __tablename__ = "study_logs"
    __table_args__ = (UniqueConstraint("owner_id", "log_date", "mode", name="uq_study_logs_owner_date_mode"),)

    id: Mapped[str] = mapped_column(
        String(32),
        primary_key=True,
        default=lambda: new_prefixed_id("study"),
    )
    log_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    mode: Mapped[DashboardTaskMode] = enum_column(
        DashboardTaskMode,
        "mode",
        default=DashboardTaskMode.QUICK,
        nullable=False,
    )
    duration_minutes: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)


__all__ = ["LearningActivityModel", "StudyLogModel"]
