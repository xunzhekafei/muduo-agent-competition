from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.common import DataResponse
from app.schemas.enums import ThinkingPromptType, ThinkingSessionStatus


class ThinkingSession(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: str
    owner_id: str = Field(alias="ownerId")
    note_id: str = Field(alias="noteId")
    goal: str
    status: ThinkingSessionStatus
    created_at: datetime = Field(alias="createdAt")
    updated_at: datetime = Field(alias="updatedAt")


class ThinkingPrompt(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: str
    session_id: str = Field(alias="sessionId")
    prompt_type: ThinkingPromptType = Field(alias="promptType")
    content: str
    created_at: datetime = Field(alias="createdAt")
    updated_at: datetime = Field(alias="updatedAt")


class RevisionSuggestion(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: str
    session_id: str = Field(alias="sessionId")
    note_id: str = Field(alias="noteId")
    summary: str
    suggested_blocks: list[str] = Field(default_factory=list, alias="suggestedBlocks")
    created_at: datetime = Field(alias="createdAt")
    updated_at: datetime = Field(alias="updatedAt")


class ThinkingSessionDetail(BaseModel):
    session: ThinkingSession
    prompts: list[ThinkingPrompt]
    suggestions: list[RevisionSuggestion]


class ThinkingSessionCreateRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    note_id: str = Field(alias="noteId")
    goal: str


class ThinkingPromptCreateRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    content: str
    prompt_type: ThinkingPromptType = Field(default=ThinkingPromptType.SOCRATIC, alias="promptType")


class RevisionSuggestionCreateRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    summary: str
    suggested_blocks: list[str] = Field(default_factory=list, alias="suggestedBlocks")


ThinkingSessionResponse = DataResponse[ThinkingSession]
ThinkingSessionDetailResponse = DataResponse[ThinkingSessionDetail]
ThinkingPromptResponse = DataResponse[ThinkingPrompt]
RevisionSuggestionResponse = DataResponse[RevisionSuggestion]
