from __future__ import annotations

from sqlalchemy import ForeignKey, Integer, JSON, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.db.ids import new_prefixed_id
from app.db.mixins import OwnerMixin, TimestampMixin
from app.db.types import enum_column
from app.schemas.enums import FeynmanSessionStatus


class FeynmanSessionModel(Base, OwnerMixin, TimestampMixin):
    __tablename__ = "feynman_sessions"

    id: Mapped[str] = mapped_column(
        String(32),
        primary_key=True,
        default=lambda: new_prefixed_id("feynman"),
    )
    concept_id: Mapped[str | None] = mapped_column(
        String(32),
        ForeignKey("concepts.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    note_id: Mapped[str | None] = mapped_column(
        String(32),
        ForeignKey("notes.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    concept_name: Mapped[str] = mapped_column(String(255), nullable=False)
    explanation: Mapped[str] = mapped_column(String, nullable=False)
    status: Mapped[FeynmanSessionStatus] = enum_column(
        FeynmanSessionStatus,
        default=FeynmanSessionStatus.ACTIVE,
        index=True,
    )

    questions: Mapped[list["FeynmanQuestionModel"]] = relationship(
        back_populates="session",
        cascade="all, delete-orphan",
        order_by="FeynmanQuestionModel.created_at",
    )
    evaluation: Mapped["FeynmanEvaluationModel | None"] = relationship(
        back_populates="session",
        cascade="all, delete-orphan",
        uselist=False,
    )


class FeynmanQuestionModel(Base, TimestampMixin):
    __tablename__ = "feynman_questions"

    id: Mapped[str] = mapped_column(
        String(32),
        primary_key=True,
        default=lambda: new_prefixed_id("fq"),
    )
    session_id: Mapped[str] = mapped_column(
        String(32),
        ForeignKey("feynman_sessions.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    question: Mapped[str] = mapped_column(String(1000), nullable=False)

    session: Mapped[FeynmanSessionModel] = relationship(back_populates="questions")


class FeynmanEvaluationModel(Base, TimestampMixin):
    __tablename__ = "feynman_evaluations"

    id: Mapped[str] = mapped_column(
        String(32),
        primary_key=True,
        default=lambda: new_prefixed_id("feval"),
    )
    session_id: Mapped[str] = mapped_column(
        String(32),
        ForeignKey("feynman_sessions.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True,
    )
    score: Mapped[int] = mapped_column(Integer, nullable=False)
    feedback: Mapped[str] = mapped_column(String(2000), nullable=False)
    follow_up_questions: Mapped[list[str]] = mapped_column(JSON, nullable=False, default=list)

    session: Mapped[FeynmanSessionModel] = relationship(back_populates="evaluation")


__all__ = ["FeynmanEvaluationModel", "FeynmanQuestionModel", "FeynmanSessionModel"]
