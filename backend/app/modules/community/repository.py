from __future__ import annotations

from sqlalchemy.orm import Session

from app.modules.community.service import CommunityService


def build_community_service(db: Session) -> CommunityService:
    return CommunityService(db)
