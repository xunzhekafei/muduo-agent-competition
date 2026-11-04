from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.common import DataResponse, ListResponse
from app.schemas.enums import MemoryCardStatus, ReviewGrade


class MemoryCard(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: str
    owner_id: str = Field(alias="ownerId")
    source_note_id: str | None = Field(default=None, alias="sourceNoteId")
    front: str
    back: str
    tags: list[str] = Field(default_factory=list)
    status: MemoryCardStatus
    interval_days: int = Field(alias="intervalDays")
    ease_factor: float = Field(alias="easeFactor")
    due_at: datetime = Field(alias="dueAt")
    created_at: datetime = Field(alias="createdAt")
    updated_at: datetime = Field(alias="updatedAt")


class ReviewRecord(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: str
    owner_id: str = Field(alias="ownerId")
    card_id: str = Field(alias="cardId")
    grade: ReviewGrade
    reviewed_at: datetime = Field(alias="reviewedAt")
    next_due_at: datetime = Field(alias="nextDueAt")
    interval_days: int = Field(alias="intervalDays")
    created_at: datetime = Field(alias="createdAt")
    updated_at: datetime = Field(alias="updatedAt")


class MemoryCardCreateRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    front: str
    back: str
    source_note_id: str | None = Field(default=None, alias="sourceNoteId")
    tags: list[str] = Field(default_factory=list)


class ReviewRecordCreateRequest(BaseModel):
    grade: ReviewGrade


class GenerateCardsRequest(BaseModel):
    max_cards: int = Field(default=10, ge=1, le=20, alias="maxCards")


class CycleSetRequest(BaseModel):
    cycle: str  # cram / standard / longterm


class GeneratedCard(BaseModel):
    id: str
    type: str
    front: str
    back: str
    difficulty: str
    status: str


class GenerateCardsResponseData(BaseModel):
    noteId: str
    cards: list[GeneratedCard]


MemoryCardResponse = DataResponse[MemoryCard]
MemoryCardListResponse = ListResponse[MemoryCard]
ReviewRecordResponse = DataResponse[ReviewRecord]
GenerateCardsResponse = DataResponse[GenerateCardsResponseData]
