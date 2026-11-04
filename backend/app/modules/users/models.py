from __future__ import annotations

from sqlalchemy import Boolean, ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.db.ids import new_prefixed_id
from app.db.mixins import SoftDeleteMixin, TimestampMixin
from app.db.types import enum_column
from app.schemas.enums import AiGuidanceLevel, ThemePreference, UserRole


class UserModel(Base, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(
        String(32),
        primary_key=True,
        default=lambda: new_prefixed_id("user"),
    )
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    email: Mapped[str] = mapped_column(String(255), nullable=False, unique=True, index=True)
    password_hash: Mapped[str | None] = mapped_column(String(255), nullable=True)
    avatar_url: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    role: Mapped[UserRole] = enum_column(UserRole, default=UserRole.STUDENT)

    preferences: Mapped["UserPreferenceModel | None"] = relationship(
        back_populates="user",
        cascade="all, delete-orphan",
        uselist=False,
    )


class UserPreferenceModel(Base, TimestampMixin):
    __tablename__ = "user_preferences"
    __table_args__ = (UniqueConstraint("user_id", name="uq_user_preferences_user_id"),)

    id: Mapped[str] = mapped_column(
        String(32),
        primary_key=True,
        default=lambda: new_prefixed_id("pref"),
    )
    user_id: Mapped[str] = mapped_column(
        String(32),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    theme: Mapped[ThemePreference] = enum_column(ThemePreference, default=ThemePreference.SYSTEM)
    language: Mapped[str] = mapped_column(String(16), nullable=False, default="zh-CN")
    daily_review_reminder: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    reminder_time: Mapped[str | None] = mapped_column(String(16), nullable=True)
    ai_guidance_level: Mapped[AiGuidanceLevel] = enum_column(
        AiGuidanceLevel,
        default=AiGuidanceLevel.BALANCED,
    )

    user: Mapped[UserModel] = relationship(back_populates="preferences")


__all__ = ["UserModel", "UserPreferenceModel"]
