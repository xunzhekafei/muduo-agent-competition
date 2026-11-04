from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.db.ids import new_prefixed_id
from app.db.mixins import TimestampMixin
from app.modules.users.models import UserModel


class AuthSessionModel(Base, TimestampMixin):
    __tablename__ = "auth_sessions"

    id: Mapped[str] = mapped_column(
        String(32),
        primary_key=True,
        default=lambda: new_prefixed_id("sess"),
    )
    user_id: Mapped[str] = mapped_column(
        String(32),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    refresh_token_hash: Mapped[str] = mapped_column(String(255), nullable=False, unique=True)
    user_agent: Mapped[str | None] = mapped_column(String(500), nullable=True)
    ip_address: Mapped[str | None] = mapped_column(String(64), nullable=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    user: Mapped[UserModel] = relationship()

    @property
    def is_revoked(self) -> bool:
        return self.revoked_at is not None


__all__ = ["AuthSessionModel"]
