from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.common import DataResponse
from app.schemas.enums import FeynmanSessionStatus


class FeynmanSession(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: str
    owner_id: str = Field(alias="ownerId")
    concept_id: str | None = Field(default=None, alias="conceptId")
    note_id: str | None = Field(default=None, alias="noteId")
    concept_name: str = Field(alias="conceptName")
    explanation: str
    status: FeynmanSessionStatus
    created_at: datetime = Field(alias="createdAt")
    updated_at: datetime = Field(alias="updatedAt")


class FeynmanQuestion(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: str
    session_id: str = Field(alias="sessionId")
    question: str
    created_at: datetime = Field(alias="createdAt")
    updated_at: datetime = Field(alias="updatedAt")


class FeynmanEvaluation(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: str
    session_id: str = Field(alias="sessionId")
    score: int
    feedback: str
    follow_up_questions: list[str] = Field(default_factory=list, alias="followUpQuestions")
    created_at: datetime = Field(alias="createdAt")
    updated_at: datetime = Field(alias="updatedAt")


class FeynmanSessionDetail(BaseModel):
    session: FeynmanSession
    questions: list[FeynmanQuestion]
    evaluation: FeynmanEvaluation | None = None


class FeynmanSessionCreateRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    concept_id: str | None = Field(default=None, alias="conceptId")
    note_id: str | None = Field(default=None, alias="noteId")
    concept_name: str = Field(alias="conceptName")
    explanation: str


class FeynmanQuestionCreateRequest(BaseModel):
    question: str


class FeynmanEvaluationCreateRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    score: int = Field(ge=0, le=100)
    feedback: str
    follow_up_questions: list[str] = Field(default_factory=list, alias="followUpQuestions")


class ChatMessage(BaseModel):
    role: str
    text: str


class FeynmanChatRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    topic: str
    goal: str
    requirements: list[str]
    hint: str = ""
    messages: list[ChatMessage] = Field(default_factory=list)
    round: int = Field(ge=0)
    is_initial: bool = Field(default=False, alias="isInitial")


class FeynmanChatResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    reply: str
    evaluation: dict | None = None


FeynmanSessionResponse = DataResponse[FeynmanSession]
FeynmanSessionDetailResponse = DataResponse[FeynmanSessionDetail]
FeynmanQuestionResponse = DataResponse[FeynmanQuestion]
FeynmanEvaluationResponse = DataResponse[FeynmanEvaluation]
