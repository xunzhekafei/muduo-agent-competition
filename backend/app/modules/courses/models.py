from __future__ import annotations

from sqlalchemy import ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.db.ids import new_prefixed_id
from app.db.mixins import OwnerMixin, SoftDeleteMixin, TimestampMixin


class CourseModel(Base, OwnerMixin, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "courses"

    id: Mapped[str] = mapped_column(
        String(32),
        primary_key=True,
        default=lambda: new_prefixed_id("course"),
    )
    name: Mapped[str] = mapped_column(String(160), nullable=False)
    subject: Mapped[str] = mapped_column(String(120), nullable=False, index=True)
    description: Mapped[str | None] = mapped_column(String(2000), nullable=True)

    learning_spaces: Mapped[list["LearningSpaceModel"]] = relationship(
        back_populates="course",
        cascade="all, delete-orphan",
    )


class LearningSpaceModel(Base, OwnerMixin, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "learning_spaces"

    id: Mapped[str] = mapped_column(
        String(32),
        primary_key=True,
        default=lambda: new_prefixed_id("space"),
    )
    course_id: Mapped[str] = mapped_column(
        String(32),
        ForeignKey("courses.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    parent_id: Mapped[str | None] = mapped_column(
        String(32),
        ForeignKey("learning_spaces.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    name: Mapped[str] = mapped_column(String(160), nullable=False)
    description: Mapped[str | None] = mapped_column(String(2000), nullable=True)
    position: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    course: Mapped[CourseModel] = relationship(back_populates="learning_spaces")


__all__ = ["CourseModel", "LearningSpaceModel"]
