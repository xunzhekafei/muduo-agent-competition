from __future__ import annotations

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.auth import get_current_user
from app.core.responses import data_response
from app.db.session import get_db_session
from app.modules.knowledge_graph.service import KnowledgeGraphService
from app.modules.users.models import UserModel
from app.schemas.knowledge_graph import (
    ConceptRelationCreateRequest,
    ConceptUpsertRequest,
    MasteryStateUpdateRequest,
)


router = APIRouter(prefix="/knowledge-graph", tags=["knowledge_graph"])


@router.get("")
async def get_graph(
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db_session),
):
    graph = KnowledgeGraphService(db).get_graph(owner_id=current_user.id)
    return data_response(graph.model_dump(by_alias=True))


@router.post("/concepts")
async def upsert_concept(
    request: ConceptUpsertRequest,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db_session),
):
    concept = KnowledgeGraphService(db).upsert_concept(owner_id=current_user.id, request=request)
    return data_response(concept.model_dump(by_alias=True))


@router.post("/relations", status_code=status.HTTP_201_CREATED)
async def link_concepts(
    request: ConceptRelationCreateRequest,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db_session),
):
    relation = KnowledgeGraphService(db).link_concepts(owner_id=current_user.id, request=request)
    return data_response(relation.model_dump(by_alias=True))


@router.put("/mastery")
async def set_mastery(
    request: MasteryStateUpdateRequest,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db_session),
):
    mastery = KnowledgeGraphService(db).set_mastery(owner_id=current_user.id, request=request)
    return data_response(mastery.model_dump(by_alias=True))
