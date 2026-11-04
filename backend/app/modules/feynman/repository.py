from __future__ import annotations

from sqlalchemy.orm import Session

from app.modules.feynman.service import FeynmanService


def build_feynman_service(db: Session) -> FeynmanService:
    return FeynmanService(db)
