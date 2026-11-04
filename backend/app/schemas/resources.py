from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.common import DataResponse, ListResponse
from app.schemas.enums import ResourceStatus, ResourceType


class Resource(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: str
    course_id: str = Field(alias="courseId")
    learning_space_id: str | None = Field(default=None, alias="learningSpaceId")
    name: str
    type: ResourceType
    status: ResourceStatus
    size_bytes: int | None = Field(default=None, alias="sizeBytes")
    source_url: str | None = Field(default=None, alias="sourceUrl")
    storage_key: str | None = Field(default=None, alias="storageKey")
    parse_task_id: str | None = Field(default=None, alias="parseTaskId")
    created_at: datetime = Field(alias="createdAt")
    updated_at: datetime = Field(alias="updatedAt")


class ResourceCreateRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    course_id: str = Field(alias="courseId")
    learning_space_id: str | None = Field(default=None, alias="learningSpaceId")
    name: str
    type: ResourceType
    size_bytes: int | None = Field(default=None, alias="sizeBytes")
    source_url: str | None = Field(default=None, alias="sourceUrl")
    storage_key: str | None = Field(default=None, alias="storageKey")


class ResourceParseRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    target_note_id: str | None = Field(default=None, alias="targetNoteId")
    options: dict[str, Any] = Field(default_factory=dict)


class ParsedChapter(BaseModel):
    title: str
    content: str


class ParsedResource(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    resource_id: str = Field(alias="resourceId")
    title: str
    chapters: list[ParsedChapter]
    core_concepts: list[str] = Field(alias="coreConcepts")
    note_draft_id: str | None = Field(default=None, alias="noteDraftId")


ResourceResponse = DataResponse[Resource]
ResourceListResponse = ListResponse[Resource]
ParsedResourceResponse = DataResponse[ParsedResource]
