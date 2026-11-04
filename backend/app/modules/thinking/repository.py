from __future__ import annotations

from sqlalchemy.orm import Session

from app.modules.thinking.service import ThinkingService


def build_thinking_service(db: Session) -> ThinkingService:
    return ThinkingService(db)
