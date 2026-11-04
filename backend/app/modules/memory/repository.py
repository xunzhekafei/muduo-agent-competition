from __future__ import annotations

from sqlalchemy.orm import Session

from app.modules.memory.service import MemoryService


def build_memory_service(db: Session) -> MemoryService:
    return MemoryService(db)
