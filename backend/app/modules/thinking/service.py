from __future__ import annotations

from fastapi import status
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.core.errors import AppError, ErrorCode, raise_not_found, require_text
from app.modules.notes.service import NoteService
from app.modules.thinking.models import (
    RevisionSuggestionModel,
    ThinkingPromptModel,
    ThinkingSessionModel,
)
from app.schemas.enums import ThinkingSessionStatus
from app.schemas.thinking import (
    RevisionSuggestion,
    RevisionSuggestionCreateRequest,
    ThinkingPrompt,
    ThinkingPromptCreateRequest,
    ThinkingSession,
    ThinkingSessionCreateRequest,
    ThinkingSessionDetail,
)


class ThinkingService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def start_session(self, *, owner_id: str, request: ThinkingSessionCreateRequest) -> ThinkingSession:
        NoteService(self.db).get_note_model(owner_id=owner_id, note_id=request.note_id)
        session = ThinkingSessionModel(
            owner_id=owner_id,
            note_id=request.note_id,
            goal=require_text(request.goal, "思考目标不能为空"),
        )
        self.db.add(session)
        self.db.commit()
        self.db.refresh(session)
        return to_thinking_session_schema(session)

    def get_session_detail(self, *, owner_id: str, session_id: str) -> ThinkingSessionDetail:
        session = self.get_session_model(owner_id=owner_id, session_id=session_id, with_children=True)
        return ThinkingSessionDetail(
            session=to_thinking_session_schema(session),
            prompts=[to_thinking_prompt_schema(prompt) for prompt in session.prompts],
            suggestions=[to_revision_suggestion_schema(item) for item in session.suggestions],
        )

    def add_prompt(
        self,
        *,
        owner_id: str,
        session_id: str,
        request: ThinkingPromptCreateRequest,
    ) -> ThinkingPrompt:
        self._require_active_session(owner_id=owner_id, session_id=session_id)
        prompt = ThinkingPromptModel(
            session_id=session_id,
            prompt_type=request.prompt_type,
            content=require_text(request.content, "提示内容不能为空"),
        )
        self.db.add(prompt)
        self.db.commit()
        self.db.refresh(prompt)
        return to_thinking_prompt_schema(prompt)

    def add_revision_suggestion(
        self,
        *,
        owner_id: str,
        session_id: str,
        request: RevisionSuggestionCreateRequest,
    ) -> RevisionSuggestion:
        session = self._require_active_session(owner_id=owner_id, session_id=session_id)
        suggestion = RevisionSuggestionModel(
            session_id=session.id,
            note_id=session.note_id,
            summary=require_text(request.summary, "修订建议摘要不能为空"),
            suggested_blocks=request.suggested_blocks,
        )
        self.db.add(suggestion)
        self.db.commit()
        self.db.refresh(suggestion)
        return to_revision_suggestion_schema(suggestion)

    def complete_session(self, *, owner_id: str, session_id: str) -> ThinkingSession:
        session = self._require_active_session(owner_id=owner_id, session_id=session_id)
        session.status = ThinkingSessionStatus.COMPLETED
        self.db.add(session)
        self.db.commit()
        self.db.refresh(session)
        return to_thinking_session_schema(session)

    def get_session_model(
        self,
        *,
        owner_id: str,
        session_id: str,
        with_children: bool = False,
    ) -> ThinkingSessionModel:
        query = select(ThinkingSessionModel).where(
            ThinkingSessionModel.id == session_id,
            ThinkingSessionModel.owner_id == owner_id,
        )
        if with_children:
            query = query.options(
                selectinload(ThinkingSessionModel.prompts),
                selectinload(ThinkingSessionModel.suggestions),
            )
        session = self.db.execute(query).scalar_one_or_none()
        if session is None:
            raise_not_found("思考会话不存在")
        return session

    def _require_active_session(self, *, owner_id: str, session_id: str) -> ThinkingSessionModel:
        session = self.get_session_model(owner_id=owner_id, session_id=session_id)
        if session.status != ThinkingSessionStatus.ACTIVE:
            raise AppError(
                ErrorCode.VALIDATION_ERROR,
                "思考会话已结束",
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            )
        return session


def to_thinking_session_schema(session: ThinkingSessionModel) -> ThinkingSession:
    return ThinkingSession(
        id=session.id,
        owner_id=session.owner_id,
        note_id=session.note_id,
        goal=session.goal,
        status=session.status,
        created_at=session.created_at,
        updated_at=session.updated_at,
    )


def to_thinking_prompt_schema(prompt: ThinkingPromptModel) -> ThinkingPrompt:
    return ThinkingPrompt(
        id=prompt.id,
        session_id=prompt.session_id,
        prompt_type=prompt.prompt_type,
        content=prompt.content,
        created_at=prompt.created_at,
        updated_at=prompt.updated_at,
    )


def to_revision_suggestion_schema(suggestion: RevisionSuggestionModel) -> RevisionSuggestion:
    return RevisionSuggestion(
        id=suggestion.id,
        session_id=suggestion.session_id,
        note_id=suggestion.note_id,
        summary=suggestion.summary,
        suggested_blocks=suggestion.suggested_blocks,
        created_at=suggestion.created_at,
        updated_at=suggestion.updated_at,
    )

