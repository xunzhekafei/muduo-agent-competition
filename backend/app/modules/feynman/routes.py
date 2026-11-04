from __future__ import annotations

from fastapi import APIRouter, Depends, Path, status
from sqlalchemy.orm import Session

from app.core.auth import get_current_user
from app.core.responses import data_response
from app.db.session import get_db_session
from app.modules.feynman.service import FeynmanService
from app.modules.users.models import UserModel
from app.schemas.feynman import (
    FeynmanChatRequest,
    FeynmanEvaluationCreateRequest,
    FeynmanQuestionCreateRequest,
    FeynmanSessionCreateRequest,
)


router = APIRouter(prefix="/feynman", tags=["feynman"])


@router.post("/sessions", status_code=status.HTTP_201_CREATED)
async def start_session(
    request: FeynmanSessionCreateRequest,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db_session),
):
    session = FeynmanService(db).start_session(owner_id=current_user.id, request=request)
    return data_response(session.model_dump(by_alias=True))


@router.get("/sessions/{sessionId}")
async def get_session_detail(
    session_id: str = Path(alias="sessionId"),
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db_session),
):
    detail = FeynmanService(db).get_session_detail(owner_id=current_user.id, session_id=session_id)
    return data_response(detail.model_dump(by_alias=True))


@router.post("/sessions/{sessionId}/questions", status_code=status.HTTP_201_CREATED)
async def add_question(
    request: FeynmanQuestionCreateRequest,
    session_id: str = Path(alias="sessionId"),
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db_session),
):
    question = FeynmanService(db).add_question(
        owner_id=current_user.id,
        session_id=session_id,
        request=request,
    )
    return data_response(question.model_dump(by_alias=True))


@router.post("/sessions/{sessionId}/evaluation", status_code=status.HTTP_201_CREATED)
async def evaluate(
    request: FeynmanEvaluationCreateRequest,
    session_id: str = Path(alias="sessionId"),
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db_session),
):
    evaluation = FeynmanService(db).evaluate(
        owner_id=current_user.id,
        session_id=session_id,
        request=request,
    )
    return data_response(evaluation.model_dump(by_alias=True))


@router.post("/chat")
async def chat(
    request: FeynmanChatRequest,
    db: Session = Depends(get_db_session),
):
    response = FeynmanService(db).chat(request=request)
    return data_response(response.model_dump(by_alias=True))
