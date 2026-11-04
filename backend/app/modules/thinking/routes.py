from __future__ import annotations

from fastapi import APIRouter, Depends, Path, status
from sqlalchemy.orm import Session

from app.core.auth import get_current_user
from app.core.responses import data_response
from app.db.session import get_db_session
from app.modules.thinking.service import ThinkingService
from app.modules.users.models import UserModel
from app.schemas.thinking import (
    RevisionSuggestionCreateRequest,
    ThinkingPromptCreateRequest,
    ThinkingSessionCreateRequest,
)


router = APIRouter(prefix="/thinking", tags=["thinking"])


@router.post("/sessions", status_code=status.HTTP_201_CREATED)
async def start_session(
    request: ThinkingSessionCreateRequest,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db_session),
):
    session = ThinkingService(db).start_session(owner_id=current_user.id, request=request)
    return data_response(session.model_dump(by_alias=True))


@router.get("/sessions/{sessionId}")
async def get_session_detail(
    session_id: str = Path(alias="sessionId"),
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db_session),
):
    detail = ThinkingService(db).get_session_detail(owner_id=current_user.id, session_id=session_id)
    return data_response(detail.model_dump(by_alias=True))


@router.post("/sessions/{sessionId}/prompts", status_code=status.HTTP_201_CREATED)
async def add_prompt(
    request: ThinkingPromptCreateRequest,
    session_id: str = Path(alias="sessionId"),
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db_session),
):
    prompt = ThinkingService(db).add_prompt(
        owner_id=current_user.id,
        session_id=session_id,
        request=request,
    )
    return data_response(prompt.model_dump(by_alias=True))


@router.post("/sessions/{sessionId}/suggestions", status_code=status.HTTP_201_CREATED)
async def add_revision_suggestion(
    request: RevisionSuggestionCreateRequest,
    session_id: str = Path(alias="sessionId"),
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db_session),
):
    suggestion = ThinkingService(db).add_revision_suggestion(
        owner_id=current_user.id,
        session_id=session_id,
        request=request,
    )
    return data_response(suggestion.model_dump(by_alias=True))


@router.post("/sessions/{sessionId}/complete")
async def complete_session(
    session_id: str = Path(alias="sessionId"),
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db_session),
):
    session = ThinkingService(db).complete_session(owner_id=current_user.id, session_id=session_id)
    return data_response(session.model_dump(by_alias=True))
