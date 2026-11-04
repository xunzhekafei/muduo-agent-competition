"""知识库运维接口。

POST /knowledge-base/reindex  —— 全量重建当前用户的笔记索引
GET  /knowledge-base/status   —— 知识块数量、向量覆盖率、embedding provider
"""

from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.auth import get_current_user
from app.core.responses import data_response
from app.db.session import get_db_session
from app.modules.users.models import UserModel

router = APIRouter(prefix="/knowledge-base", tags=["knowledge-base"])


@router.post("/reindex")
def reindex(
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db_session),
):
    from app.modules.knowledge_base.indexer import index_all_notes

    return data_response(index_all_notes(db, current_user.id))


@router.get("/status")
def status(
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db_session),
):
    from app.integrations.registry import get_embedding_provider
    from app.modules.knowledge_base.models import KnowledgeChunkModel

    base = select(func.count()).select_from(KnowledgeChunkModel).where(
        KnowledgeChunkModel.owner_id == current_user.id,
        KnowledgeChunkModel.deleted_at.is_(None),
    )
    total = db.execute(base).scalar_one()
    embedded = db.execute(
        base.where(KnowledgeChunkModel.embedding.is_not(None))
    ).scalar_one()

    return data_response(
        {
            "chunks": total,
            "embedded": embedded,
            "provider": getattr(get_embedding_provider(), "provider_name", "unknown"),
        }
    )
