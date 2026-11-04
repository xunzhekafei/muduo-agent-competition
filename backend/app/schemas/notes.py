from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.common import DataResponse, ListResponse
from app.schemas.enums import NoteBlockType, NoteRelationType, NoteStatus


class NoteBlock(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: str
    note_id: str = Field(alias="noteId")
    block_type: NoteBlockType = Field(alias="blockType", serialization_alias="blockType")
    content: str
    position: int
    created_at: datetime = Field(alias="createdAt")
    updated_at: datetime = Field(alias="updatedAt")
    # Flattened metadata fields for frontend block renderers
    level: int | None = None
    highlights: list[str] | None = None
    headers: list[str] | None = None
    rows: list[list[str]] | None = None
    question: str | None = None
    userAnswer: str | None = None
    aiFollowUp: str | None = None
    userAnswer2: str | None = None
    aiFeedback: str | None = None
    cards: list[dict] | None = None
    items: list[dict] | None = None


class NoteRelation(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: str
    owner_id: str = Field(alias="ownerId")
    source_note_id: str = Field(alias="sourceNoteId")
    target_note_id: str = Field(alias="targetNoteId")
    relation_type: NoteRelationType = Field(alias="relationType")
    context: str | None = None
    created_at: datetime = Field(alias="createdAt")
    updated_at: datetime = Field(alias="updatedAt")


class Note(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: str
    owner_id: str = Field(alias="ownerId")
    title: str
    course_id: str | None = Field(default=None, alias="courseId")
    course_name: str | None = Field(default=None, alias="courseName")
    learning_space_id: str | None = Field(default=None, alias="learningSpaceId")
    source_resource_id: str | None = Field(default=None, alias="sourceResourceId")
    note_type: str = Field(default="manual", alias="noteType")
    tags: list[str] = Field(default_factory=list)
    status: NoteStatus
    mastery: int | None = None
    snippet: str | None = None
    created_at: datetime = Field(alias="createdAt")
    updated_at: datetime = Field(alias="updatedAt")


class NoteDetail(BaseModel):
    note: Note
    blocks: list[NoteBlock]
    relations: list[NoteRelation]


class NoteCreateRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    title: str
    note_type: str = Field(default="manual", alias="noteType")
    course_id: str | None = Field(default=None, alias="courseId")
    learning_space_id: str | None = Field(default=None, alias="learningSpaceId")
    source_resource_id: str | None = Field(default=None, alias="sourceResourceId")
    tags: list[str] = Field(default_factory=list)


class NoteUpdateRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    title: str | None = None
    course_id: str | None = Field(default=None, alias="courseId")
    learning_space_id: str | None = Field(default=None, alias="learningSpaceId")
    tags: list[str] | None = None
    mastery: int | None = None
    status: NoteStatus | None = None


class NoteBlockCreateRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    content: str
    block_type: NoteBlockType = Field(default=NoteBlockType.PARAGRAPH, alias="blockType")
    position: int | None = None
    metadata: dict = Field(default_factory=dict)


class NoteBlocksSaveRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    blocks: list[dict]


class NoteRelationCreateRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    target_note_id: str = Field(alias="targetNoteId")
    relation_type: NoteRelationType = Field(default=NoteRelationType.RELATED, alias="relationType")
    context: str | None = None


NoteResponse = DataResponse[Note]
NoteListResponse = ListResponse[Note]
NoteDetailResponse = DataResponse[NoteDetail]
NoteBlockResponse = DataResponse[NoteBlock]
NoteRelationResponse = DataResponse[NoteRelation]
